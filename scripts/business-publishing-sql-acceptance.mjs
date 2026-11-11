import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const literal=value=>typeof value==='number'?String(value):"'"+String(value).replaceAll("'","''")+"'";
function tags(path,count){
 const source=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const statements=[...source.matchAll(/(?:await )?sql`([\s\S]*?)`/g)].map(match=>match[1]);
 if(statements.length!==count)throw Error('SQL acceptance extraction needs review: '+path);
 return statements;
}
function render(template,values){return template.replace(/\$\{([^}]+)\}/g,(_match,key)=>{
 if(!Object.hasOwn(values,key))throw Error('Unexpected SQL interpolation: '+key);
 return literal(values[key]);
})}

/** Actual route SQL, synthetic owners, and an exception subtransaction that always
 * rolls back. Intended only for the explicitly selected isolated test branch.
 * This is SQL-state acceptance, not authenticated HTTP or concurrent-session acceptance.
 */
export function businessPublishingAcceptanceSql(){
 const publish=tags('src/app/api/business/publish/route.ts',2)[0];
 const revise=tags('src/app/api/business/publish/[id]/revisions/route.ts',1)[0];
 const restore=tags('src/app/api/business/publish/[id]/rollback/route.ts',1)[0];
 const remove=tags('src/app/api/business/publish/[id]/route.ts',1)[0];
 const versions=tags('src/app/api/business/publish/[id]/versions/route.ts',1)[0];
 const owner=randomUUID(),other=randomUUID(),id=randomUUID(),collision=randomUUID();
 const first=[{slug:'index',html:'<!doctype html><html><head><title>Home</title></head><body><h1>Fixture version one</h1></body></html>'},{slug:'contact',html:'<!doctype html><html><head><title>Contact</title></head><body><h1>Contact fixture one</h1></body></html>'}];
 const second=first.map(page=>({...page,html:page.html.replace('one','two')}));
 const values={owner,id,pageRows:JSON.stringify(first),expectedVersion:1,version:1};
 const query=(template,overrides={})=>render(template,{...values,...overrides});
 let checks=0;
 const check=(condition,label)=>{checks++;return `IF (${condition}) IS NOT TRUE THEN RAISE EXCEPTION ${literal('Publishing SQL check failed: '+label)}; END IF;`};
 const exec=(template,overrides={},into='')=>'EXECUTE '+literal(query(template,overrides))+(into?' INTO '+into:'')+';';
 const sql=`DO $forge_acceptance$
DECLARE r record; n integer; complete boolean := false;
BEGIN
 BEGIN
  ${check("NOT EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('forge_users'::regclass,'forge_business_publications'::regclass,'forge_business_publication_snapshots'::regclass))",'unexpected custom triggers require review')}
  INSERT INTO forge_users(id,email,password_hash) VALUES
   (${literal(owner)}::uuid,${literal(owner+'@forge-acceptance.invalid')},'non-login fixture'),
   (${literal(other)}::uuid,${literal(other+'@forge-acceptance.invalid')},'non-login fixture');
  ${exec(publish)}
  ${check(`(SELECT count(*) FROM forge_business_publications WHERE id=${literal(id)}::uuid)=2`,'initial page set')}
  ${check(`(SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid AND version=1)=2`,'initial snapshot')}
  ${exec(revise,{pageRows:JSON.stringify(second)},'r')}
  ${check('r.version=2 AND r.page_count=2','revision version and page count')}
  ${check(`(SELECT count(*) FROM forge_business_publications WHERE id=${literal(id)}::uuid AND html LIKE '%two%')=2`,'revision live content')}
  ${check(`(SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid AND version=1 AND html LIKE '%one%')=2`,'immutable original snapshot')}
  ${exec(revise,{pageRows:JSON.stringify(second)},'r')}
  ${check('r.page_count=0','stale revision rejected')}
  ${check(`(SELECT max(version) FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid)=2`,'stale write created no snapshot')}
  ${exec(revise,{owner:other,expectedVersion:2,pageRows:JSON.stringify(second)},'r')}
  ${check('r.page_count=0','other owner cannot revise')}
  EXECUTE ${literal('SELECT count(*) FROM ('+query(versions,{owner:other})+') AS protected_versions')} INTO n;
  ${check('n=0','other owner cannot read version metadata')}
  ${exec(remove,{owner:other})} GET DIAGNOSTICS n = ROW_COUNT;
  ${check('n=0','other owner cannot unpublish')}
  ${exec(revise,{expectedVersion:2,pageRows:JSON.stringify([...second,{slug:'about',html:'Unapproved page-set change'}])},'r')}
  ${check('r.page_count=0','changed page set remains blocked')}
  ${exec(restore,{expectedVersion:2,version:1},'r')}
  ${check('r.page_count=2 AND r.new_version=3','rollback creates a new revision')}
  ${check(`(SELECT count(*) FROM forge_business_publications WHERE id=${literal(id)}::uuid AND html LIKE '%one%')=2`,'rollback restored original content')}
  ${check(`(SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid)=6`,'rollback preserves all snapshots')}
  ${exec(restore,{expectedVersion:2,version:1},'r')}
  ${check('r.page_count=0','stale rollback rejected')}
  ${exec(restore,{expectedVersion:3,version:99},'r')}
  ${check('r.page_count=0','missing snapshot rejected')}
  ${exec(remove)} GET DIAGNOSTICS n = ROW_COUNT;
  ${check('n=2','owner unpublishes the complete page set')}
  ${check(`NOT EXISTS(SELECT 1 FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid)`,'unpublish removes retained history')}
  INSERT INTO forge_business_publication_snapshots(publication_id,owner_id,version,slug,html)
   VALUES(${literal(collision)}::uuid,${literal(owner)}::uuid,1,'index','conflict fixture');
  BEGIN
   ${exec(publish,{id:collision})}
   RAISE EXCEPTION 'Expected immutable snapshot conflict';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  ${check(`NOT EXISTS(SELECT 1 FROM forge_business_publications WHERE id=${literal(collision)}::uuid)`,'failed snapshot insert rolls back every live page')}
  ${check(`(SELECT count(*) FROM forge_business_publication_snapshots WHERE publication_id=${literal(collision)}::uuid)=1`,'failed creation leaves existing snapshot unchanged')}
  complete := true;
  RAISE SQLSTATE 'ZX001' USING MESSAGE='Intentional acceptance-fixture rollback';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN
  IF NOT complete THEN RAISE; END IF;
 END;
 ${check(`NOT EXISTS(SELECT 1 FROM forge_users WHERE id IN (${literal(owner)}::uuid,${literal(other)}::uuid))`,'fixture accounts rolled back')}
 ${check(`NOT EXISTS(SELECT 1 FROM forge_business_publications WHERE id IN (${literal(id)}::uuid,${literal(collision)}::uuid))`,'fixture publications rolled back')}
 ${check(`NOT EXISTS(SELECT 1 FROM forge_business_publication_snapshots WHERE publication_id IN (${literal(id)}::uuid,${literal(collision)}::uuid))`,'fixture snapshots rolled back')}
END
$forge_acceptance$;`;
 return {sql,checks,fixtureIds:{owner,other,id,collision}};
}

