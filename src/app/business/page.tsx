'use client';
import {BusinessRecognitionSchema,literalBusinessActivity} from '../../lib/business-recognition';
import {businessPreviewHtml} from '../../lib/business-preview';
import {industryPhotos} from '../../lib/industry-photos';
import {VisualAssetSchema,type VisualAsset} from '../../lib/visual-assets';
import {enhanceImmersiveWorld} from '../../lib/immersive-world';
import {createExtractedPages,applyExtractedExperience} from '../../lib/extracted-pages';
import {applyReferenceAppearance,websiteAddressKey} from '../../lib/reference-appearance';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {generateBusinessWebsite,type GeneratedPage} from '../../lib/business-site';
import {auditGeneratedDraft} from '../../lib/draft-quality-gate';
import {validateBrowserEvidence} from '../../lib/browser-evidence';
import {capturePreviewPages} from '../../lib/capture-preview';
import {navigationQualityRecommendations} from '../../lib/navigation-quality-recommendations';
import type {BrowserEvidence} from '../../lib/browser-evidence';
import {downloadText} from '../../lib/export';
import {inferBusinessIndustry} from '../../lib/website-experience';
import {analyzeSiteEvidence,inspectionCoverage} from '../../lib/forge-intelligence';
import {inspectionToBrowserEvidence} from '../../lib/inspection-evidence-adapter';
import {proposeBusinessSiteFromCapture,generateReviewedCaptureSite} from '../../lib/capture-business-proposal';
import type {WebsiteExperience} from '../../lib/website-experience';
type Brief={businessName:string;industry:string;description:string;services:string[];contactEmail?:string};
function infer(name:string,brief:string):Brief{
 const text=(name+' '+brief).toLowerCase();
 const declaredIndustry=brief.match(/(?:^|\n)\s*(?:industry|business type|category)\s*:\s*([^\n]{3,80})/i)?.[1]?.trim();
 const industry=declaredIndustry||inferBusinessIndustry(name,brief);
 const copy=brief.split('\n').filter(line=>!/^\s*(?:industry|business type|category|services|products|offerings|menu)\s*:/i.test(line)).join(' ').trim();
 const description=copy.length>=15?copy:brief.trim().length>=15?name+' offers '+(brief.match(/(?:services|products|offerings|menu)\s*:\s*([^\n]+)/i)?.[1]||industry.toLowerCase())+'.':'Explore what '+name+' offers and find the information you need for your next step.';
 const serviceLine=brief.split('\n').find(line=>/^(services|products|offerings|menu)\s*:/i.test(line.trim()));
 const listed=serviceLine?serviceLine.replace(/^[^:]+:/,'').split(/[,;]/).map(part=>part.trim()).filter(part=>part.length>=3&&part.length<=65).slice(0,12):[];

 const services=listed.length>=1?listed:/soccer|football club/.test(industry)?['Soccer training','Teamwear and equipment','Match information']:declaredIndustry?['Explore '+declaredIndustry.toLowerCase()+' offerings','About our business','Contact us'] :/disney|theme park|entertainment|movies|characters|streaming/.test(industry)?['Explore entertainment','Discover destinations','Browse stories']:/coffee|espresso|roast|barista|café|cafe/.test(industry)?['Coffee menu','Visit our café','Contact the team']:/baseball|softball|batting|sports? equipment|sporting goods|baseball bat|baseball glove/.test(industry)?['Shop baseball equipment','Explore bats and gloves','Contact the store']:/restaurant|pizza|food|bakery/.test(industry)?['Explore the menu','Visit us','Ask a question']:/real estate|realtor|property/.test(industry)?['Explore properties','Discuss your goals','Contact an agent']:/gym|fitness|wellness|spa/.test(industry)?['Explore programs','Ask about availability','Contact the team']:/\bhospitals?\b|healthcare|medical|clinic/.test(industry)?['Care services','Patient information','Contact the team']:['Explore services','Discuss your project','Contact the team'];
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
type Inspection={url:string;title:string;description:string;headings:string[];navigation?:{label:string;path:string}[];pageSummaries?:{path:string;label:string;title:string;description:string;headings:string[]}[];stylesheetsRead:number;visualSignals?:{navigationLinks:number;heroSections:number;imageCount:number;sectionCount:number;buttonCount:number;hasVideo:boolean;hasCanvas:boolean}} & {styleReference?:StyleReference};
export default function BusinessGenerator(){
 const [inspected,setInspected]=useState<Inspection|null>(null),[siteUrl,setSiteUrl]=useState(''),[researchBusy,setResearchBusy]=useState(false),[referenceStyle,setReferenceStyle]=useState<StyleReference>({}),[name,setName]=useState(''),[designMode,setDesignMode]=useState<'new'|'inspired'|'redesign'>('new'),[referenceMarkup,setReferenceMarkup]=useState(''),[brief,setBrief]=useState(''),[contactEmail,setContactEmail]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[pages,setPages]=useState<GeneratedPage[]>([]),[active,setActive]=useState('index'),[mobile,setMobile]=useState(false);
 const [inspectionError,setInspectionError]=useState('');
 const inspectionEpoch=useRef(0),inspectionController=useRef<AbortController|null>(null),siteAddressRef=useRef('');
 useEffect(()=>()=>{inspectionEpoch.current++;inspectionController.current?.abort()},[]);
 function updateWebsiteAddress(value:string){
  if(websiteAddressKey(value)!==websiteAddressKey(siteAddressRef.current)){
   inspectionEpoch.current++;inspectionController.current?.abort();setResearchBusy(false);setInspected(null);setInspectionError('');setReferenceStyle({});setWorkerEvidence(null);setWorkerEvidenceText('');setPages([]);
  }
  siteAddressRef.current=value;setSiteUrl(value);
 }
 function extractedName(evidence:Inspection){return evidence.title.split(/[|—–]/)[0].trim().slice(0,100)||new URL(evidence.url).hostname}
 const [previewAnchor,setPreviewAnchor]=useState('');
 const [experienceStyle,setExperienceStyle]=useState<WebsiteExperience>('standard');
 const [workerEvidenceText,setWorkerEvidenceText]=useState(''),[workerEvidence,setWorkerEvidence]=useState<BrowserEvidence|null>(null),[workerEvidenceError,setWorkerEvidenceError]=useState(''),[capturePreview,setCapturePreview]=useState<GeneratedPage[]>([]),[capturePreviewIndex,setCapturePreviewIndex]=useState(0);
 const [revisionVersion,setRevisionVersion]=useState(''),[revisionId,setRevisionId]=useState(''),[publishApproved,setPublishApproved]=useState(false),[publishBusy,setPublishBusy]=useState(false),[publishedUrls,setPublishedUrls]=useState<string[]>([]);
 const [reviewIndustry,setReviewIndustry]=useState(''),[reviewServices,setReviewServices]=useState(''),[reviewApproved,setReviewApproved]=useState(false);
 // Any change to the reviewed facts or source invalidates prior approval.
 useEffect(()=>{setReviewApproved(false)},[inspected,designMode,name,brief,contactEmail,reviewIndustry,reviewServices,siteUrl]);
 const frameRef=useRef<HTMLIFrameElement>(null);
 const revealGeneratedPreview=useRef(false);
 const revealPreview=()=>frameRef.current?.scrollIntoView({block:'start',behavior:'instant'});
 useEffect(()=>{if(revealGeneratedPreview.current&&pages.length){revealGeneratedPreview.current=false;revealPreview()}},[pages]);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source!==frameRef.current?.contentWindow||!event.data||event.data.type!=='forge-preview-navigate'||typeof event.data.slug!=='string')return;const slug=event.data.slug;if(pages.some(page=>page.slug===slug)){revealPreview();setPreviewAnchor(typeof event.data.hash==='string'&&/^#[a-z0-9_-]{1,100}$/i.test(event.data.hash)?event.data.hash:'');setActive(slug)}};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[pages]);
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
 const [layoutChoice,setLayoutChoice]=useState<'spacious'|'compact'>('spacious');
 function applyLayout(choice:'spacious'|'compact'){
  if(!pages.length)return;
  setUndoPages(pages);setLayoutChoice(choice);
  setPages(previous=>previous.map(page=>{
   const doc=new DOMParser().parseFromString(page.html,'text/html');
   doc.querySelectorAll('style[data-forge-layout]').forEach(node=>node.remove());
   const style=doc.createElement('style');style.setAttribute('data-forge-layout','true');
   style.textContent=choice==='compact'?'main section,main article,main .region{padding-block:1rem!important;margin-block:.5rem!important}main{line-height:1.45}':'main section,main article,main .region{padding-block:clamp(2rem,5vw,5rem)!important;margin-block:1.5rem!important}main{line-height:1.65}';
   doc.head.appendChild(style);
   return {...page,html:'<!doctype html>\n'+doc.documentElement.outerHTML};
  }));
  setStatus('Layout spacing applied across all pages. Review desktop and mobile previews.');
 }
 const [paragraphEdit,setParagraphEdit]=useState('');
 useEffect(()=>{const page=pages.find(p=>p.slug===active);if(!page){setParagraphEdit('');return}const doc=new DOMParser().parseFromString(page.html,'text/html');setParagraphEdit(doc.querySelector('main p')?.textContent||'')},[pages,active]);
 function saveParagraph(){
  const value=paragraphEdit.trim().slice(0,600);
  if(!value){setStatus('Enter paragraph text before applying.');return}
  const page=pages.find(p=>p.slug===active);if(!page)return;
  const doc=new DOMParser().parseFromString(page.html,'text/html');
  const paragraph=doc.querySelector('main p');
  if(!paragraph){setStatus('This page has no editable main paragraph.');return}
  paragraph.textContent=value;
  setUndoPages(pages);
  setPages(previous=>previous.map(item=>item.slug===active?{...item,html:'<!doctype html>\n'+doc.documentElement.outerHTML}:item));
  setStatus('Website paragraph updated. Review before publishing.');
 }
 const [subheadingEdit,setSubheadingEdit]=useState('');
 useEffect(()=>{const page=pages.find(p=>p.slug===active);if(!page){setSubheadingEdit('');return}const doc=new DOMParser().parseFromString(page.html,'text/html');setSubheadingEdit(doc.querySelector('h2')?.textContent||'')},[pages,active]);
 function saveSubheading(){
  const value=subheadingEdit.trim().slice(0,160);
  if(!value){setStatus('Enter section text before applying.');return}
  const page=pages.find(p=>p.slug===active);if(!page)return;
  const doc=new DOMParser().parseFromString(page.html,'text/html');
  const heading=doc.querySelector('h2');
  if(!heading){setStatus('This page does not contain an editable section heading.');return}
  heading.textContent=value;
  setUndoPages(pages);
  setPages(previous=>previous.map(item=>item.slug===active?{...item,html:'<!doctype html>\n'+doc.documentElement.outerHTML}:item));
  setStatus('Section heading updated. Review the preview before publishing.');
 }
 const [showAdvancedReview,setShowAdvancedReview]=useState(false);
 const [undoPages,setUndoPages]=useState<GeneratedPage[]|null>(null);
 function undoLastEdit(){
  if(!undoPages)return;
  setPages(undoPages);setUndoPages(null);setStatus('Restored the website to its state before your last edit.');
 }
 const [quickAccent,setQuickAccent]=useState('#d9c7a4');
 function applyAccent(){
  if(!/^#[0-9a-fA-F]{6}$/.test(quickAccent))return;
  setUndoPages(pages);
  setPages(previous=>previous.map(page=>{
   const doc=new DOMParser().parseFromString(page.html,'text/html');
   const style=doc.createElement('style');
   style.textContent=':root{--forge-user-accent:'+quickAccent+'}a,button{accent-color:var(--forge-user-accent)}a{color:var(--forge-user-accent)}';
   doc.head.appendChild(style);
   return {...page,html:'<!doctype html>\n'+doc.documentElement.outerHTML};
  }));
  setStatus('Brand accent applied to all generated pages. Review contrast before publishing.');
 }
 const [headingEdit,setHeadingEdit]=useState('');
 useEffect(()=>{const page=pages.find(p=>p.slug===active);if(!page){setHeadingEdit('');return}const doc=new DOMParser().parseFromString(page.html,'text/html');setHeadingEdit(doc.querySelector('h1')?.textContent||'')},[pages,active]);
 function saveHeading(){
  const heading=headingEdit.trim().slice(0,120);
  if(!heading){setStatus('Enter a heading before saving.');return}
  const page=pages.find(p=>p.slug===active);
  if(!page)return;
  const doc=new DOMParser().parseFromString(page.html,'text/html');
  const target=doc.querySelector('h1');
  if(!target){setStatus('This page has no editable main heading.');return}
  target.textContent=heading;
  const updated='<!doctype html>\n'+doc.documentElement.outerHTML;
  setUndoPages(pages);
  setPages(previous=>previous.map(item=>item.slug===active?{...item,html:updated}:item));
  setStatus('Heading updated in the website preview. Review the page before publishing.');
 }
 const current=pages.find(p=>p.slug===active);
 const draftAudit=pages.length?auditGeneratedDraft(pages):null;
 const previewHtml=businessPreviewHtml(current,pages,previewAnchor);
 async function inspectWebsite():Promise<Inspection|null>{
  const requested=siteAddressRef.current.trim()||siteUrl.trim();
  if(!requested){const message='Enter a website address such as example.com.';setInspectionError(message);setStatus(message);return null}
  const epoch=++inspectionEpoch.current;inspectionController.current?.abort();
  const controller=new AbortController();inspectionController.current=controller;const timer=setTimeout(()=>controller.abort(),60000);
  setResearchBusy(true);setInspectionError('');setStatus('Reading public website metadata and design details…');
  try{
   const response=await fetch('/api/site-reference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:requested}),signal:controller.signal});
   const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to read this website');
   if(epoch!==inspectionEpoch.current)return null;
   if(!data.title&&!data.description&&!(data.headings||[]).length)throw Error('The website returned no readable business information. Try its main homepage or provide a description manually.');
   const evidence:Inspection={url:new URL(data.url||websiteAddressKey(requested)!).href,title:data.title||'',description:data.description||'',headings:data.headings||[],navigation:data.navigation||[],pageSummaries:data.pageSummaries||[],stylesheetsRead:data.stylesheetsRead||0,visualSignals:data.visualSignals,styleReference:data.styleReference||{}};
   setInspected(evidence);setReferenceStyle(evidence.styleReference||{});setReferenceMarkup('');setUndoPages(null);setPages([]);setName(extractedName(evidence));setBrief([evidence.description,...evidence.headings.slice(0,3)].filter(Boolean).join('. ').slice(0,1600));
   setStatus('Website extracted: '+new URL(evidence.url).hostname+'. '+(data.styleFound?'Appearance tokens found. ':'No reusable appearance tokens found; your draft will use a new theme. ')+'Review the extracted details, then generate.');
   return evidence;
  }catch(error){
   if(epoch!==inspectionEpoch.current)return null;
   const message='Website extraction failed: '+(controller.signal.aborted?'The request timed out. Please retry.':error instanceof Error?error.message:'Unable to read this website');setInspectionError(message);setStatus(message);return null;
  }finally{clearTimeout(timer);if(epoch===inspectionEpoch.current){setResearchBusy(false);inspectionController.current=null}}
 }
 function generateFromReviewedEvidence(){
  if(!inspected||designMode==='new'){setStatus('Inspect an existing website first.');return}
  if(!reviewApproved){setStatus('Confirm your approval of the reviewed business details first.');return}
  const services=reviewServices.split(/[\n,;]/).map(item=>item.trim()).filter(Boolean);
  if(!reviewIndustry.trim()||brief.trim().length<15||services.length<1){setStatus('Provide a verified industry, description (15+ characters), and at least one service.');return}
  try{
   const evidence=inspectionToBrowserEvidence(inspected);
   const site=generateReviewedCaptureSite(evidence,{experienceStyle,industry:reviewIndustry.trim(),description:brief.trim(),services,contactEmail:contactEmail.trim()||undefined},true);
   setPages(site.pages);setActive('index');
   setStatus('Review-only four-page draft generated from inspected metadata and your confirmed facts. No screenshot reconstruction or publication was performed.');
  }catch{setStatus('Unable to create the reviewed draft. Check the source and supplied business facts.')}
 }
 function additionalPages(evidence:Inspection|null=inspected){
  return designMode==='new'||!evidence?[]:createExtractedPages(evidence,name.trim()||extractedName(evidence));
 }
 function automaticallyOptimizeMetadata(generated:GeneratedPage[]):GeneratedPage[]{
  return generated.map(page=>{
   const doc=new DOMParser().parseFromString(page.html,'text/html');
   const heading=(doc.querySelector('h1')?.textContent||page.title||name).trim().slice(0,90);
   const description=(doc.querySelector('main p')?.textContent||brief||name+' website').replace(/\\s+/g,' ').trim().slice(0,155);
   if(!doc.title.trim())doc.title=heading;
   let meta=doc.head.querySelector('meta[name="description"]');
   if(!meta){meta=doc.createElement('meta');meta.setAttribute('name','description');doc.head.appendChild(meta)}
   if(!meta.getAttribute('content')?.trim())meta.setAttribute('content',description);
   if(!doc.head.querySelector('meta[name="viewport"]')){const viewport=doc.createElement('meta');viewport.setAttribute('name','viewport');viewport.setAttribute('content','width=device-width,initial-scale=1');doc.head.appendChild(viewport)}
   return {...page,html:'<!doctype html>\n'+doc.documentElement.outerHTML};
  });
 }
 function automaticallyApplyBrand(pagesToStyle:GeneratedPage[],appearance:StyleReference=referenceStyle):GeneratedPage[]{
  return designMode==='inspired'?applyReferenceAppearance(pagesToStyle,appearance):pagesToStyle;
 }
 async function generate(){
  if(busy||researchBusy)return;
  setBusy(true);
  try{
   let evidence=inspected;
   if(designMode!=='new'&&!evidence&&!referenceMarkup.trim()){evidence=await inspectWebsite();if(!evidence)return}
   const generationEpoch=inspectionEpoch.current;
   const generationName=!inspected&&evidence?extractedName(evidence):name.trim()||(evidence?extractedName(evidence):'');
   if(generationName.length<2){setStatus('Enter your business name to get started.');return}
   setStatus('Building your website and choosing its design automatically…');
   const sourceBrief=designMode!=='new'&&evidence?[evidence.url,evidence.title,evidence.description,...evidence.headings.slice(0,3),...(evidence.pageSummaries||[]).flatMap(page=>[page.description,...page.headings.slice(0,2)])].filter(Boolean).join('. ').slice(0,1500):'';
   const effectiveBrief=!inspected&&evidence?sourceBrief:brief.trim()||sourceBrief;
   const inferred=infer(generationName,effectiveBrief);let recognizedActivity=false;
   if(!/(?:^|\n)\s*(?:industry|business type|category)\s*:/i.test(effectiveBrief)&&(inferred.industry==='Professional services'||effectiveBrief.trim().length>=15)){
    setStatus('Understanding your business and its specific niche…');
    let identified=false,recognitionAnswered=false;
    try{
     const response=await fetch('/api/business/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessName:generationName,brief:effectiveBrief}),signal:AbortSignal.timeout(35000)});
     if(response.ok){recognitionAnswered=true;const recognized=BusinessRecognitionSchema.parse(await response.json().then(({provider,...identity})=>identity));if(recognized.status==='identified'){identified=true;recognizedActivity=true;inferred.industry=recognized.industry;if(recognized.services.length&&!/(?:^|\n)\s*(?:services|products|offerings|menu)\s*:/i.test(effectiveBrief))inferred.services=recognized.services}else{inferred.industry='Professional services'}}
    }catch{}
    if(!identified&&!recognitionAnswered&&inferBusinessIndustry(generationName,'')==='Professional services'){const activity=literalBusinessActivity(effectiveBrief);if(activity){inferred.industry=activity;if(!/(?:^|\n)\s*(?:services|products|offerings|menu)\s*:/i.test(effectiveBrief))inferred.services=['Explore '+activity.slice(0,60).toLowerCase(),'About our business','Contact the team']}}
   }
   if(inferred.industry==='Professional services'){setStatus('Tell Forge what this business does so its design, images and 3D experience can match. For example: Industry: Soccer club; Offerings: Training, Teamwear, Match tickets.');return}
   if(generationEpoch!==inspectionEpoch.current){setStatus('Website address changed during generation. Generate again using the current website.');return}
   const explicitIndustry=/(?:^|\n)\s*(?:industry|business type|category)\s*:/i.test(effectiveBrief);
   const explicitOfferings=/(?:^|\n)\s*(?:services|products|offerings|menu)\s*:/i.test(effectiveBrief);
   const intelligence=evidence&&designMode!=='new'?analyzeSiteEvidence(evidence):null;
   const researchedServices=evidence&&designMode!=='new'?[...evidence.headings,...(evidence.pageSummaries||[]).flatMap(page=>[page.label,...page.headings])].map(heading=>heading.replace(/\s+/g,' ').trim()).filter(heading=>heading.length>=5&&heading.length<=65&&!/^(home|about|contact|welcome|menu|explore|learn more|our story)$/i.test(heading)).filter((heading,index,all)=>all.findIndex(other=>other.toLowerCase()===heading.toLowerCase())===index).slice(0,3):[];
   const appearance={...referenceStyle,...evidence?.styleReference,...parseStyleReference(referenceMarkup)};
   const input={...inferred,experienceStyle,visualAssets:[] as VisualAsset[],...(intelligence&&intelligence.confidence!=='low'?{...(!explicitIndustry&&!recognizedActivity?{industry:intelligence.industry}:{}),...(!explicitOfferings?{services:intelligence.services}:{})}:{}),...(!explicitOfferings&&researchedServices.length>=2?{services:researchedServices}:{}),designMode,...(designMode!=='new'&&evidence?.visualSignals?{visualSignals:evidence.visualSignals}:{}),...(contactEmail.trim()?{contactEmail:contactEmail.trim()}:{}),...(designMode==='inspired'?{styleReference:appearance}:{})};
   let visualNotice='';
   if(!industryPhotos(input.industry).length){
    setStatus('Finding images that match '+input.industry+'…');
    try{const response=await fetch('/api/business/visuals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({industry:input.industry}),signal:AbortSignal.timeout(5500)});if(response.ok){const research=await response.json();input.visualAssets=(research.assets||[]).flatMap((asset:unknown)=>{const parsed=VisualAssetSchema.safeParse(asset);return parsed.success?[parsed.data]:[]}).slice(0,10)}}catch{}
    if(!input.visualAssets.length)visualNotice=' No relevant stock images could be verified for this niche; add business imagery rather than an unrelated substitute.';
   }
   if(generationEpoch!==inspectionEpoch.current){setStatus('Website address changed during generation. Generate again using the current website.');return}
   while(JSON.stringify(input).length>7500&&input.visualAssets.length)input.visualAssets.pop();
   const response=await fetch('/api/ai/business',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(75000)});
   if(response.status===429){const retrySeconds=Math.min(30,Math.max(1,Number(response.headers.get('retry-after'))||5));setStatus('AI is processing other websites. Please retry in about '+retrySeconds+' seconds.');return}
   if(!response.ok){const failure=await response.json();throw Error(response.status===503?'Website generation is temporarily unavailable. Please try again.':failure.error||'AI generation unavailable')}
   const result=await response.json();if(generationEpoch!==inspectionEpoch.current){setStatus('Website address changed during generation. Generate again using the current website.');return}const extractedPages=additionalPages(evidence);const extras=applyExtractedExperience(extractedPages,experienceStyle,input);const combined=[...result.pages,...extras];const generated=experienceStyle==='immersive'?enhanceImmersiveWorld(combined,input):combined;
   revealGeneratedPreview.current=true;setPages(automaticallyOptimizeMetadata(automaticallyApplyBrand(generated,appearance)));setActive('index');setStatus('Website draft generated for '+input.industry+'. Review its content and design before publishing.'+visualNotice);
  }catch(error){setStatus(error instanceof Error?error.message:'Website generation is temporarily unavailable.')}finally{setBusy(false)}
 }
 return <div className="business-generator forge-auto">
 <header><Link href="/">✦ FORGE STUDIO</Link><strong>AI WEBSITE BUILDER</strong></header>
 <div className="forge-auto-layout">
 <aside className="forge-auto-panel"><div className="eyebrow">YOUR WEBSITE, AUTOMATICALLY</div><h1>Tell us about your business.<br/><em>We build the rest.</em></h1><p>One business name, one generation step. Forge selects industry-relevant photography, page structure and visual direction automatically. Review all facts and images before publishing.</p>
 <fieldset style={{border:'1px solid #99999966',borderRadius:14,padding:16,margin:'18px 0'}}><legend>Choose your website experience</legend><div style={{display:'grid',gap:10}}>{([{value:'standard',title:'Standard website',description:'Clear pages and conventional navigation.'},{value:'cinematic',title:'Cinematic depth & transitions',description:'Layered visuals and transitions between pages.'},{value:'object-navigation',title:'Interactive 3D navigation',description:'Inspect a matching 3D object or explore your offerings in a spatial showroom.'},{value:'immersive',title:'Full immersion',description:'Enter a relevant panoramic setting or spatial gallery and explore page destinations.'}] as const).map(choice=><button key={choice.value} type="button" disabled={busy||researchBusy} aria-pressed={experienceStyle===choice.value} onClick={()=>{if(experienceStyle===choice.value)return;setExperienceStyle(choice.value);setPages([]);setReviewApproved(false);setStatus('')}} style={{textAlign:'left',color:'inherit',padding:'14px 16px',border:experienceStyle===choice.value?'2px solid #c5a775':'1px solid #99999966',borderRadius:10,background:experienceStyle===choice.value?'#c5a77522':'transparent'}}><strong>{choice.title}</strong><span style={{display:'block',fontSize:13,marginTop:5}}>{choice.description}</span></button>)}</div><p className="forge-auto-note">3D is optional. Objects and destinations follow your business theme and supplied offerings. 3D navigation uses matching objects or a showroom of your actual offerings. Immersive spaces use relevant panoramic settings where available, with a spatial gallery for other businesses.</p></fieldset>
 <label>Design approach<select disabled={busy||researchBusy} value={designMode} onChange={e=>{setDesignMode(e.target.value as 'new'|'inspired'|'redesign');setWorkerEvidence(null);setWorkerEvidenceText('');setPages([])}}><option value="new">Create a completely new website</option><option value="inspired">Preserve an existing site's visual style</option><option value="redesign">Fully redesign an existing site</option></select></label>
 {designMode!=='new'&&<><label>Existing website address<input type="url" value={siteUrl} onChange={e=>{updateWebsiteAddress(e.target.value)}} placeholder="e.g. disney.com"/></label><button type="button" disabled={researchBusy||busy} onClick={()=>void inspectWebsite()}>{researchBusy?'Inspecting website…':designMode==='inspired'?'Extract website appearance':'Extract website details for redesign'}</button><details className="forge-auto-advanced"><summary>Optional: paste existing HTML/CSS instead</summary><textarea rows={4} value={referenceMarkup} onChange={e=>setReferenceMarkup(e.target.value)} placeholder="Paste saved HTML with embedded CSS"/></details><p className="forge-auto-note">Forge inspects public homepage metadata and limited embedded styling. It does not copy proprietary images, source code or entire layouts. Verify details before publishing.</p></>}
 {designMode!=='new'&&inspected&&<p className="forge-auto-note" role="status">Website extracted: {new URL(inspected.url).hostname}. Ready to generate; you do not need to extract it again.</p>}
 {designMode!=='new'&&inspectionError&&<p className="forge-auto-note" role="alert">{inspectionError}</p>}

 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Review evidence-grounded website proposal</summary>{(()=>{try{const evidence=inspectionToBrowserEvidence(inspected);const proposal=proposeBusinessSiteFromCapture(evidence);return <div className="forge-auto-note"><p><strong>Proposed business name:</strong> {proposal.businessName}</p><p><strong>Observed headings:</strong> {proposal.observedHeadings.join(' · ')||'None'}</p><p><strong>Verified business facts required:</strong> {proposal.missingRequiredFields.join(', ')}</p><p><strong>Captured navigation:</strong> {proposal.navigation.length} unverified links</p><p><strong>Publishing:</strong> blocked until owner review and approval</p><p>{proposal.warnings.join(' ')}</p></div>}catch{return <p className="forge-auto-note">This inspection cannot be converted into a trusted evidence proposal. Verify the source URL and try again.</p>}})()}</details>}
 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Generate from reviewed website evidence</summary><p className="forge-auto-note">This option uses metadata evidence only, not screenshot reconstruction. Enter verified facts before generating.</p><label>Verified industry<input value={reviewIndustry} onChange={e=>{setReviewIndustry(e.target.value);setReviewApproved(false)}} placeholder="e.g. Professional services"/></label><label>Verified services (comma-separated)<textarea rows={3} value={reviewServices} onChange={e=>{setReviewServices(e.target.value);setReviewApproved(false)}} placeholder="e.g. Consulting, Support"/></label><label><input type="checkbox" checked={reviewApproved} onChange={e=>setReviewApproved(e.target.checked)}/> I have reviewed the extracted business name, description above, industry and services.</label><button type="button" disabled={!reviewApproved} onClick={generateFromReviewedEvidence}>Generate reviewed four-page draft</button></details>}
 {designMode!=='new'&&<details className="forge-auto-advanced"><summary>Import optional browser-verification evidence</summary><p>Paste the JSON evidence from an authorized Forge browser-capture worker. Evidence is analyzed locally in this review; it does not publish or modify a website.</p><textarea rows={4} aria-label="Browser verification JSON" value={workerEvidenceText} onChange={e=>{setWorkerEvidenceText(e.target.value);setWorkerEvidence(null);setCapturePreview([]);setWorkerEvidenceError('')}} placeholder='{"version":1,"sourceUrl":"https://example.com",...}'/><button type="button" onClick={()=>{try{const parsed:unknown=JSON.parse(workerEvidenceText);if(!validateBrowserEvidence(parsed))throw Error('Invalid or unsupported browser evidence');if(siteUrl.trim()){const expected=new URL(siteUrl.startsWith('http')?siteUrl:'https://'+siteUrl);if(new URL(parsed.sourceUrl).hostname!==expected.hostname)throw Error('Evidence host must match the inspected website host');}setWorkerEvidence(parsed);setCapturePreview([]);setWorkerEvidenceError('')}catch(error){setWorkerEvidence(null);setCapturePreview([]);setWorkerEvidenceError(error instanceof Error?error.message:'Invalid JSON')}}}>Review browser evidence</button>{workerEvidenceError&&<p role="alert">{workerEvidenceError}</p>}{workerEvidence&&<button type="button" onClick={()=>{try{setCapturePreview(capturePreviewPages(workerEvidence));setCapturePreviewIndex(0)}catch(error){setWorkerEvidenceError(error instanceof Error?error.message:'Preview unavailable')}}}>Preview captured layout (review only)</button>}{capturePreview.length>0&&<div><p>Unverified layout preview. This does not change the generated pages or authorize publication.</p>{capturePreview.length>1&&<label>Captured page <select value={capturePreviewIndex} onChange={e=>setCapturePreviewIndex(Number(e.target.value))}>{capturePreview.map((page,index)=><option key={page.slug} value={index}>{page.title}</option>)}</select></label>}<iframe title="Captured website layout preview" sandbox="" srcDoc={capturePreview[capturePreviewIndex]?.html||''} style={{width:'100%',height:460,border:'1px solid #aaa'}}/></div>}{workerEvidence&&<div role="status"><strong>Browser navigation checks:</strong> {navigationQualityRecommendations(workerEvidence).inspected} inspected. <strong>Status:</strong> {navigationQualityRecommendations(workerEvidence).status}. {navigationQualityRecommendations(workerEvidence).recommendations.map((item,index)=><p key={index}>{item.finding}. {item.action}</p>)}<p>Source-site navigation only. Form submissions, button behavior and generated pages remain unverified.</p></div>}</details>}
 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Website verification coverage</summary><p><strong>Inspected metadata:</strong> {inspected.pageSummaries?.length||0} linked pages with extracted summaries.</p><p><strong>Browser navigation:</strong> Not tested in this inspection. Link discovery does not establish that a destination works.</p><p><strong>Buttons and forms:</strong> Not tested. Submissions, authentication, payments and other interactive functions require separate verification.</p><p><strong>Visual reconstruction:</strong> Not verified against browser screenshots.</p><p>Generate a review-only draft, then verify its links, content and behavior before publication.</p></details>}
 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>View extracted website research (optional)</summary><div className="forge-auto-note"><strong>Extracted from {inspected.url}</strong><p>Title: {inspected.title||'Unavailable'}</p><p>Description: {inspected.description||'Unavailable'}</p><p>Headings: {inspected.headings.slice(0,3).join(' · ')||'Unavailable'}</p><p>Discovered page links: {inspected.navigation?.length||0}. {inspected.navigation?.slice(0,5).map(item=>item.label).join(' · ')||'None identified'}. Successfully inspected: {inspected.pageSummaries?.length||0}. Intelligence: {analyzeSiteEvidence(inspected).industry} ({analyzeSiteEvidence(inspected).confidence} confidence). Coverage: {inspectionCoverage(inspected).internalPages} internal pages; browser-rendered visuals not yet inspected. Pages have not yet been reconstructed.</p>{inspected.pageSummaries?.map(page=><p key={page.path}><strong>{page.label}:</strong> {page.title} — {page.description||page.headings.slice(0,2).join(' · ')||'No readable summary'}</p>)}<p>Visual style: {referenceStyle.background||'No background detected'} / {referenceStyle.accent||'No accent detected'}. Stylesheets inspected: {inspected.stylesheetsRead}. {inspected.visualSignals&&<span> Structure: {inspected.visualSignals.sectionCount} sections, {inspected.visualSignals.imageCount} images, {inspected.visualSignals.buttonCount} buttons, {inspected.visualSignals.heroSections} hero markers.</span>}</p></div></details>}
 <label>Business name<input autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Northstar Coffee"/></label>
 <label>What does your business do? <span className="optional">(needed when the name is unclear)</span><textarea rows={5} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe what you offer, who you serve and what makes you different."/></label>
 <details className="forge-auto-advanced"><summary>Add contact information (recommended before publishing)</summary><label>Business email<input type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="hello@yourbusiness.com"/></label></details>
 <button className="forge-auto-cta" onClick={()=>void generate()} disabled={busy||researchBusy}>{researchBusy?'Reading website…':busy?'Creating your website…':'✦ Generate my website'}</button>

 {status&&<p role="status" className="forge-auto-status">{status}</p>}
 <p className="forge-auto-note">For the best results, include your products, services and atmosphere. Business-specific visuals are selected automatically. Automatically generates Home, Services, About and Contact pages.</p>
 {pages.length>0&&<div role="status" className="forge-auto-note"><strong>Automatic website check:</strong> {draftAudit?.readyForReview?'Ready for your review':'Needs corrections before publishing'}{(draftAudit?.errors.length??0)>0&&<p>{draftAudit?.errors.slice(0,3).join(' · ')}</p>}<button type="button" onClick={()=>setShowAdvancedReview(value=>!value)} aria-expanded={showAdvancedReview}>{showAdvancedReview?'Hide technical check details':'Show technical check details'}</button>{showAdvancedReview&&<p>{draftAudit?.errors.length} errors · {draftAudit?.warnings.length} warnings. Publishing has not been verified.</p>}</div>}
 {pages.length>0&&<div className="forge-auto-note"><label>Existing publication ID (optional, to save a new revision)<input value={revisionId} onChange={e=>{setRevisionId(e.target.value);setPublishApproved(false)}} placeholder="Publication UUID, leave blank for a new website"/></label><label>Current publication version (required for revisions)<input type="number" min="1" step="1" value={revisionVersion} onChange={e=>{setRevisionVersion(e.target.value);setPublishApproved(false)}} placeholder="Check saved versions in Manage published websites"/></label><button type="button" onClick={()=>void loadCurrentPublicationVersion()} disabled={!revisionId.trim()}>Load current publication version</button><label><input type="checkbox" checked={publishApproved} onChange={e=>setPublishApproved(e.target.checked)}/> I reviewed every generated page and approve publishing this business website.</label><button type="button" disabled={!publishApproved||!draftAudit?.readyForReview||publishBusy||(!!revisionId.trim()&&(!Number.isSafeInteger(Number(revisionVersion))||Number(revisionVersion)<1))} onClick={()=>void publishReviewedDraft()}>{publishBusy?"Publishing…":"Publish approved draft (if enabled)"}</button>{publishedUrls.map(url=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">View published page: {url}</a></p>)}<p>Publishing requires sign-in and server configuration; it is disabled by default.</p></div>}
 {pages.length>0&&<div className="forge-auto-export"><button onClick={()=>pages.forEach(p=>downloadText(p.slug+'.html',p.html,'text/html'))}>↓ Download website pages</button><Link href="/business/publications">Manage published websites ↗</Link></div>}
 <p><Link href="/redesign" style={{color:"#eac9a0",fontWeight:700}}>✦ Score a website & plan an intelligent redesign →</Link></p>
 <details className="forge-auto-advanced"><summary>Advanced editing and intelligence tools</summary><div><Link href="/editor">Visual editor</Link><Link href="/intelligence">Intelligence</Link><Link href="/assets">Asset library</Link></div></details>
 </aside>
 <main className="forge-auto-preview"><div className="forge-auto-toolbar"><span>● LIVE WEBSITE PREVIEW · {mobile?"390px mobile":"Full-width desktop"}</span><div><button type="button" onClick={()=>setMobile(false)} aria-pressed={!mobile} aria-label="Switch to full-width desktop website preview">Desktop</button><button type="button" onClick={()=>setMobile(true)} aria-pressed={mobile} aria-label="Switch to 390 pixel mobile website preview">Mobile</button></div></div>
 {pages.length>0?<><div className="forge-auto-quick-edit"><label>Page headline <input aria-label="Edit current page headline" value={headingEdit} onChange={e=>setHeadingEdit(e.target.value)} maxLength={120}/></label><button type="button" onClick={saveHeading}>Apply headline</button><label>Section heading <input aria-label="Edit current page section heading" value={subheadingEdit} onChange={e=>setSubheadingEdit(e.target.value)} maxLength={160}/></label><button type="button" onClick={saveSubheading} disabled={!subheadingEdit.trim()}>Apply section heading</button><label>Page description <textarea aria-label="Edit current page description" rows={2} value={paragraphEdit} onChange={e=>setParagraphEdit(e.target.value)} maxLength={600}/></label><button type="button" onClick={saveParagraph} disabled={!paragraphEdit.trim()}>Apply description</button><label>Brand accent <input type="color" aria-label="Choose brand accent" value={quickAccent} onChange={e=>setQuickAccent(e.target.value)}/></label><button type="button" onClick={applyAccent}>Apply brand color to all pages</button><label>Layout spacing <select aria-label="Choose layout spacing" value={layoutChoice} onChange={e=>applyLayout(e.target.value as 'spacious'|'compact')}><option value="spacious">Spacious</option><option value="compact">Compact</option></select></label><button type="button" disabled={!undoPages} onClick={undoLastEdit}>Undo last edit</button></div><nav className="forge-auto-tabs" aria-label="Website pages">{pages.map(p=><button key={p.slug} aria-current={active===p.slug?'page':undefined} onClick={()=>{revealPreview();setPreviewAnchor('');setActive(p.slug)}}>{p.title}</button>)}</nav><div className={'forge-auto-frame '+(mobile?'mobile':'')}><iframe ref={frameRef} title={'Website preview: '+(current?.title||'Home')} sandbox="allow-scripts" srcDoc={previewHtml}/></div></>:<div className="forge-auto-placeholder"><div className="forge-auto-orb">✦</div><span>THE NEXT GENERATION OF WEBSITES</span><h2>Beautiful by default.<br/>Built around your brand.</h2><p>Your website preview will appear here, ready to explore.</p></div>}
 </main></div></div>
}
