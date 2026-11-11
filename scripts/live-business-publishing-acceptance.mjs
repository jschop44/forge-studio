import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash,randomBytes,randomUUID,createHmac} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {hashPassword} from '../src/lib/server/auth.ts';
import {generateBusinessWebsite} from '../src/lib/business-site.ts';
import {neon,neonConfig} from '@neondatabase/serverless';
import {businessPublishingConcurrentFixture} from './business-publishing-sql-acceptance.mjs';

class AcceptanceFailure extends Error{}
const ensure=(condition,message)=>{if(!condition)throw new AcceptanceFailure(message)};

/** Explicit isolated-branch execution only. Credential arrives through non-echoing
 * stdin, never an argument, source file, log, or acceptance artifact.
 */
export async function verifyConcurrentBusinessPublishingSql(client){
 const fixture=businessPublishingConcurrentFixture();
 writeFileSync('/tmp/forge-concurrency-recovery.json',JSON.stringify(fixture));
 let accepted,cleanup;
 try{
  await client.transaction(fixture.seed.map(statement=>client.query(statement)));
  const began=Date.now();
  const results=await Promise.allSettled(fixture.attempts.map(statement=>client.query(statement)));
  const winners=results.filter(result=>result.status==='fulfilled'&&Number(result.value[0]?.version)===2&&Number(result.value[0]?.page_count)===2);
  const conflicts=results.filter(result=>result.status==='rejected'&&result.reason?.code==='23505');
  ensure(winners.length===1&&conflicts.length===1,'Concurrent SQL did not demonstrate exactly one winner and one immutable-version conflict');
  const state=(await client.query(fixture.verify))[0];
  ensure(Number(state.version)===2&&Number(state.snapshot_rows)===4&&Number(state.live_pages)===2,'Concurrent revision counts were inconsistent');
  ensure((Number(state.alpha_pages)===2&&Number(state.beta_pages)===0)||(Number(state.beta_pages)===2&&Number(state.alpha_pages)===0),'Concurrent revisions mixed content');
  accepted={passed:true,winners:1,conflicts:1,conflictCode:'23505',elapsedMs:Date.now()-began,probeDelaySeconds:fixture.delaySeconds,state};
 }finally{
  const owned=await client.query(fixture.ownerGuard);
  if(owned.length)await client.transaction(fixture.cleanup.map(statement=>client.query(statement)));
  cleanup=(await client.query(fixture.verifyCleanup))[0];
  ensure(Object.values(cleanup).every(value=>Number(value)===0),'Synthetic concurrency fixture cleanup failed; recovery metadata retained');
 }
 return {...accepted,cleanup};
}

async function stopServer(child){
 if(!child||child.exitCode!==null||child.signalCode!==null)return;
 const done=once(child,'exit');child.kill('SIGTERM');
 const forced=setTimeout(()=>child.kill('SIGKILL'),5000);forced.unref();
 try{await done}finally{clearTimeout(forced)}
}
async function startTestServer(connectionString,authSecret){
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','0'],{
  env:{...process.env,DATABASE_URL:connectionString,AUTH_SECRET:authSecret,ENABLE_BUSINESS_PUBLISHING:'true',ENABLE_REGISTRATION:'false',ENABLE_AGENT_AUTOPILOT:'false',ENABLE_AGENT_QUEUE:'false',ENABLE_ECOSYSTEM_INTEGRATION:'false',ENABLE_FORGE_LEARNING_MEMORY:'false',FORCE_COLOR:'0'},
  stdio:['ignore','pipe','pipe']
 });
 let output='';child.stdout.on('data',chunk=>{output=(output+chunk).slice(-8000)});child.stderr.resume();
 for(let attempt=0;attempt<150;attempt++){
  const url=output.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  if(url){try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(2000)});if(r.ok)return {child,url}}catch{}}
  if(child.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,100));
 }
 await stopServer(child);throw new AcceptanceFailure('Isolated production server did not become ready');
}

