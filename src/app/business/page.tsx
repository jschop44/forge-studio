'use client';
import {useState} from 'react';
import Link from 'next/link';
import {generateBusinessWebsite,type GeneratedPage} from '../../lib/business-site';
import {downloadText} from '../../lib/export';
import {createContextualShowcase} from '../../lib/immersive-showcase';
type Brief={businessName:string;industry:string;description:string;services:string[];contactEmail?:string};
function infer(name:string,brief:string):Brief{
 const text=(name+' '+brief).toLowerCase();
 const industry=/coffee|espresso|roast|barista|café|cafe/.test(text)?'Coffee shop and cafe':/restaurant|pizza|food|bakery/.test(text)?'Restaurant and hospitality':/real estate|realtor|property/.test(text)?'Real estate':/gym|fitness|wellness|spa/.test(text)?'Health and wellness':/auto|car|vehicle/.test(text)?'Automotive':/fashion|jewelry|clothing/.test(text)?'Fashion and luxury':/software|tech|digital|ai /.test(text)?'Technology':'Professional services';
 const description=brief.trim().length>=15?brief.trim():name+' provides thoughtful, professional solutions for customers seeking quality and dependable service.';
 const serviceLine=brief.split('\n').find(line=>/^(services|products|offerings|menu)\s*:/i.test(line.trim()));
 const listed=serviceLine?serviceLine.replace(/^[^:]+:/,'').split(/[,;]/).map(part=>part.trim()).filter(part=>part.length>=3&&part.length<=65).slice(0,5):[];

 const services=listed.length>=2?listed: /coffee|espresso|roast|barista|café|cafe/.test(text)?['Coffee menu','Visit our café','Contact the team']:/restaurant|pizza|food|bakery/.test(text)?['Explore the menu','Visit us','Ask a question']:/real estate|realtor|property/.test(text)?['Explore properties','Discuss your goals','Contact an agent']:/gym|fitness|wellness|spa/.test(text)?['Explore programs','Ask about availability','Contact the team']:['Explore services','Discuss your project','Contact the team'];
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
 const [inspected,setInspected]=useState<{url:string;title:string;description:string;headings:string[];stylesheetsRead:number;visualSignals?:{navigationLinks:number;heroSections:number;imageCount:number;sectionCount:number;buttonCount:number;hasVideo:boolean;hasCanvas:boolean}}|null>(null),[siteUrl,setSiteUrl]=useState(''),[researchBusy,setResearchBusy]=useState(false),[referenceStyle,setReferenceStyle]=useState<StyleReference>({}),[name,setName]=useState(''),[designMode,setDesignMode]=useState<'new'|'inspired'|'redesign'>('new'),[referenceMarkup,setReferenceMarkup]=useState(''),[brief,setBrief]=useState(''),[contactEmail,setContactEmail]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[pages,setPages]=useState<GeneratedPage[]>([]),[active,setActive]=useState('index'),[mobile,setMobile]=useState(false);
 const current=pages.find(p=>p.slug===active);
 async function inspectWebsite(){
 if(!siteUrl.trim()){setStatus('Enter a website address such as disney.com.');return}
 setResearchBusy(true);setStatus('Reading public website metadata and design details…');
 try{const response=await fetch('/api/site-reference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:siteUrl.trim()})});const data=await response.json();if(!response.ok)throw Error(data.error||'Website unavailable');setReferenceStyle(data.styleReference||{});setInspected({url:data.url,title:data.title||'',description:data.description||'',headings:data.headings||[],stylesheetsRead:data.stylesheetsRead||0,visualSignals:data.visualSignals});setReferenceMarkup('');setPages([]);setName((data.title||'').split(/[|—–-]/)[0].trim().slice(0,100)||new URL(data.url).hostname);setBrief([data.description,...(data.headings||[]).slice(0,3)].filter(Boolean).join('. ').slice(0,1600));setStatus('Website inspected: '+data.url+'. '+(data.styleFound?'Some design tokens detected. ':'No usable design tokens detected; style-copy will use a fallback theme. ')+data.notice+' Review extracted details before generating.')}catch(error){setStatus(error instanceof Error?error.message:'Unable to inspect website.')}finally{setResearchBusy(false)}
 }
 async function generate(){
 if(name.trim().length<2){setStatus('Enter your business name to get started.');return}if(designMode!=='new'&&!inspected&&!referenceMarkup.trim()){setStatus('Click Extract website appearance/details before generating, or paste saved HTML.');return}
 setBusy(true);setStatus('Building your website and choosing its design automatically…');
 const sourceBrief=designMode!=='new'&&inspected?[inspected.description,...inspected.headings.slice(0,3)].filter(Boolean).join('. '):'';const researchedServices=inspected&&designMode!=='new'?inspected.headings.map(heading=>heading.replace(/\s+/g,' ').trim()).filter(heading=>heading.length>=5&&heading.length<=65&&!/^(home|about|contact|welcome|menu|explore|learn more|our story)$/i.test(heading)).filter((heading,index,all)=>all.findIndex(other=>other.toLowerCase()===heading.toLowerCase())===index).slice(0,3):[];const inferred=infer(name,sourceBrief||brief);const input={...inferred,...(researchedServices.length>=2?{services:researchedServices}:{}),designMode,...(designMode!=='new'&&inspected?.visualSignals?{visualSignals:inspected.visualSignals}:{}),...(contactEmail.trim()?{contactEmail:contactEmail.trim()}: {}),...(designMode==='inspired'?{styleReference:{...referenceStyle,...parseStyleReference(referenceMarkup)}}:{})};
 try{
 const response=await fetch('/api/ai/business',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
 if(!response.ok)throw Error((await response.json()).error||'AI generation unavailable');
 const result=await response.json();setPages([...createContextualShowcase(input),...result.pages.filter((p:GeneratedPage)=>p.slug!=='index')]);setActive('index');setStatus(designMode==='inspired'?'Style-inspired website generated using available reference colors and typography.':designMode==='redesign'?'New website generated from extracted homepage details. Review accuracy and design.':result.provider==='ollama'?'Website created with local AI.':'Website created with automatic design and content. Local AI is optional.');
 }catch{
 try{const site=generateBusinessWebsite(input);setPages([...createContextualShowcase(input),...site.pages.filter(p=>p.slug!=='index')]);setActive('index');setStatus('Website created with the free automatic generator.')}catch{setStatus('Unable to generate. Check your business name and description.')}
 }finally{setBusy(false)}
 }
 return <div className="business-generator forge-auto">
 <header><Link href="/">✦ FORGE STUDIO</Link><strong>AI WEBSITE BUILDER</strong></header>
 <div className="forge-auto-layout">
 <aside className="forge-auto-panel"><div className="eyebrow">YOUR WEBSITE, AUTOMATICALLY</div><h1>Tell us about your business.<br/><em>We build the rest.</em></h1><p>One business name, one generation step. Forge selects industry-relevant photography, page structure and visual direction automatically. Review all facts and images before publishing.</p>
 <label>Design approach<select value={designMode} onChange={e=>{setDesignMode(e.target.value as 'new'|'inspired'|'redesign');setPages([])}}><option value="new">Create a completely new website</option><option value="inspired">Preserve an existing site's visual style</option><option value="redesign">Fully redesign an existing site</option></select></label>
 {designMode!=='new'&&<><label>Existing website address<input type="url" value={siteUrl} onChange={e=>{setSiteUrl(e.target.value);setInspected(null);setReferenceStyle({});setPages([])}} placeholder="e.g. disney.com"/></label><button type="button" disabled={researchBusy} onClick={()=>void inspectWebsite()}>{researchBusy?'Inspecting website…':designMode==='inspired'?'Extract website appearance':'Extract website details for redesign'}</button><details className="forge-auto-advanced"><summary>Optional: paste existing HTML/CSS instead</summary><textarea rows={4} value={referenceMarkup} onChange={e=>setReferenceMarkup(e.target.value)} placeholder="Paste saved HTML with embedded CSS"/></details><p className="forge-auto-note">Forge inspects public homepage metadata and limited embedded styling. It does not copy proprietary images, source code or entire layouts. Verify details before publishing.</p></>}

 {inspected&&designMode!=='new'&&<div role="status" className="forge-auto-note"><strong>Extracted from {inspected.url}</strong><p>Title: {inspected.title||'Unavailable'}</p><p>Description: {inspected.description||'Unavailable'}</p><p>Headings: {inspected.headings.slice(0,3).join(' · ')||'Unavailable'}</p><p>Visual style: {referenceStyle.background||'No background detected'} / {referenceStyle.accent||'No accent detected'}. Stylesheets inspected: {inspected.stylesheetsRead}. {inspected.visualSignals&&<span> Structure: {inspected.visualSignals.sectionCount} sections, {inspected.visualSignals.imageCount} images, {inspected.visualSignals.buttonCount} buttons, {inspected.visualSignals.heroSections} hero markers.</span>}</p></div>}
 <label>Business name<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Northstar Coffee"/></label>
 <label>What does your business do? <span className="optional">(optional)</span><textarea rows={5} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe what you offer, who you serve and what makes you different."/></label>
 <details className="forge-auto-advanced"><summary>Add contact information (recommended before publishing)</summary><label>Business email<input type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="hello@yourbusiness.com"/></label></details>
 <button className="forge-auto-cta" onClick={()=>void generate()} disabled={busy}>{busy?'Creating your website…':'✦ Generate my immersive website'}</button>

 {status&&<p role="status" className="forge-auto-status">{status}</p>}
 <p className="forge-auto-note">For the best results, include your products, services and atmosphere. Business-specific visuals are selected automatically. Automatically generates Home, Services, About and Contact pages. Free generation remains available if an AI provider is offline.</p>
 {pages.length>0&&<div className="forge-auto-export"><button onClick={()=>pages.forEach(p=>downloadText(p.slug+'.html',p.html,'text/html'))}>↓ Download website pages</button><Link href="/cloud">Save & publish ↗</Link></div>}
 <p><Link href="/redesign" style={{color:"#eac9a0",fontWeight:700}}>✦ Score a website & plan an intelligent redesign →</Link></p>
 <details className="forge-auto-advanced"><summary>Advanced editing and intelligence tools</summary><div><Link href="/editor">Visual editor</Link><Link href="/intelligence">Intelligence</Link><Link href="/assets">Asset library</Link></div></details>
 </aside>
 <main className="forge-auto-preview"><div className="forge-auto-toolbar"><span>● LIVE WEBSITE PREVIEW · {mobile?"390px mobile":"Full-width desktop"}</span><div><button type="button" onClick={()=>setMobile(false)} aria-pressed={!mobile} aria-label="Switch to full-width desktop website preview">Desktop</button><button type="button" onClick={()=>setMobile(true)} aria-pressed={mobile} aria-label="Switch to 390 pixel mobile website preview">Mobile</button></div></div>
 {pages.length>0?<><nav className="forge-auto-tabs" aria-label="Website pages">{pages.map(p=><button key={p.slug} aria-current={active===p.slug?'page':undefined} onClick={()=>setActive(p.slug)}>{p.title}</button>)}</nav><div className={'forge-auto-frame '+(mobile?'mobile':'')}><iframe title={'Website preview: '+(current?.title||'Home')} sandbox="allow-scripts" srcDoc={current?.html||''}/></div></>:<div className="forge-auto-placeholder"><div className="forge-auto-orb">✦</div><span>THE NEXT GENERATION OF WEBSITES</span><h2>Beautiful by default.<br/>Built around your brand.</h2><p>Your website preview will appear here, ready to explore.</p></div>}
 </main></div></div>
}
