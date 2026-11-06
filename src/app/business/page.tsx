'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {generateBusinessWebsite,type GeneratedPage} from '../../lib/business-site';
import {auditGeneratedDraft} from '../../lib/draft-quality-gate';
import {downloadText} from '../../lib/export';
import {createContextualShowcase} from '../../lib/immersive-showcase';
import {analyzeSiteEvidence,inspectionCoverage} from '../../lib/forge-intelligence';
import {inspectionToBrowserEvidence} from '../../lib/inspection-evidence-adapter';
import {proposeBusinessSiteFromCapture,generateReviewedCaptureSite} from '../../lib/capture-business-proposal';
type Brief={businessName:string;industry:string;description:string;services:string[];contactEmail?:string};
function infer(name:string,brief:string):Brief{
 const text=(name+' '+brief).toLowerCase();
 const industry=/disney|theme park|entertainment|movies|characters|streaming/.test(text)?'Entertainment, media and theme parks':/coffee|espresso|roast|barista|café|cafe/.test(text)?'Coffee shop and cafe':/restaurant|pizza|food|bakery/.test(text)?'Restaurant and hospitality':/real estate|realtor|property/.test(text)?'Real estate':/gym|fitness|wellness|spa/.test(text)?'Health and wellness':/auto|car|vehicle/.test(text)?'Automotive':/fashion|jewelry|clothing/.test(text)?'Fashion and luxury':/software|tech|digital|ai /.test(text)?'Technology':'Professional services';
 const description=brief.trim().length>=15?brief.trim():name+' provides thoughtful, professional solutions for customers seeking quality and dependable service.';
 const serviceLine=brief.split('\n').find(line=>/^(services|products|offerings|menu)\s*:/i.test(line.trim()));
 const listed=serviceLine?serviceLine.replace(/^[^:]+:/,'').split(/[,;]/).map(part=>part.trim()).filter(part=>part.length>=3&&part.length<=65).slice(0,5):[];

 const services=listed.length>=2?listed:/disney|theme park|entertainment|movies|characters|streaming/.test(text)?['Explore entertainment','Discover destinations','Browse stories']:/coffee|espresso|roast|barista|café|cafe/.test(text)?['Coffee menu','Visit our café','Contact the team']:/restaurant|pizza|food|bakery/.test(text)?['Explore the menu','Visit us','Ask a question']:/real estate|realtor|property/.test(text)?['Explore properties','Discuss your goals','Contact an agent']:/gym|fitness|wellness|spa/.test(text)?['Explore programs','Ask about availability','Contact the team']:['Explore services','Discuss your project','Contact the team'];
 return {businessName:name.trim(),industry,description,services};
}
type StyleReference={background?:string;accent?:string;fontFamily?:string};
function parseStyleReference(source:string):StyleReference{
 if(!source.trim())return {};
 const doc=new DOMParser().parseFromString(source,'text/html');
 const css=[...doc.querySelectorAll('style')].map(node=>node.textContent||'').join(' ');
 const inline=[doc.body?.getAttribute('style')||'',doc.querySelector('header')?.getAttribute('style')||''].join(';');
 const text=(css+';'+inline).slice(0,150000);
 const color=(pattern:RegExp)=>text.match(pattern)?.[1]?.trim();
 const background=color(/(?:--(?:background|bg|surface|brand-bg)|background(?:-color)?)\s*:\s*(#[0-9a-fA-F]{3,8})/i);
 const accent=color(/(?:--(?:primary|accent|brand|brand-accent)|color)\s*:\s*(#[0-9a-fA-F]{3,8})/i);
 const fontFamily=text.match(/font-family\s*:\s*['"]?(Georgia|Arial|Verdana|Tahoma|Trebuchet MS|Times New Roman|system-ui|sans-serif|serif)/i)?.[1];
 return {background,accent,fontFamily};
}
export default function BusinessGenerator(){
 const [inspected,setInspected]=useState<{url:string;title:string;description:string;headings:string[];navigation?:{label:string;path:string}[];pageSummaries?:{path:string;label:string;title:string;description:string;headings:string[]}[];stylesheetsRead:number;visualSignals?:{navigationLinks:number;heroSections:number;imageCount:number;sectionCount:number;buttonCount:number;hasVideo:boolean;hasCanvas:boolean}}|null>(null),[siteUrl,setSiteUrl]=useState(''),[researchBusy,setResearchBusy]=useState(false),[referenceStyle,setReferenceStyle]=useState<StyleReference>({}),[name,setName]=useState(''),[designMode,setDesignMode]=useState<'new'|'inspired'|'redesign'>('new'),[referenceMarkup,setReferenceMarkup]=useState(''),[brief,setBrief]=useState(''),[contactEmail,setContactEmail]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[pages,setPages]=useState<GeneratedPage[]>([]),[active,setActive]=useState('index'),[mobile,setMobile]=useState(false);
 const [revisionVersion,setRevisionVersion]=useState(''),[revisionId,setRevisionId]=useState(''),[publishApproved,setPublishApproved]=useState(false),[publishBusy,setPublishBusy]=useState(false),[publishedUrls,setPublishedUrls]=useState<string[]>([]);
 const [reviewIndustry,setReviewIndustry]=useState(''),[reviewServices,setReviewServices]=useState(''),[reviewApproved,setReviewApproved]=useState(false);
 // Any change to the reviewed facts or source invalidates prior approval.
 useEffect(()=>{setReviewApproved(false)},[inspected,designMode,name,brief,contactEmail,reviewIndustry,reviewServices,siteUrl]);
 const frameRef=useRef<HTMLIFrameElement>(null);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source!==frameRef.current?.contentWindow||!event.data||event.data.type!=='forge-preview-navigate'||typeof event.data.slug!=='string')return;const slug=event.data.slug;if(pages.some(page=>page.slug===slug))setActive(slug)};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[pages]);
 useEffect(()=>{setPublishApproved(false);setPublishedUrls([])},[pages,name,brief,contactEmail]);
 async function loadCurrentPublicationVersion(){
  const id=revisionId.trim();
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){setStatus('Enter a valid existing publication ID first.');return}
  try{
   const response=await fetch('/api/business/publish/'+id+'/versions',{cache:'no-store'});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||'Unable to load publication version');
   if(!Array.isArray(data.versions)||!data.versions.length)throw Error('No saved versions found for this publication');
   setRevisionVersion(String(data.versions[0].version));setPublishApproved(false);
   setStatus('Loaded latest saved version '+data.versions[0].version+'. Review the draft before approving.');
  }catch(error){setStatus(error instanceof Error?error.message:'Unable to load publication version')}
 }
 async function publishReviewedDraft(){
  if(!publishApproved||!pages.length){setStatus('Review the generated pages and approve publication first.');return}
  if(revisionId.trim()&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(revisionId.trim())){setStatus('Enter a valid publication UUID or leave it blank for a new website.');return}
  setPublishBusy(true);
  try{
   const target=revisionId.trim()?'/api/business/publish/'+revisionId.trim()+'/revisions':'/api/business/publish';
   const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ownerApproved:true,businessName:name.trim(),pages,...(revisionId.trim()?{expectedVersion:Number(revisionVersion)}:{})})});
   const data=await response.json();
   if(!response.ok)throw Error([data.error,...(Array.isArray(data.details)?data.details:[])].filter(Boolean).join(': ')||'Publishing unavailable');
   setPublishedUrls(Array.isArray(data.urls)?data.urls:(data.id?pages.map(page=>'/business-sites/'+data.id+'/'+page.slug):[]));
   if(data.id)setRevisionId(data.id);
   if(data.version)setRevisionVersion(String(data.version));
   else if(data.published)setRevisionVersion('1');
   setPublishApproved(false);
   setStatus('Publication saved. Open each page and verify navigation and content.');
  }catch(error){setStatus(error instanceof Error?error.message:'Publishing unavailable')}finally{setPublishBusy(false)}
 }
 const current=pages.find(p=>p.slug===active);
 const draftAudit=pages.length?auditGeneratedDraft(pages):null;
 const previewHtml=(current?.html||'').replace(/<\/body>/i,`<script>document.addEventListener('click',function(event){const anchor=event.target.closest('a[href]');if(!anchor)return;const href=anchor.getAttribute('href');if(!href||!/^([a-z0-9-]+)\\.html(?:[?#].*)?$/i.test(href))return;event.preventDefault();parent.postMessage({type:'forge-preview-navigate',slug:href.split('.')[0]},'*')})<\/script></body>`);
 async function inspectWebsite(){
 if(!siteUrl.trim()){setStatus('Enter a website address such as disney.com.');return}
 setResearchBusy(true);setStatus('Reading public website metadata and design details…');
 try{const response=await fetch('/api/site-reference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:siteUrl.trim()})});const data=await response.json();if(!response.ok)throw Error(data.error||'Website unavailable');if(!data.title&&!data.description&&!(data.headings||[]).length)throw Error('The website returned HTML but no readable business information. Try its main homepage URL or provide a business description manually.');setReferenceStyle(data.styleReference||{});setInspected({url:data.url,title:data.title||'',description:data.description||'',headings:data.headings||[],navigation:data.navigation||[],pageSummaries:data.pageSummaries||[],stylesheetsRead:data.stylesheetsRead||0,visualSignals:data.visualSignals});setReferenceMarkup('');setPages([]);setName((data.title||'').split(/[|—–-]/)[0].trim().slice(0,100)||new URL(data.url).hostname);setBrief([data.description,...(data.headings||[]).slice(0,3)].filter(Boolean).join('. ').slice(0,1600));setStatus('Website inspected: '+data.url+'. '+(data.styleFound?'Some design tokens detected. ':'No usable design tokens detected; style-copy will use a fallback theme. ')+data.notice+' Review extracted details before generating.')}catch(error){setStatus(error instanceof Error?error.message:'Unable to inspect website.')}finally{setResearchBusy(false)}
 }
 function generateFromReviewedEvidence(){
  if(!inspected||designMode==='new'){setStatus('Inspect an existing website first.');return}
  if(!reviewApproved){setStatus('Confirm your approval of the reviewed business details first.');return}
  const services=reviewServices.split(/[\n,;]/).map(item=>item.trim()).filter(Boolean);
  if(!reviewIndustry.trim()||brief.trim().length<15||services.length<1){setStatus('Provide a verified industry, description (15+ characters), and at least one service.');return}
  try{
   const evidence=inspectionToBrowserEvidence(inspected);
   const site=generateReviewedCaptureSite(evidence,{industry:reviewIndustry.trim(),description:brief.trim(),services,contactEmail:contactEmail.trim()||undefined},true);
   setPages(site.pages);setActive('index');
   setStatus('Review-only four-page draft generated from inspected metadata and your confirmed facts. No screenshot reconstruction or publication was performed.');
  }catch{setStatus('Unable to create the reviewed draft. Check the source and supplied business facts.')}
 }
 function additionalPages(){if(designMode==='new'||!inspected)return [] as GeneratedPage[];const used=new Set(['index','services','about','contact']);return (inspected.pageSummaries||[]).map(page=>{const segments=page.path.split('/').filter(Boolean);const slug=segments.join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,48)||'';if(!slug||used.has(slug))return null;used.add(slug);const safe=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');const title=safe(page.title||page.label);const summary=safe(page.description||'Content extracted from a public page; verify before publishing.');const headings=page.headings.slice(0,5).map(h=>'<li>'+safe(h)+'</li>').join('');const pageNav=(inspected.pageSummaries||[]).map(other=>{const otherSlug=other.path.split('/').filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,48);return otherSlug&&otherSlug!==slug?'<a href="'+safe(otherSlug)+'.html">'+safe(other.label)+'</a>':''}).join('');return {slug,title:page.label,html:'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>body{margin:0;background:#151923;color:#f7f5ef;font:18px system-ui,sans-serif}nav{padding:25px 7%;display:flex;gap:24px;flex-wrap:wrap}a{color:#d9c7a4}main{max-width:900px;margin:10vh auto;padding:0 7%}h1{font-size:clamp(36px,7vw,80px)}p{line-height:1.7}li{margin:16px 0}</style></head><body><nav><a href="index.html">Home</a><a href="services.html">Services</a><a href="about.html">About</a><a href="contact.html">Contact</a>'+pageNav+'</nav><main><h1>'+title+'</h1><p>'+summary+'</p><ul>'+headings+'</ul><p>Reconstructed content summary, not a copy of the original page or its functionality.</p></main></body></html>'} as GeneratedPage}).filter((page):page is GeneratedPage=>page!==null)}
 async function generate(){
 if(name.trim().length<2){setStatus('Enter your business name to get started.');return}if(designMode!=='new'&&!inspected&&!referenceMarkup.trim()){setStatus('Click Extract website appearance/details before generating, or paste saved HTML.');return}
 setBusy(true);setStatus('Building your website and choosing its design automatically…');
 const sourceBrief=designMode!=='new'&&inspected?[inspected.url,inspected.title,inspected.description,...inspected.headings.slice(0,3),...(inspected.pageSummaries||[]).flatMap(page=>[page.description,...page.headings.slice(0,2)])].filter(Boolean).join('. ').slice(0,1500):'';const researchedServices=inspected&&designMode!=='new'?[...inspected.headings,...(inspected.pageSummaries||[]).flatMap(page=>[page.label,...page.headings])].map(heading=>heading.replace(/\s+/g,' ').trim()).filter(heading=>heading.length>=5&&heading.length<=65&&!/^(home|about|contact|welcome|menu|explore|learn more|our story)$/i.test(heading)).filter((heading,index,all)=>all.findIndex(other=>other.toLowerCase()===heading.toLowerCase())===index).slice(0,3):[];const inferred=infer(name,sourceBrief||brief);const intelligence=inspected&&designMode!=='new'?analyzeSiteEvidence(inspected):null;const input={...inferred,...(intelligence&&intelligence.confidence!=='low'?{industry:intelligence.industry,services:intelligence.services}:{}),...(researchedServices.length>=2?{services:researchedServices}:{}),designMode,...(designMode!=='new'&&inspected?.visualSignals?{visualSignals:inspected.visualSignals}:{}),...(contactEmail.trim()?{contactEmail:contactEmail.trim()}: {}),...(designMode==='inspired'?{styleReference:{...referenceStyle,...parseStyleReference(referenceMarkup)}}:{})};
 try{
 const response=await fetch('/api/ai/business',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 if(!response.ok)throw Error((await response.json()).error||'AI generation unavailable');
 const result=await response.json();setPages([...createContextualShowcase(input),...result.pages.filter((p:GeneratedPage)=>p.slug!=='index'),...additionalPages()]);setActive('index');setStatus(designMode==='inspired'?'Style-inspired website generated using available reference colors and typography.':designMode==='redesign'?'New website generated from extracted homepage details. Review accuracy and design.':result.provider==='ollama'?'Website created with local AI.':'Website created with automatic design and content. Local AI is optional.');
 }catch{
 try{const site=generateBusinessWebsite(input);setPages([...createContextualShowcase(input),...site.pages.filter(p=>p.slug!=='index'),...additionalPages()]);setActive('index');setStatus('Website created with the free automatic generator after the AI endpoint was unavailable. Review all generated content before publishing.')}catch{setStatus('Unable to generate. Check your business name and description.')}
 }finally{setBusy(false)}
 }
 return <div className="business-generator forge-auto">
 <header><Link href="/">✦ FORGE STUDIO</Link><strong>AI WEBSITE BUILDER</strong></header>
 <div className="forge-auto-layout">
 <aside className="forge-auto-panel"><div className="eyebrow">YOUR WEBSITE, AUTOMATICALLY</div><h1>Tell us about your business.<br/><em>We build the rest.</em></h1><p>One business name, one generation step. Forge selects industry-relevant photography, page structure and visual direction automatically. Review all facts and images before publishing.</p>
 <label>Design approach<select value={designMode} onChange={e=>{setDesignMode(e.target.value as 'new'|'inspired'|'redesign');setPages([])}}><option value="new">Create a completely new website</option><option value="inspired">Preserve an existing site's visual style</option><option value="redesign">Fully redesign an existing site</option></select></label>
 {designMode!=='new'&&<><label>Existing website address<input type="url" value={siteUrl} onChange={e=>{setSiteUrl(e.target.value);setInspected(null);setReferenceStyle({});setPages([])}} placeholder="e.g. disney.com"/></label><button type="button" disabled={researchBusy} onClick={()=>void inspectWebsite()}>{researchBusy?'Inspecting website…':designMode==='inspired'?'Extract website appearance':'Extract website details for redesign'}</button><details className="forge-auto-advanced"><summary>Optional: paste existing HTML/CSS instead</summary><textarea rows={4} value={referenceMarkup} onChange={e=>setReferenceMarkup(e.target.value)} placeholder="Paste saved HTML with embedded CSS"/></details><p className="forge-auto-note">Forge inspects public homepage metadata and limited embedded styling. It does not copy proprietary images, source code or entire layouts. Verify details before publishing.</p></>}

 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Review evidence-grounded website proposal</summary>{(()=>{try{const evidence=inspectionToBrowserEvidence(inspected);const proposal=proposeBusinessSiteFromCapture(evidence);return <div className="forge-auto-note"><p><strong>Proposed business name:</strong> {proposal.businessName}</p><p><strong>Observed headings:</strong> {proposal.observedHeadings.join(' · ')||'None'}</p><p><strong>Verified business facts required:</strong> {proposal.missingRequiredFields.join(', ')}</p><p><strong>Captured navigation:</strong> {proposal.navigation.length} unverified links</p><p><strong>Publishing:</strong> blocked until owner review and approval</p><p>{proposal.warnings.join(' ')}</p></div>}catch{return <p className="forge-auto-note">This inspection cannot be converted into a trusted evidence proposal. Verify the source URL and try again.</p>}})()}</details>}
 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Generate from reviewed website evidence</summary><p className="forge-auto-note">This option uses metadata evidence only, not screenshot reconstruction. Enter verified facts before generating.</p><label>Verified industry<input value={reviewIndustry} onChange={e=>{setReviewIndustry(e.target.value);setReviewApproved(false)}} placeholder="e.g. Professional services"/></label><label>Verified services (comma-separated)<textarea rows={3} value={reviewServices} onChange={e=>{setReviewServices(e.target.value);setReviewApproved(false)}} placeholder="e.g. Consulting, Support"/></label><label><input type="checkbox" checked={reviewApproved} onChange={e=>setReviewApproved(e.target.checked)}/> I have reviewed the extracted business name, description above, industry and services.</label><button type="button" disabled={!reviewApproved} onClick={generateFromReviewedEvidence}>Generate reviewed four-page draft</button></details>}
 {inspected&&designMode!=='new'&&<div role="status" className="forge-auto-note"><strong>Extracted from {inspected.url}</strong><p>Title: {inspected.title||'Unavailable'}</p><p>Description: {inspected.description||'Unavailable'}</p><p>Headings: {inspected.headings.slice(0,3).join(' · ')||'Unavailable'}</p><p>Discovered page links: {inspected.navigation?.length||0}. {inspected.navigation?.slice(0,5).map(item=>item.label).join(' · ')||'None identified'}. Successfully inspected: {inspected.pageSummaries?.length||0}. Intelligence: {analyzeSiteEvidence(inspected).industry} ({analyzeSiteEvidence(inspected).confidence} confidence). Coverage: {inspectionCoverage(inspected).internalPages} internal pages; browser-rendered visuals not yet inspected. Pages have not yet been reconstructed.</p>{inspected.pageSummaries?.map(page=><p key={page.path}><strong>{page.label}:</strong> {page.title} — {page.description||page.headings.slice(0,2).join(' · ')||'No readable summary'}</p>)}<p>Visual style: {referenceStyle.background||'No background detected'} / {referenceStyle.accent||'No accent detected'}. Stylesheets inspected: {inspected.stylesheetsRead}. {inspected.visualSignals&&<span> Structure: {inspected.visualSignals.sectionCount} sections, {inspected.visualSignals.imageCount} images, {inspected.visualSignals.buttonCount} buttons, {inspected.visualSignals.heroSections} hero markers.</span>}</p></div>}
 <label>Business name<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Northstar Coffee"/></label>
 <label>What does your business do? <span className="optional">(optional)</span><textarea rows={5} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe what you offer, who you serve and what makes you different."/></label>
 <details className="forge-auto-advanced"><summary>Add contact information (recommended before publishing)</summary><label>Business email<input type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="hello@yourbusiness.com"/></label></details>
 <button className="forge-auto-cta" onClick={()=>void generate()} disabled={busy}>{busy?'Creating your website…':'✦ Generate my immersive website'}</button>

 {status&&<p role="status" className="forge-auto-status">{status}</p>}
 <p className="forge-auto-note">For the best results, include your products, services and atmosphere. Business-specific visuals are selected automatically. Automatically generates Home, Services, About and Contact pages. Free generation remains available if an AI provider is offline.</p>
 {pages.length>0&&<div role="status" className="forge-auto-note"><strong>Draft quality:</strong> {draftAudit?.readyForReview?'Ready for owner review':'Needs corrections'} · {draftAudit?.errors.length} errors · {draftAudit?.warnings.length} warnings. Publishing has not been verified. {(draftAudit?.errors.length??0)>0&&<p>{draftAudit?.errors.slice(0,3).join(' · ')}</p>}</div>}
 {pages.length>0&&<div className="forge-auto-note"><label>Existing publication ID (optional, to save a new revision)<input value={revisionId} onChange={e=>{setRevisionId(e.target.value);setPublishApproved(false)}} placeholder="Publication UUID, leave blank for a new website"/></label><label>Current publication version (required for revisions)<input type="number" min="1" step="1" value={revisionVersion} onChange={e=>{setRevisionVersion(e.target.value);setPublishApproved(false)}} placeholder="Check saved versions in Manage published websites"/></label><button type="button" onClick={()=>void loadCurrentPublicationVersion()} disabled={!revisionId.trim()}>Load current publication version</button><label><input type="checkbox" checked={publishApproved} onChange={e=>setPublishApproved(e.target.checked)}/> I reviewed every generated page and approve publishing this business website.</label><button type="button" disabled={!publishApproved||!draftAudit?.readyForReview||publishBusy||(!!revisionId.trim()&&(!Number.isSafeInteger(Number(revisionVersion))||Number(revisionVersion)<1))} onClick={()=>void publishReviewedDraft()}>{publishBusy?"Publishing…":"Publish approved draft (if enabled)"}</button>{publishedUrls.map(url=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">View published page: {url}</a></p>)}<p>Publishing requires sign-in and server configuration; it is disabled by default.</p></div>}
 {pages.length>0&&<div className="forge-auto-export"><button onClick={()=>pages.forEach(p=>downloadText(p.slug+'.html',p.html,'text/html'))}>↓ Download website pages</button><Link href="/business/publications">Manage published websites ↗</Link></div>}
 <p><Link href="/redesign" style={{color:"#eac9a0",fontWeight:700}}>✦ Score a website & plan an intelligent redesign →</Link></p>
 <details className="forge-auto-advanced"><summary>Advanced editing and intelligence tools</summary><div><Link href="/editor">Visual editor</Link><Link href="/intelligence">Intelligence</Link><Link href="/assets">Asset library</Link></div></details>
 </aside>
 <main className="forge-auto-preview"><div className="forge-auto-toolbar"><span>● LIVE WEBSITE PREVIEW · {mobile?"390px mobile":"Full-width desktop"}</span><div><button type="button" onClick={()=>setMobile(false)} aria-pressed={!mobile} aria-label="Switch to full-width desktop website preview">Desktop</button><button type="button" onClick={()=>setMobile(true)} aria-pressed={mobile} aria-label="Switch to 390 pixel mobile website preview">Mobile</button></div></div>
 {pages.length>0?<><nav className="forge-auto-tabs" aria-label="Website pages">{pages.map(p=><button key={p.slug} aria-current={active===p.slug?'page':undefined} onClick={()=>setActive(p.slug)}>{p.title}</button>)}</nav><div className={'forge-auto-frame '+(mobile?'mobile':'')}><iframe ref={frameRef} title={'Website preview: '+(current?.title||'Home')} sandbox="allow-scripts" srcDoc={previewHtml}/></div></>:<div className="forge-auto-placeholder"><div className="forge-auto-orb">✦</div><span>THE NEXT GENERATION OF WEBSITES</span><h2>Beautiful by default.<br/>Built around your brand.</h2><p>Your website preview will appear here, ready to explore.</p></div>}
 </main></div></div>
}