export async function verifyHttpBusinessPublishing(client,credentials){
 const checks=[];const check=(condition,label)=>{ensure(condition,label);checks.push(label)};
 ensure(/^[a-f0-9]{40}$/.test(credentials.expectedRevision||''),'An expected compiled source revision is required');
 const authSecret=randomBytes(48).toString('hex'),ip='acceptance-'+randomUUID();
 const owners=[0,1].map(()=>{const id=randomUUID();return {id,email:id+'@forge-http-acceptance.invalid',password:randomBytes(24).toString('base64url')}});
 const rateKeys=owners.map(owner=>createHmac('sha256',authSecret).update('auth:'+ip+':'+owner.email).digest('hex'));
 const ownerPredicate='(u.id=$1::uuid AND u.email=$2) OR (u.id=$3::uuid AND u.email=$4)';
 const params=[owners[0].id,owners[0].email,owners[1].id,owners[1].email];
 const cleanupStatements=[
  ['DELETE FROM forge_business_publication_snapshots WHERE owner_id IN (SELECT u.id FROM forge_users u WHERE '+ownerPredicate+')',params],
  ['DELETE FROM forge_business_publications WHERE owner_id IN (SELECT u.id FROM forge_users u WHERE '+ownerPredicate+')',params],
  ['DELETE FROM forge_users u WHERE '+ownerPredicate,params],
  ['DELETE FROM forge_rate_limits WHERE key=ANY($1::text[])',[rateKeys]]
 ];
 // No passwords, signing secrets, cookies or connection credentials in recovery metadata.
 writeFileSync('/tmp/forge-http-publishing-recovery.json',JSON.stringify({owners:owners.map(({id,email})=>({id,email})),rateKeys,cleanupStatements}));
 let server,acceptance,cleanup;
 try{
  const triggers=await client.query("SELECT count(*)::int AS count FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('forge_users'::regclass,'forge_business_publications'::regclass,'forge_business_publication_snapshots'::regclass,'forge_rate_limits'::regclass)");
  check(Number(triggers[0].count)===0,'No unexpected custom database triggers');
  await client.transaction(owners.map(owner=>client.query('INSERT INTO forge_users(id,email,password_hash) VALUES($1::uuid,$2,$3)',[owner.id,owner.email,hashPassword(owner.password)])));
  server=await startTestServer(credentials.connectionString,authSecret);const base=server.url;
  const request=(path,{method='GET',body,cookie,origin=base}={})=>fetch(base+path,{method,headers:{Origin:origin,'x-forwarded-for':ip,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const health=await (await request('/api/health')).json();check(health.revision===credentials.expectedRevision,'Compiled source revision matches expected release');
  check((await request('/api/business/publish')).status===401,'Anonymous publication listing is rejected');
  check((await request('/api/business/publish',{cookie:'forge_session=invalid'})).status===401,'Invalid sessions are rejected');
  check((await request('/api/auth/login',{method:'POST',body:{email:owners[0].email,password:'incorrect-'+randomUUID()}})).status===401,'Wrong password is rejected');
  const cookies=[];
  for(const owner of owners){
   const response=await request('/api/auth/login',{method:'POST',body:{email:owner.email,password:owner.password}});
   check(response.status===200,'Test-owner login succeeds');
   const header=response.headers.get('set-cookie')||'';
   check(/HttpOnly/i.test(header)&&/Secure/i.test(header)&&/SameSite=Lax/i.test(header),'Session cookie retains security attributes');
   const cookie=header.split(';')[0];check(cookie.startsWith('forge_session='),'Session cookie is issued');cookies.push(cookie);
  }
  const pages=generateBusinessWebsite({experienceStyle:'standard',businessName:'Forge HTTP Acceptance',industry:'Coffee shop',description:'A synthetic test roastery offering coffee beans and ceramic mugs.',services:['Coffee beans','Ceramic mugs']}).pages.map(page=>({...page,html:page.html.replace('</main>','<p id="acceptance-marker">Fixture version one</p></main>')}));
  pages[0].html=pages[0].html.replace('href="services.html"','href="/services#offering-0"');
  const approved={ownerApproved:true,businessName:'Forge HTTP Acceptance',pages};
  check((await request('/api/business/publish',{method:'POST',cookie:cookies[0],body:approved,origin:'https://other.example'})).status===403,'Cross-origin publishing is rejected');
  check((await request('/api/business/publish',{method:'POST',cookie:cookies[0],body:{...approved,ownerApproved:false}})).status===422,'Missing owner approval is rejected');
  check((await request('/api/business/publish',{method:'POST',cookie:cookies[0],body:{...approved,ownerId:owners[1].id}})).status===422,'Body-supplied ownership cannot override the session');
  const unsafe=pages.map((page,index)=>index? page:{...page,html:page.html.replace('</body>','<script>void 0;</script></body>')});
  check((await request('/api/business/publish',{method:'POST',cookie:cookies[0],body:{...approved,pages:unsafe}})).status===422,'Executable HTML is rejected');
  const created=await request('/api/business/publish',{method:'POST',cookie:cookies[0],body:approved});
  check(created.status===201,'Approved standard website publishes in isolated environment');
  const publication=await created.json();const id=publication.id;
  check(/^[a-f0-9-]{36}$/.test(id)&&publication.urls.length===4,'Complete publication identity and page URLs are returned');
  const home=await request('/business-sites/'+id+'/index');const homeHtml=await home.text();
  check(home.status===200&&homeHtml.includes('Fixture version one'),'Published homepage returns stored content');
  check(home.headers.get('cache-control')==='no-store'&&home.headers.get('x-content-type-options')==='nosniff','Published content is not cached or MIME-sniffed');
  const csp=home.headers.get('content-security-policy')||'';
  check(csp.includes("default-src 'none'")&&csp.includes("form-action 'none'")&&csp.includes("frame-ancestors 'none'"),'Publication CSP retains execution and embedding restrictions');
  check(homeHtml.includes('<script type="application/ld+json">'),'Inert SEO metadata survives publication');
  check(homeHtml.includes('href="services.html#offering-0"')&&!homeHtml.includes('href="/services#offering-0"'),'Published navigation stays within its website');
  for(const page of pages)check((await request('/business-sites/'+id+'/'+page.slug+'.html')).status===200,'Published sibling page '+page.slug+' resolves');
  const initial=await client.query('SELECT count(*)::int AS count,max(version)::int AS version FROM forge_business_publication_snapshots WHERE publication_id=$1::uuid',[id]);
  check(Number(initial[0].count)===4&&Number(initial[0].version)===1,'Initial snapshot contains exactly four pages');
  const ownListing=await (await request('/api/business/publish',{cookie:cookies[0]})).json();
  check(ownListing.publications.some(row=>row.id===id),'Owner can retrieve its publication');
  const otherListing=await (await request('/api/business/publish',{cookie:cookies[1]})).json();
  check(otherListing.publications.length===0,'Another tenant cannot list the publication');
  const otherVersions=await (await request('/api/business/publish/'+id+'/versions',{cookie:cookies[1]})).json();
  check(otherVersions.versions.length===0,'Another tenant cannot retrieve version metadata');
  check((await request('/api/business/publish/'+id+'/revisions',{method:'POST',cookie:cookies[1],body:{...approved,expectedVersion:1}})).status===409,'Another tenant cannot revise the publication');
  check((await request('/api/business/publish/'+id+'/rollback',{method:'POST',cookie:cookies[1],body:{version:1,expectedVersion:1}})).status===409,'Another tenant cannot roll back the publication');
  check((await request('/api/business/publish/'+id,{method:'DELETE',cookie:cookies[1]})).status===404,'Another tenant cannot delete the publication');
  const revisedPages=pages.map(page=>({...page,html:page.html.replaceAll('Fixture version one','Fixture version two')}));
  const revision=await request('/api/business/publish/'+id+'/revisions',{method:'POST',cookie:cookies[0],body:{...approved,pages:revisedPages,expectedVersion:1}});
  check(revision.status===200&&(await revision.json()).version===2,'Owner saves revision two');
  check((await request('/api/business/publish/'+id+'/revisions',{method:'POST',cookie:cookies[0],body:{...approved,pages:revisedPages,expectedVersion:1}})).status===409,'Stale HTTP revision returns conflict');
  let snapshots=await client.query('SELECT count(*)::int AS count,max(version)::int AS version FROM forge_business_publication_snapshots WHERE publication_id=$1::uuid',[id]);
  check(Number(snapshots[0].count)===8&&Number(snapshots[0].version)===2,'Stale HTTP write created no extra snapshots');
  check((await (await request('/business-sites/'+id+'/index')).text()).includes('Fixture version two'),'Revision changed live content');
  const rollback=await request('/api/business/publish/'+id+'/rollback',{method:'POST',cookie:cookies[0],body:{version:1,expectedVersion:2}});
  check(rollback.status===200&&(await rollback.json()).versionCreated===3,'Rollback creates revision three');
  check((await (await request('/business-sites/'+id+'/index')).text()).includes('Fixture version one'),'Rollback restores original live content');
  check((await request('/api/business/publish/'+id+'/rollback',{method:'POST',cookie:cookies[0],body:{version:1,expectedVersion:2}})).status===409,'Stale rollback returns conflict');
  const contenders=['alpha','beta'].map(label=>({...approved,expectedVersion:3,pages:pages.map(page=>({...page,html:page.html.replaceAll('Fixture version one','Fixture '+label)}))}));
  const competing=await Promise.all(contenders.map(body=>request('/api/business/publish/'+id+'/revisions',{method:'POST',cookie:cookies[0],body})));
  check(competing.filter(response=>response.status===200).length===1&&competing.filter(response=>response.status===409).length===1,'Concurrent HTTP revisions produce one winner and one conflict');
  const state=await client.query("SELECT count(*)::int AS count,count(*) FILTER(WHERE html LIKE '%Fixture alpha%')::int AS alpha,count(*) FILTER(WHERE html LIKE '%Fixture beta%')::int AS beta FROM forge_business_publications WHERE id=$1::uuid",[id]);
  check(Number(state[0].count)===4&&((Number(state[0].alpha)===4&&Number(state[0].beta)===0)||(Number(state[0].beta)===4&&Number(state[0].alpha)===0)),'Concurrent HTTP revisions never mix page content');
  snapshots=await client.query('SELECT count(*)::int AS count,max(version)::int AS version FROM forge_business_publication_snapshots WHERE publication_id=$1::uuid',[id]);
  check(Number(snapshots[0].count)===16&&Number(snapshots[0].version)===4,'Concurrent HTTP revision creates only one complete new snapshot');
  const history=await (await request('/api/business/publish/'+id+'/versions',{cookie:cookies[0]})).json();
  check(history.versions.map(row=>Number(row.version)).join(',')==='4,3,2,1'&&history.versions.every(row=>Number(row.pageCount)===4),'Owner retrieves complete ordered version history');
  const removed=await request('/api/business/publish/'+id,{method:'DELETE',cookie:cookies[0]});
  check(removed.status===200&&(await removed.json()).removedPages===4,'Owner unpublishes all four pages');
  for(const page of pages)check((await request('/business-sites/'+id+'/'+page.slug)).status===404,'Unpublished page '+page.slug+' is inaccessible');
  const gone=await client.query('SELECT count(*)::int AS count FROM forge_business_publication_snapshots WHERE publication_id=$1::uuid',[id]);
  check(Number(gone[0].count)===0,'Unpublish removes all retained snapshots');
  const logout=await request('/api/auth/logout',{method:'POST',cookie:cookies[0]});
  check(logout.status===200&&/Max-Age=0/i.test(logout.headers.get('set-cookie')||''),'Logout expires the session cookie');
  check((await request('/api/business/publish')).status===401,'Publication access remains authenticated after logout');
  acceptance={passed:true,expectedRevision:credentials.expectedRevision,httpChecks:checks.length,cases:checks,concurrentHttp:{winners:1,conflicts:1,statuses:[200,409]}};
 }finally{
  if(server)await stopServer(server.child);
  await client.transaction(cleanupStatements.map(([text,values])=>client.query(text,values)));
  cleanup=(await client.query('SELECT (SELECT count(*)::int FROM forge_users WHERE id IN ($1::uuid,$2::uuid)) AS fixture_users,(SELECT count(*)::int FROM forge_business_publications WHERE owner_id IN ($1::uuid,$2::uuid)) AS fixture_publications,(SELECT count(*)::int FROM forge_business_publication_snapshots WHERE owner_id IN ($1::uuid,$2::uuid)) AS fixture_snapshots,(SELECT count(*)::int FROM forge_rate_limits WHERE key=ANY($3::text[])) AS fixture_rate_limits',[owners[0].id,owners[1].id,rateKeys]))[0];
  ensure(Object.values(cleanup).every(value=>Number(value)===0),'HTTP acceptance fixture cleanup failed; recovery metadata retained');
 }
 return {...acceptance,cleanup};
}

async function main(credentials){
 ensure(credentials.branchId==='br-nameless-lake-bb8rrmnk','An explicit approved isolated branch is required');
 const endpoint=new URL(credentials.connectionString);
 ensure(endpoint.hostname.endsWith('.neon.tech')&&createHash('sha256').update(endpoint.hostname.toLowerCase()).digest('hex')==='7e4fb36b3cdf0a15fdc6066e5fa77045ed2d1d80e651e2f7364b845917261d4b','Credential does not target the approved isolated endpoint');
 neonConfig.fetchFunction=(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(20000)});
 const client=neon(credentials.connectionString);
 const mode=credentials.mode||'all';ensure(['sql','http','all'].includes(mode),'Unknown acceptance mode');
 const result={passed:true,branchId:credentials.branchId};
 if(mode!=='http')result.sql=await verifyConcurrentBusinessPublishingSql(client);
 if(mode!=='sql')result.http=await verifyHttpBusinessPublishing(client,credentials);
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 let input='',started=false;process.stdin.setEncoding('utf8');
 const inputDeadline=setTimeout(()=>{console.log(JSON.stringify({passed:false,reason:'Secure stdin credential input required'}));process.exit(1)},30000);inputDeadline.unref();
 process.stdin.on('end',()=>{if(!started){console.log(JSON.stringify({passed:false,reason:'Secure stdin credential input required'}));process.exitCode=1}});
 process.stdin.on('data',async chunk=>{
  if(started)return;input+=chunk;if(!input.includes('\n'))return;started=true;clearTimeout(inputDeadline);process.stdin.pause();
  try{const credentials=JSON.parse(input.trim());input='';const result=await main(credentials);writeFileSync('/tmp/forge-live-publishing-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exit(0)}
  catch(error){console.log(JSON.stringify({passed:false,reason:error instanceof AcceptanceFailure?error.message:'Database or network request failed; no credential details logged',code:typeof error?.code==='string'&&/^[A-Z0-9_-]{1,30}$/.test(error.code)?error.code:undefined}));process.exit(1)}
 });
}