/** A bounded latency probe forces competing revisions to read the same version.
 * Only synthetic fixture IDs may be used; caller must run cleanup in finally.
 */
export function businessPublishingConcurrentFixture(delaySeconds=2){
 if(!Number.isInteger(delaySeconds)||delaySeconds<0||delaySeconds>5)throw Error('Invalid acceptance probe delay');
 const publish=tags('src/app/api/business/publish/route.ts',2)[0];
 const revision=tags('src/app/api/business/publish/[id]/revisions/route.ts',1)[0];
 const remove=tags('src/app/api/business/publish/[id]/route.ts',1)[0];
 const probe=revision.replace('SELECT COALESCE(MAX(version),0)+1 AS version FROM',`SELECT COALESCE(MAX(version),0)+1 AS version, pg_sleep(${delaySeconds}) AS acceptance_delay FROM`);
 if(probe===revision)throw Error('Revision timing probe needs source review');
 const owner=randomUUID(),id=randomUUID();
 const pages=label=>[{slug:'index',html:'Fixture '+label+' home'},{slug:'contact',html:'Fixture '+label+' contact'}];
 const values={owner,id,pageRows:JSON.stringify(pages('initial')),expectedVersion:1};
 const statement=(sql,overrides={})=>render(sql,{...values,...overrides});
 return {
  fixtureIds:{owner,id},delaySeconds,
  ownerGuard:`SELECT id FROM forge_users WHERE id=${literal(owner)}::uuid AND email=${literal(owner+'@forge-acceptance.invalid')} AND password_hash='non-login fixture'`,
  seed:[`DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN ('forge_users'::regclass,'forge_business_publications'::regclass,'forge_business_publication_snapshots'::regclass)) THEN RAISE EXCEPTION 'Unexpected custom triggers require review'; END IF; END $$;`,
   `INSERT INTO forge_users(id,email,password_hash) VALUES(${literal(owner)}::uuid,${literal(owner+'@forge-acceptance.invalid')},'non-login fixture')`,statement(publish)],
  attempts:['alpha','beta'].map(label=>statement(probe,{pageRows:JSON.stringify(pages(label))})),
  verify:`SELECT
   (SELECT max(version)::int FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid) AS version,
   (SELECT count(*)::int FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid) AS snapshot_rows,
   (SELECT count(*)::int FROM forge_business_publications WHERE id=${literal(id)}::uuid) AS live_pages,
   (SELECT count(*)::int FROM forge_business_publications WHERE id=${literal(id)}::uuid AND html LIKE 'Fixture alpha%') AS alpha_pages,
   (SELECT count(*)::int FROM forge_business_publications WHERE id=${literal(id)}::uuid AND html LIKE 'Fixture beta%') AS beta_pages`,
  cleanup:[statement(remove),`DELETE FROM forge_users WHERE id=${literal(owner)}::uuid AND email=${literal(owner+'@forge-acceptance.invalid')} AND password_hash='non-login fixture'`],
  verifyCleanup:`SELECT
   (SELECT count(*)::int FROM forge_users WHERE id=${literal(owner)}::uuid) AS fixture_users,
   (SELECT count(*)::int FROM forge_business_publications WHERE id=${literal(id)}::uuid) AS fixture_publications,
   (SELECT count(*)::int FROM forge_business_publication_snapshots WHERE publication_id=${literal(id)}::uuid) AS fixture_snapshots`
 };
}

export async function verifyLocalBusinessPublishingSql(acceptance=businessPublishingAcceptanceSql()){
 const {PGlite}=await import('@electric-sql/pglite');
 const db=new PGlite();
 try{
  await db.exec('CREATE TABLE forge_users(id uuid PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now())');
  for(const statement of tags('src/lib/server/business-publishing.ts',4))await db.exec(statement);
  await db.exec(acceptance.sql);
  const result=await db.query('SELECT (SELECT count(*) FROM forge_users)+(SELECT count(*) FROM forge_business_publications)+(SELECT count(*) FROM forge_business_publication_snapshots) AS remaining');
  if(Number(result.rows[0].remaining)!==0)throw Error('SQL acceptance fixtures were not rolled back');
  return {checks:acceptance.checks,remainingFixtureRows:0};
 }finally{await db.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.includes('--sql'))process.stdout.write(businessPublishingAcceptanceSql().sql);
 else console.log(JSON.stringify(await verifyLocalBusinessPublishingSql()));
}
