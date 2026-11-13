'use client';
import {matchingSourceBusiness,resolveGenerationSourceMode} from '../../lib/source-reuse-policy';
import {parseGeneratorEditorState,serializeGeneratorEditorState} from '../../lib/editor-generator-state';
import {extractWebsiteDesignDna,mergeSourcePageImages,type WebsiteDesignDna,type SourceImage} from '../../lib/website-design-dna';
import {applySourceDesign} from '../../lib/apply-source-design';
import {businessGenerationPayload} from '../../lib/business-generation-payload';
import {DESIGN_PATTERNS,planAdaptiveDesign} from '../../lib/design-engine';
import {BusinessRecognitionSchema,literalBusinessActivity} from '../../lib/business-recognition';
import {businessPreviewHtml} from '../../lib/business-preview';
import {industryPhotos,offeringPhotoCandidates} from '../../lib/industry-photos';
import {ensurePagePhotography} from '../../lib/ensure-page-photography';
import {enrichGeneratedBusinessPages} from '../../lib/premium-page-composition';
import {VisualAssetSchema,specificVisualOfferings,type VisualAsset} from '../../lib/visual-assets';
import {enhanceImmersiveWorld} from '../../lib/immersive-world';
import {createExtractedPages,applyExtractedExperience,extractedPageSources} from '../../lib/extracted-pages';
import {applyReferenceAppearance,websiteAddressKey} from '../../lib/reference-appearance';
import {applyDefaultSourceContent} from '../../lib/default-source-content';
import {applyCapturedAppearance} from '../../lib/captured-appearance';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {generateBusinessWebsite,type GeneratedPage} from '../../lib/business-site';
import {auditGeneratedDraft} from '../../lib/draft-quality-gate';
import {validateBusinessPublicationRequest} from '../../lib/business-publication-request';
import {validateBrowserEvidence} from '../../lib/browser-evidence';
import {capturePreviewPages} from '../../lib/capture-preview';
import {navigationQualityRecommendations} from '../../lib/navigation-quality-recommendations';
import type {BrowserEvidence} from '../../lib/browser-evidence';

import {portableStaticSiteLinks} from '../../lib/portable-static-site-links';
import {inferBusinessIndustry} from '../../lib/website-experience';
import {inferBusinessBrief as infer,normalizeBusinessBrief,normalizeBusinessOfferings} from '../../lib/business-brief';
import {analyzeSiteEvidence,inspectionCoverage} from '../../lib/forge-intelligence';
import {inspectionToBrowserEvidence} from '../../lib/inspection-evidence-adapter';
import {proposeBusinessSiteFromCapture,generateReviewedCaptureSite} from '../../lib/capture-business-proposal';
import type {WebsiteExperience} from '../../lib/website-experience';
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
type Inspection={url:string;title:string;description:string;headings:string[];homepageParagraphs?:string[];navigation?:{label:string;path:string}[];pageSummaries?:{path:string;label:string;title:string;description:string;headings:string[];paragraphs?:string[];images?:SourceImage[]}[];stylesheetsRead:number;visualSignals?:{navigationLinks:number;heroSections:number;imageCount:number;sectionCount:number;buttonCount:number;hasVideo:boolean;hasCanvas:boolean}} & {styleReference?:StyleReference;designDna?:WebsiteDesignDna;warnings?:string[];browserEvidence?:BrowserEvidence};
export default function BusinessGenerator(){
 const [inspected,setInspected]=useState<Inspection|null>(null),[siteUrl,setSiteUrl]=useState(''),[researchBusy,setResearchBusy]=useState(false),[referenceStyle,setReferenceStyle]=useState<StyleReference>({}),[name,setName]=useState(''),[designMode,setDesignMode]=useState<'new'|'inspired'|'redesign'>('new'),[referenceMarkup,setReferenceMarkup]=useState(''),[brief,setBrief]=useState(''),[contactEmail,setContactEmail]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[pages,setPages]=useState<GeneratedPage[]>([]),[active,setActive]=useState('index'),[mobile,setMobile]=useState(false);
 const [inspectionError,setInspectionError]=useState('');
 const [previewHeight,setPreviewHeight]=useState<number|null>(null);
 // Start the editor in mobile preview on narrow screens while retaining the
 // user's explicit desktop/mobile toolbar choice afterward.
 useEffect(()=>{if(window.matchMedia('(max-width:700px)').matches)setMobile(true)},[]);
 useEffect(()=>{try{const raw=sessionStorage.getItem('forge:visual-editor:return');if(!raw)return;sessionStorage.removeItem('forge:visual-editor:return');const siteRaw=sessionStorage.getItem('forge:visual-editor:site');sessionStorage.removeItem('forge:visual-editor:site');const contextRaw=sessionStorage.getItem('forge:visual-editor:context');sessionStorage.removeItem('forge:visual-editor:context');if(raw.length>2_000_000||!siteRaw||siteRaw.length>8_000_000){setStatus('Edited page could not be restored safely.');return}const edited=JSON.parse(raw) as GeneratedPage;const original=JSON.parse(siteRaw) as GeneratedPage[];if(!Array.isArray(original)||!original.length||original.length>30||original.some(p=>typeof p.slug!=='string'||typeof p.title!=='string'||typeof p.html!=='string')||typeof edited.slug!=='string'||typeof edited.html!=='string'||!original.some(p=>p.slug===edited.slug)){setStatus('Invalid edited website data.');return}setPages(original.map(p=>p.slug===edited.slug?edited:p));setActive(edited.slug);const context=parseGeneratorEditorState(contextRaw);if(context){setName(context.name);setBrief(context.brief);setContactEmail(context.contactEmail);setSiteUrl(context.siteUrl);siteAddressRef.current=context.siteUrl;setReferenceMarkup(context.referenceMarkup);setDesignMode(context.designMode);setExperienceStyle(context.experienceStyle==='object-navigation'?'immersive':context.experienceStyle);setVisualDesignMode(context.visualDesignMode);setVisualPatternId(context.visualPatternId);setAutoImmersive(context.experienceStyle==='immersive'||context.experienceStyle==='object-navigation');setReviewIndustry(context.reviewIndustry);setReviewServices(context.reviewServices)}setStatus('Edited page restored. Review the entire website and run quality checks before publishing.'+(contextRaw&&!context?' Business setup could not be restored; re-enter it before regenerating.':''))}catch{setStatus('Unable to restore edited website.')}},[]);

 const inspectionEpoch=useRef(0),inspectionController=useRef<AbortController|null>(null),siteAddressRef=useRef('');
 useEffect(()=>()=>{inspectionEpoch.current++;inspectionController.current?.abort()},[]);
 function updateWebsiteAddress(value:string){
  if(websiteAddressKey(value)!==websiteAddressKey(siteAddressRef.current)){
   inspectionEpoch.current++;inspectionController.current?.abort();setResearchBusy(false);setInspected(null);setInspectionError('');setReferenceStyle({});setWorkerEvidence(null);setWorkerEvidenceText('');setPages([]);
  }
  siteAddressRef.current=value;setSiteUrl(value);
 }
 function extractedName(evidence:Inspection){return evidence.designDna?.businessName||evidence.title.split(/[|—–]/)[0].trim().slice(0,100)||new URL(evidence.url).hostname}
 const [previewAnchor,setPreviewAnchor]=useState('');
 const [experienceStyle,setExperienceStyle]=useState<WebsiteExperience>('standard');
 const [visualDesignMode,setVisualDesignMode]=useState<'auto'|'library'>('auto');
 const [visualPatternId,setVisualPatternId]=useState('adaptive-general');
 const [autoImmersive,setAutoImmersive]=useState(false);
 const [workerEvidenceText,setWorkerEvidenceText]=useState(''),[workerEvidence,setWorkerEvidence]=useState<BrowserEvidence|null>(null),[workerEvidenceError,setWorkerEvidenceError]=useState(''),[capturePreview,setCapturePreview]=useState<GeneratedPage[]>([]),[capturePreviewIndex,setCapturePreviewIndex]=useState(0);
 const [revisionVersion,setRevisionVersion]=useState(''),[revisionId,setRevisionId]=useState(''),[publishApproved,setPublishApproved]=useState(false),[publishBusy,setPublishBusy]=useState(false),[publishedUrls,setPublishedUrls]=useState<string[]>([]);
 const [reviewIndustry,setReviewIndustry]=useState(''),[reviewServices,setReviewServices]=useState(''),[reviewApproved,setReviewApproved]=useState(false);
 // Any change to the reviewed facts or source invalidates prior approval.
 useEffect(()=>{setReviewApproved(false)},[inspected,designMode,name,brief,contactEmail,reviewIndustry,reviewServices,siteUrl]);
 const frameRef=useRef<HTMLIFrameElement>(null);
 const revealGeneratedPreview=useRef(false);
 const revealPreview=()=>frameRef.current?.scrollIntoView({block:'start',behavior:'instant'});
 useEffect(()=>{if(revealGeneratedPreview.current&&pages.length){revealGeneratedPreview.current=false;revealPreview()}},[pages]);
 useEffect(()=>{setPreviewHeight(null)},[pages,active,mobile]);
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.source!==frameRef.current?.contentWindow||!event.data)return;
   if(event.data.type==='forge-preview-height'){
    const measured=event.data.height;
    if(mobile&&event.data.slug===active&&typeof measured==='number'&&Number.isFinite(measured)&&measured>=300&&measured<=20000){
     const bounded=Math.min(4200,Math.max(700,Math.ceil(measured)+20));
     setPreviewHeight(previous=>previous===bounded?previous:bounded);
    }
    return;
   }
   if(event.data.type!=='forge-preview-navigate'||typeof event.data.slug!=='string')return;
   const slug=event.data.slug;
   if(pages.some(page=>page.slug===slug)){
    revealPreview();
    setPreviewAnchor(typeof event.data.hash==='string'&&/^#[a-z0-9_-]{1,100}$/i.test(event.data.hash)?event.data.hash:'');
    setActive(slug);
   }
  };
  window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
 },[pages,active,mobile]);
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
  const publication=validateBusinessPublicationRequest({ownerApproved:true,businessName:name.trim(),pages});
  if(!publication.valid){setStatus('This draft cannot be hosted yet: '+publication.errors.slice(0,2).join('; '));return}
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
 const draftAudit=useMemo(()=>pages.length?auditGeneratedDraft(pages):null,[pages]);
 const publicationCheck=useMemo(()=>pages.length?validateBusinessPublicationRequest({ownerApproved:true,businessName:name.trim(),pages}):null,[pages,name]);
 async function downloadWebsiteZip(){
  if(!draftAudit?.readyForReview){setStatus('Website download blocked: '+(draftAudit?.errors.slice(0,3).join('; ')||'Generate and review the pages first.'));return}
  try{
   if(pages.length>30)throw Error('Website exceeds the download page limit.');
   const {zipSync,strToU8}=await import('fflate');
   let totalBytes=0;
   const entries=pages.map(page=>{
    const html=portableStaticSiteLinks(page.html,pages);
    const bytes=strToU8(html);
    totalBytes+=bytes.length;
    if(totalBytes>8_000_000)throw Error('Website exceeds the 8 MB HTML download budget. Remove excess page content.');
    return [page.slug+'.html',bytes] as const;
   });
   const compressed=zipSync(Object.fromEntries(entries),{level:6});
   const objectUrl=URL.createObjectURL(new Blob([new Uint8Array(compressed).buffer],{type:'application/zip'}));
   const link=document.createElement('a');link.href=objectUrl;link.download='forge-website.zip';
   document.body.appendChild(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(objectUrl),2000);
   setStatus('Complete '+pages.length+'-page website ZIP downloaded. Verify images and external links before publishing.');
  }catch(error){setStatus('Website download failed: '+(error instanceof Error?error.message:'Unable to package website'))}
 }

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
   const evidence:Inspection={browserEvidence:validateBrowserEvidence(data.browserEvidence)?data.browserEvidence:undefined,url:new URL(data.url||websiteAddressKey(requested)!).href,title:data.title||'',description:data.description||'',headings:data.headings||[],navigation:data.navigation||[],pageSummaries:data.pageSummaries||[],stylesheetsRead:data.stylesheetsRead||0,visualSignals:data.visualSignals,styleReference:data.styleReference||{},designDna:data.designDna,warnings:data.warnings||data.extraction?.warnings||[]};
   setInspected(evidence);setReferenceStyle(evidence.styleReference||{});setReferenceMarkup('');setUndoPages(null);setPages([]);setName(extractedName(evidence));setBrief([evidence.description,...evidence.headings.slice(0,3)].filter(Boolean).join('. ').slice(0,1600));
   if(!contactEmail.trim()&&evidence.designDna?.contact.emails[0])setContactEmail(evidence.designDna.contact.emails[0]);
   setStatus('Website extracted: '+new URL(evidence.url).hostname+'. '+(data.styleFound?'Appearance tokens found. ':'No reusable appearance tokens found; your draft will use a new theme. ')+'Review the extracted details, then generate. '+(evidence.warnings||[]).join(' '));
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
 function additionalPages(evidence:Inspection|null=inspected,mode:'new'|'inspired'|'redesign'=designMode){
  return mode==='new'||!evidence?[]:createExtractedPages(evidence,name.trim()||extractedName(evidence));
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
 function automaticallyApplyBrand(pagesToStyle:GeneratedPage[],appearance:StyleReference=referenceStyle,mode:'new'|'inspired'|'redesign'=designMode):GeneratedPage[]{
  return mode==='inspired'?applyReferenceAppearance(pagesToStyle,appearance):pagesToStyle;
 }
 async function generate(){
  if(busy||researchBusy)return;
  setBusy(true);
  try{
   let evidence=designMode==='new'?null:inspected;
   if(designMode!=='new'&&!evidence&&!referenceMarkup.trim()){evidence=await inspectWebsite();if(!evidence)return}
   const sourceDecision=resolveGenerationSourceMode(designMode,name.trim(),evidence?extractedName(evidence):null);
   const generationMode=sourceDecision.mode;
   const discardedSourceName=sourceDecision.discardUnrelatedSource&&evidence?extractedName(evidence):'';
   const sourceDefaultBrief=evidence?[evidence.description,...evidence.headings.slice(0,3)].filter(Boolean).join('. ').slice(0,1600):'';
   const sourceContactEmail=evidence?.designDna?.contact.emails[0]?.trim()||'';
   const generationBrief=discardedSourceName&&brief.trim()===sourceDefaultBrief.trim()?name.trim():brief.trim();
   const generationContactEmail=discardedSourceName&&sourceContactEmail.toLowerCase()===contactEmail.trim().toLowerCase()?'':contactEmail.trim();
   if(discardedSourceName){
    // The user has supplied a different business. Keep the new name and brief,
    // but never import unrelated source style, logos, navigation or contact.
    inspectionEpoch.current++;inspectionController.current?.abort();
    evidence=null;siteAddressRef.current='';
    setDesignMode('new');setInspected(null);setSiteUrl('');setReferenceMarkup('');
    setReferenceStyle({});setWorkerEvidence(null);setWorkerEvidenceText('');
    setReviewApproved(false);setReviewIndustry('');setReviewServices('');
    setInspectionError('');setPages([]);
    if(generationBrief!==brief.trim())setBrief(generationBrief);
    if(generationContactEmail!==contactEmail.trim())setContactEmail(generationContactEmail);
   }
   const generationEpoch=inspectionEpoch.current;
   const homepageDna=generationMode!=='new'?(evidence?.designDna||(referenceMarkup.trim()?extractWebsiteDesignDna(referenceMarkup,websiteAddressKey(siteUrl)||'https://source.invalid/'):undefined)):undefined;
   const sourceDna=homepageDna&&evidence?mergeSourcePageImages(homepageDna,evidence.pageSummaries||[]):homepageDna;
   const generationName=!inspected&&evidence?extractedName(evidence):name.trim()||(evidence?extractedName(evidence):'');
   if(generationName.length<2){setStatus('Enter your business name to get started.');return}
   setStatus('Building your website and choosing its design automatically…');
   const sourceBrief=generationMode!=='new'&&evidence?[evidence.url,evidence.title,evidence.description,...evidence.headings.slice(0,3),...(evidence.pageSummaries||[]).flatMap(page=>[page.description,...page.headings.slice(0,2)])].filter(Boolean).join('. ').slice(0,1500):'';
   const effectiveBrief=normalizeBusinessBrief(!inspected&&evidence?sourceBrief:generationBrief||sourceBrief);
   const inferred=infer(generationName,effectiveBrief);let recognizedActivity=false;
   if(!/(?:^|\n)\s*(?:industry|business type|category)\s*:/i.test(effectiveBrief)){
    setStatus('Understanding your business and its specific niche…');
    let identified=false,recognitionAnswered=false;
    try{
     const response=await fetch('/api/business/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessName:generationName,brief:effectiveBrief.slice(0,1800)}),signal:AbortSignal.timeout(35000)});
     if(response.ok){recognitionAnswered=true;const recognized=BusinessRecognitionSchema.parse(await response.json().then(({provider,...identity})=>identity));if(recognized.status==='identified'){identified=true;recognizedActivity=true;inferred.industry=recognized.industry;if(recognized.services.length&&!/(?:^|\n)\s*(?:services|products|offerings|menu)\s*:/i.test(effectiveBrief))inferred.services=recognized.services}}
    }catch{}
    if(!identified&&!recognitionAnswered&&inferBusinessIndustry(generationName,'')==='Professional services'){const activity=literalBusinessActivity(effectiveBrief);if(activity){inferred.industry=activity;if(!/(?:^|\n)\s*(?:services|products|offerings|menu)\s*:/i.test(effectiveBrief))inferred.services=['Explore '+activity.slice(0,60).toLowerCase(),'About our business','Contact the team']}}
   }
   if(inferred.industry==='Professional services'&&!/(?:^|\n)\s*(?:industry|business type|category)\s*:/i.test(effectiveBrief)){setStatus('Tell Forge what this business does so its design, images and 3D experience can match. For example: Industry: Soccer club; Offerings: Training, Teamwear, Match tickets.');return}
   if(generationEpoch!==inspectionEpoch.current){setStatus('Website address changed during generation. Generate again using the current website.');return}
   inferred.services=normalizeBusinessOfferings(inferred.industry,inferred.services);
   const explicitIndustry=/(?:^|\n)\s*(?:industry|business type|category)\s*:/i.test(effectiveBrief);
   const explicitOfferings=/(?:^|\n)\s*(?:services|products|offerings|menu)\s*:/i.test(effectiveBrief);
   const intelligence=evidence&&generationMode!=='new'?analyzeSiteEvidence(evidence):null;
   const appearance={...(generationMode==='new'?{}:referenceStyle),...evidence?.styleReference,...parseStyleReference(generationMode==='new'?'':referenceMarkup)};
   const designDecision=planAdaptiveDesign({businessName:inferred.businessName,industry:inferred.industry,mode:visualDesignMode,patternId:visualDesignMode==='library'?visualPatternId:undefined,immersive3d:autoImmersive});
   const selectedExperience:WebsiteExperience=experienceStyle==='object-navigation'||autoImmersive&&designDecision.immersive3d?'immersive':experienceStyle;
   const input={...inferred,experienceStyle:selectedExperience,visualAssets:[] as VisualAsset[],...(intelligence&&intelligence.confidence!=='low'?{...(!explicitIndustry&&!recognizedActivity?{industry:intelligence.industry}:{}),...(!explicitOfferings&&!recognizedActivity?{services:intelligence.services}:{})}:{}),designMode:generationMode,...(generationMode!=='new'&&evidence?.visualSignals?{visualSignals:evidence.visualSignals}:{}),...(generationContactEmail?{contactEmail:generationContactEmail}:{}),...(generationMode==='inspired'?{styleReference:appearance}:{})};
   input.services=normalizeBusinessOfferings(input.industry,input.services);
   let visualNotice='';
   const missingOfferings=specificVisualOfferings(input.services.filter(service=>!offeringPhotoCandidates(service,input.industry).length));
   if(industryPhotos(input.industry).length<4||missingOfferings.length){
    setStatus('Finding photos for '+input.industry+' and its offerings…');
    try{const response=await fetch('/api/business/visuals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({industry:input.industry,offerings:missingOfferings}),signal:AbortSignal.timeout(5500)});if(response.ok){const research=await response.json();input.visualAssets=(research.assets||[]).flatMap((asset:unknown)=>{const parsed=VisualAssetSchema.safeParse(asset);return parsed.success?[parsed.data]:[]}).slice(0,24)}}catch{}
    if(!input.visualAssets.length&&!industryPhotos(input.industry).length)visualNotice=' No attribution-free photographs could be verified for this niche; add business imagery rather than an unrelated substitute.';
   }
   if(generationEpoch!==inspectionEpoch.current){setStatus('Website address changed during generation. Generate again using the current website.');return}
   const generationPayload={...businessGenerationPayload(input),visualDesignMode,designPatternId:visualDesignMode==='library'?visualPatternId:undefined,immersive3d:autoImmersive};
   if(input.description.length>1800)visualNotice+=' The first 1,800 characters of your description were used for generation.';
   const response=await fetch('/api/ai/business',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(generationPayload),signal:AbortSignal.timeout(75000)});
   if(response.status===429){const retrySeconds=Math.min(30,Math.max(1,Number(response.headers.get('retry-after'))||5));setStatus('AI is processing other websites. Please retry in about '+retrySeconds+' seconds.');return}
   if(!response.ok){const failure=await response.json();throw Error(response.status===503?'Website generation is temporarily unavailable. Please try again.':failure.error||'AI generation unavailable')}
   const result=await response.json();if(generationEpoch!==inspectionEpoch.current){setStatus('Website address changed during generation. Generate again using the current website.');return}const extractedPages=additionalPages(evidence,generationMode);const extras=applyExtractedExperience(extractedPages,selectedExperience,input);const combined=[...result.pages,...extras];
   // A new website must never inherit an unrelated brand or empty AI layout.
   // Recover using the deterministic, niche-specific generator instead of showing
   // scraped third-party pages, mystery URLs or a text-only storefront.
   const foreignBrand=combined.some(page=>/disney(?:\.com|\s+live|\s+logo|\s+exit|\s+world)|you are now leaving disney/i.test(page.html))&&!/disney/i.test(input.businessName+' '+input.industry);
   const hasPhotographs=combined.some(page=>/<img\b[^>]*\bsrc=|<picture\b/i.test(page.html));
      const expectsPhotographs=industryPhotos(input.industry).length>0||input.visualAssets.length>0;
   const needsRecovery=generationMode==='new'&&(foreignBrand||expectsPhotographs&&!hasPhotographs);
   const safePages=needsRecovery?generateBusinessWebsite(input).pages:combined;
   const generated=selectedExperience==='immersive'&&!needsRecovery?enhanceImmersiveWorld(safePages,input):safePages;
   if(needsRecovery)visualNotice+=' Rebuilt the draft using verified business-specific imagery after the AI output failed the brand or image quality check.';
   const contentApplied=applyDefaultSourceContent(generated,evidence,generationMode);
   const themed=automaticallyApplyBrand(contentApplied.pages,appearance,generationMode);
   const sourceApplied=sourceDna?applySourceDesign(themed,sourceDna,generationMode):{pages:themed,warnings:[]};
   const captured=applyCapturedAppearance(sourceApplied.pages,evidence?.browserEvidence||(discardedSourceName?null:workerEvidence),generationMode==='new'?'':evidence?.url||websiteAddressKey(siteUrl)||'',generationMode,extractedPageSources(evidence));
   const photoRepaired=ensurePagePhotography(captured.pages,input.industry,input.visualAssets,input.services);
    const editorialPages=generationMode==='inspired'?photoRepaired:enrichGeneratedBusinessPages(photoRepaired,input);
    const finalPages=automaticallyOptimizeMetadata(editorialPages);
   const validation=auditGeneratedDraft(finalPages);
   if(!validation.readyForReview)throw Error('The generated website did not pass its content and navigation checks. Please retry or review the business details.');
   revealGeneratedPreview.current=true;setPages(finalPages);setActive('index');setStatus('Website draft generated for '+input.industry+'. Review its content and design before publishing.'+visualNotice+(contentApplied.warnings.length?' '+contentApplied.warnings.join(' '):'')+(sourceApplied.warnings.length?' '+sourceApplied.warnings.join(' '):'')+(captured.warnings.length?' '+captured.warnings.join(' '):'')+(discardedSourceName?' A previous inspection of '+discardedSourceName+' was excluded; this is a new business website.':''));
  }catch(error){setStatus(error instanceof Error?error.message:'Website generation is temporarily unavailable.')}finally{setBusy(false)}
 }
 return <div className="business-generator forge-auto">
 <header><Link className="forge-brand" href="/" aria-label="Forge Studio home"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect width="48" height="48" rx="14" fill="#6846cc"/><path d="M15 34V14h20M15 24h15" stroke="white" strokeWidth="4" strokeLinecap="round"/><path d="m33 26 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="#f6d68e"/></svg><span>Forge <b>Studio</b></span></Link><strong>AI WEBSITE BUILDER</strong></header>
 <div className="forge-auto-layout">
 <aside className="forge-auto-panel"><div className="eyebrow">YOUR WEBSITE, AUTOMATICALLY</div><h1>Tell us about your business.<br/><em>We build the rest.</em></h1><p>One business name, one generation step. Forge selects industry-relevant photography, page structure and visual direction automatically. Review all facts and images before publishing.</p>
 <fieldset style={{border:'1px solid #99999966',borderRadius:14,padding:16,margin:'18px 0'}}><legend>Choose your website experience</legend><div style={{display:'grid',gap:10}}>{([{value:'standard',title:'Standard website',description:'Clear pages and conventional navigation.'},{value:'cinematic',title:'Cinematic depth & transitions',description:'Layered visuals and transitions between pages.'},{value:'immersive',title:'3D immersion',description:'Business-matched immersive scenes and interactive 3D objects with destinations throughout the website, plus accessible page navigation.'}] as const).map(choice=><button key={choice.value} type="button" disabled={busy||researchBusy} aria-pressed={experienceStyle===choice.value} onClick={()=>{if(experienceStyle===choice.value)return;setExperienceStyle(choice.value);setAutoImmersive(choice.value==='immersive');setPages([]);setReviewApproved(false);setStatus('')}} style={{textAlign:'left',color:'inherit',padding:'14px 16px',border:experienceStyle===choice.value?'2px solid #c5a775':'1px solid #99999966',borderRadius:10,background:experienceStyle===choice.value?'#c5a77522':'transparent'}}><strong>{choice.title}</strong><span style={{display:'block',fontSize:13,marginTop:5}}>{choice.description}</span></button>)}</div><p className="forge-auto-note">3D is optional. The single 3D immersion choice combines business-themed interactive objects and a navigable scene with destinations on every page. Standard pages stay available, and all immersive choices keep accessible offering links or readable page navigation.</p></fieldset>
 <fieldset style={{border:'1px solid #99999966',borderRadius:14,padding:14,margin:'12px 0'}}><legend>Visual design direction</legend><label>Design selection<select value={visualDesignMode} disabled={busy||researchBusy} onChange={e=>{setVisualDesignMode(e.target.value as 'auto'|'library');setPages([])}}><option value="auto">AI Auto-Design (recommended)</option><option value="library">Choose from design library</option></select></label>{visualDesignMode==='library'&&<label>Design pattern<select value={visualPatternId} disabled={busy||researchBusy} onChange={e=>{setVisualPatternId(e.target.value);setPages([])}}>{DESIGN_PATTERNS.map(pattern=><option key={pattern.id} value={pattern.id}>{pattern.label}</option>)}</select></label>}</fieldset>
 <label>Design approach<select disabled={busy||researchBusy} value={designMode} onChange={e=>{setDesignMode(e.target.value as 'new'|'inspired'|'redesign');setWorkerEvidence(null);setWorkerEvidenceText('');setPages([])}}><option value="new">Create a completely new website</option><option value="inspired">Preserve an existing site's visual style</option><option value="redesign">Fully redesign an existing site</option></select></label>
 {designMode!=='new'&&<><label>Existing website address<input type="url" value={siteUrl} onChange={e=>{updateWebsiteAddress(e.target.value)}} placeholder="e.g. disney.com"/></label><button type="button" disabled={researchBusy||busy} onClick={()=>void inspectWebsite()}>{researchBusy?'Inspecting website…':designMode==='inspired'?'Extract website appearance':'Extract website details for redesign'}</button><details className="forge-auto-advanced"><summary>Optional: paste existing HTML/CSS instead</summary><textarea rows={4} value={referenceMarkup} onChange={e=>setReferenceMarkup(e.target.value)} placeholder="Paste saved HTML with embedded CSS"/></details><p className="forge-auto-note">Forge extracts public content, design details and image references. Use only designs and assets you are authorized to reuse. Review the draft against the original before publishing.</p></>}
 {designMode!=='new'&&inspected&&name.trim()&&!matchingSourceBusiness(name,extractedName(inspected))?<p className="forge-auto-note" role="status">This is a different business from {extractedName(inspected)}. Generate will automatically create a fresh website without reusing that source's branding, pages or contact details.</p>:designMode!=='new'&&inspected&&<p className="forge-auto-note" role="status">Website extracted: {new URL(inspected.url).hostname}. Ready to generate; you do not need to extract it again.</p>}
 {designMode!=='new'&&inspectionError&&<p className="forge-auto-note" role="alert">{inspectionError}</p>}

 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Review evidence-grounded website proposal</summary>{(()=>{try{const evidence=inspectionToBrowserEvidence(inspected);const proposal=proposeBusinessSiteFromCapture(evidence);return <div className="forge-auto-note"><p><strong>Proposed business name:</strong> {proposal.businessName}</p><p><strong>Observed headings:</strong> {proposal.observedHeadings.join(' · ')||'None'}</p><p><strong>Verified business facts required:</strong> {proposal.missingRequiredFields.join(', ')}</p><p><strong>Captured navigation:</strong> {proposal.navigation.length} unverified links</p><p><strong>Publishing:</strong> blocked until owner review and approval</p><p>{proposal.warnings.join(' ')}</p></div>}catch{return <p className="forge-auto-note">This inspection cannot be converted into a trusted evidence proposal. Verify the source URL and try again.</p>}})()}</details>}
 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Generate from reviewed website evidence</summary><p className="forge-auto-note">This option uses metadata evidence only, not screenshot reconstruction. Enter verified facts before generating.</p><label>Verified industry<input value={reviewIndustry} onChange={e=>{setReviewIndustry(e.target.value);setReviewApproved(false)}} placeholder="e.g. Professional services"/></label><label>Verified services (comma-separated)<textarea rows={3} value={reviewServices} onChange={e=>{setReviewServices(e.target.value);setReviewApproved(false)}} placeholder="e.g. Consulting, Support"/></label><label><input type="checkbox" checked={reviewApproved} onChange={e=>setReviewApproved(e.target.checked)}/> I have reviewed the extracted business name, description above, industry and services.</label><button type="button" disabled={!reviewApproved} onClick={generateFromReviewedEvidence}>Generate reviewed four-page draft</button></details>}
 {designMode!=='new'&&<details className="forge-auto-advanced"><summary>Import optional browser-verification evidence</summary><p>Paste the JSON evidence from an authorized Forge browser-capture worker. The captured layout remains review-only. In Preserve Original Style mode, safe computed colors and typography from matching website evidence may also be applied to a generated draft. Publication and exact visual reconstruction remain unverified.</p><textarea rows={4} aria-label="Browser verification JSON" value={workerEvidenceText} onChange={e=>{setWorkerEvidenceText(e.target.value);setWorkerEvidence(null);setCapturePreview([]);setWorkerEvidenceError('')}} placeholder='{"version":1,"sourceUrl":"https://example.com",...}'/><button type="button" onClick={()=>{try{const parsed:unknown=JSON.parse(workerEvidenceText);if(!validateBrowserEvidence(parsed))throw Error('Invalid or unsupported browser evidence');if(siteUrl.trim()){const expected=new URL(siteUrl.startsWith('http')?siteUrl:'https://'+siteUrl);if(new URL(parsed.sourceUrl).hostname!==expected.hostname)throw Error('Evidence host must match the inspected website host');}setWorkerEvidence(parsed);setCapturePreview([]);setWorkerEvidenceError('')}catch(error){setWorkerEvidence(null);setCapturePreview([]);setWorkerEvidenceError(error instanceof Error?error.message:'Invalid JSON')}}}>Review browser evidence</button>{workerEvidenceError&&<p role="alert">{workerEvidenceError}</p>}{workerEvidence&&<button type="button" onClick={()=>{try{setCapturePreview(capturePreviewPages(workerEvidence));setCapturePreviewIndex(0)}catch(error){setWorkerEvidenceError(error instanceof Error?error.message:'Preview unavailable')}}}>Preview captured layout (review only)</button>}{capturePreview.length>0&&<div><p>Unverified layout preview. This does not change the generated pages or authorize publication.</p>{capturePreview.length>1&&<label>Captured page <select value={capturePreviewIndex} onChange={e=>setCapturePreviewIndex(Number(e.target.value))}>{capturePreview.map((page,index)=><option key={page.slug} value={index}>{page.title}</option>)}</select></label>}<iframe title="Captured website layout preview" sandbox="" srcDoc={capturePreview[capturePreviewIndex]?.html||''} style={{width:'100%',height:460,border:'1px solid #aaa'}}/></div>}{workerEvidence&&<div role="status"><strong>Browser navigation checks:</strong> {navigationQualityRecommendations(workerEvidence).inspected} inspected. <strong>Status:</strong> {navigationQualityRecommendations(workerEvidence).status}. {navigationQualityRecommendations(workerEvidence).recommendations.map((item,index)=><p key={index}>{item.finding}. {item.action}</p>)}<p>Source-site navigation only. Form submissions, button behavior and generated pages remain unverified.</p></div>}</details>}
 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>Website verification coverage</summary><p><strong>Inspected metadata:</strong> {inspected.pageSummaries?.length||0} linked pages with extracted summaries.</p><p><strong>Browser navigation:</strong> Not tested in this inspection. Link discovery does not establish that a destination works.</p><p><strong>Buttons and forms:</strong> Not tested. Submissions, authentication, payments and other interactive functions require separate verification.</p><p><strong>Visual reconstruction:</strong> Not verified against browser screenshots.</p><p>Generate a review-only draft, then verify its links, content and behavior before publication.</p></details>}
 {inspected&&designMode!=='new'&&<details className="forge-auto-advanced"><summary>View extracted website research (optional)</summary><div className="forge-auto-note"><strong>Extracted from {inspected.url}</strong><p>Title: {inspected.title||'Unavailable'}</p><p>Description: {inspected.description||'Unavailable'}</p><p>Headings: {inspected.headings.slice(0,3).join(' · ')||'Unavailable'}</p><p>Discovered page links: {inspected.navigation?.length||0}. {inspected.navigation?.slice(0,5).map(item=>item.label).join(' · ')||'None identified'}. Successfully inspected: {inspected.pageSummaries?.length||0}. Intelligence: {analyzeSiteEvidence(inspected).industry} ({analyzeSiteEvidence(inspected).confidence} confidence). Coverage: {inspectionCoverage(inspected).internalPages} internal pages; browser-rendered visuals not yet inspected. Pages have not yet been reconstructed.</p>{inspected.pageSummaries?.map(page=><p key={page.path}><strong>{page.label}:</strong> {page.title} — {page.description||page.headings.slice(0,2).join(' · ')||'No readable summary'}</p>)}<p>Visual style: {referenceStyle.background||'No background detected'} / {referenceStyle.accent||'No accent detected'}. Stylesheets inspected: {inspected.stylesheetsRead}. {inspected.visualSignals&&<span> Structure: {inspected.visualSignals.sectionCount} sections, {inspected.visualSignals.imageCount} images, {inspected.visualSignals.buttonCount} buttons, {inspected.visualSignals.heroSections} hero markers.</span>}</p></div></details>}
 <label>Business name<input autoFocus value={name} onChange={e=>{setName(e.target.value);setStatus('')}} placeholder="e.g. Northstar Coffee"/></label>
 <label>What does your business do? <span className="optional">(needed when the name is unclear)</span><textarea rows={5} value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe what you offer, who you serve and what makes you different."/></label>
 <details className="forge-auto-advanced"><summary>Add contact information (recommended before publishing)</summary><label>Business email<input type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="hello@yourbusiness.com"/></label></details>
 <button className="forge-auto-cta" onClick={()=>void generate()} disabled={busy||researchBusy}>{researchBusy?'Reading website…':busy?'Creating your website…':'✦ Generate my website'}</button>

 {status&&<p role="status" className="forge-auto-status">{status}</p>}
 <p className="forge-auto-note">For the best results, include your products, services and atmosphere. Business-specific visuals are selected automatically. Automatically generates Home, Services, About and Contact pages.</p>
 {pages.length>0&&<div role="status" className="forge-auto-note"><strong>Automatic website check:</strong> {draftAudit?.readyForReview?'Ready for your review':'Needs corrections before publishing'}{(draftAudit?.errors.length??0)>0&&<p>{draftAudit?.errors.slice(0,3).join(' · ')}</p>}<button type="button" onClick={()=>setShowAdvancedReview(value=>!value)} aria-expanded={showAdvancedReview}>{showAdvancedReview?'Hide technical check details':'Show technical check details'}</button>{showAdvancedReview&&<p>{draftAudit?.errors.length} errors · {draftAudit?.warnings.length} warnings. Hosted publishing checks: {publicationCheck?.valid?'Passed static checks':publicationCheck?.errors.slice(0,3).join(' · ')}. Live publishing has not been verified.</p>}</div>}
 {pages.length>0&&<div className="forge-auto-note"><details className="forge-auto-advanced"><summary>Update an existing published website</summary><label>Existing publication ID (optional, to save a new revision)<input value={revisionId} onChange={e=>{setRevisionId(e.target.value);setPublishApproved(false)}} placeholder="Publication UUID, leave blank for a new website"/></label><label>Current publication version (required for revisions)<input type="number" min="1" step="1" value={revisionVersion} onChange={e=>{setRevisionVersion(e.target.value);setPublishApproved(false)}} placeholder="Check saved versions in Manage published websites"/></label><button type="button" onClick={()=>void loadCurrentPublicationVersion()} disabled={!revisionId.trim()}>Load current publication version</button></details><label><input type="checkbox" checked={publishApproved} onChange={e=>setPublishApproved(e.target.checked)}/> I reviewed every generated page and approve publishing this business website.</label><button type="button" disabled={!publishApproved||!draftAudit?.readyForReview||!publicationCheck?.valid||publishBusy||(!!revisionId.trim()&&(!Number.isSafeInteger(Number(revisionVersion))||Number(revisionVersion)<1))} onClick={()=>void publishReviewedDraft()}>{publishBusy?"Publishing…":"Publish approved draft (if enabled)"}</button>{publishedUrls.map(url=><p key={url}><a href={url} target="_blank" rel="noopener noreferrer">View published page: {url}</a></p>)}{publicationCheck&&!publicationCheck.valid&&<p role="status">Hosted publishing is unavailable for this draft. Check the business name and page content. Interactive scripts and forms are not supported yet; the website ZIP remains available.</p>}<p>Publishing requires sign-in and server configuration; it is disabled by default.</p></div>}
 {pages.length>0&&<div className="forge-auto-export"><button type="button" disabled={!draftAudit?.readyForReview} onClick={()=>void downloadWebsiteZip()}>↓ Download complete website ZIP</button><Link href="/business/publications">Manage published websites ↗</Link></div>}
 <p><Link href="/redesign" style={{color:"#eac9a0",fontWeight:700}}>✦ Score a website & plan an intelligent redesign →</Link></p>
 <details className="forge-auto-advanced"><summary>Advanced editing and intelligence tools</summary><div><button type="button" disabled={!pages.length} onClick={()=>{const selected=pages.find(page=>page.slug===active)||pages[0];try{sessionStorage.setItem("forge:visual-editor:context",serializeGeneratorEditorState({version:1,name,brief,contactEmail,siteUrl,referenceMarkup,designMode,experienceStyle,visualDesignMode,visualPatternId,autoImmersive,reviewIndustry,reviewServices}));sessionStorage.setItem("forge:visual-editor:handoff",JSON.stringify(selected));sessionStorage.setItem("forge:visual-editor:site",JSON.stringify(pages));window.location.assign("/visual-editor")}catch{setStatus("Unable to open editor. Download the HTML page and import it manually.")}}}>Edit current generated page</button><Link href="/visual-editor">Import HTML into editor</Link><Link href="/editor">Existing project editor</Link><Link href="/intelligence">Intelligence</Link><Link href="/assets">Asset library</Link></div></details>
 </aside>
 <main className="forge-auto-preview"><div className="forge-auto-toolbar"><span>● LIVE WEBSITE PREVIEW · {mobile?"390px mobile":"Full-width desktop"}</span><div><button type="button" onClick={()=>setMobile(false)} aria-pressed={!mobile} aria-label="Switch to full-width desktop website preview">Desktop</button><button type="button" onClick={()=>setMobile(true)} aria-pressed={mobile} aria-label="Switch to 390 pixel mobile website preview">Mobile</button></div></div>
 {pages.length>0?<><div className="forge-auto-quick-edit"><label>Page headline <input aria-label="Edit current page headline" value={headingEdit} onChange={e=>setHeadingEdit(e.target.value)} maxLength={120}/></label><button type="button" onClick={saveHeading}>Apply headline</button><label>Section heading <input aria-label="Edit current page section heading" value={subheadingEdit} onChange={e=>setSubheadingEdit(e.target.value)} maxLength={160}/></label><button type="button" onClick={saveSubheading} disabled={!subheadingEdit.trim()}>Apply section heading</button><label>Page description <textarea aria-label="Edit current page description" rows={2} value={paragraphEdit} onChange={e=>setParagraphEdit(e.target.value)} maxLength={600}/></label><button type="button" onClick={saveParagraph} disabled={!paragraphEdit.trim()}>Apply description</button><label>Brand accent <input type="color" aria-label="Choose brand accent" value={quickAccent} onChange={e=>setQuickAccent(e.target.value)}/></label><button type="button" onClick={applyAccent}>Apply brand color to all pages</button><label>Layout spacing <select aria-label="Choose layout spacing" value={layoutChoice} onChange={e=>applyLayout(e.target.value as 'spacious'|'compact')}><option value="spacious">Spacious</option><option value="compact">Compact</option></select></label><button type="button" disabled={!undoPages} onClick={undoLastEdit}>Undo last edit</button></div><nav className="forge-auto-tabs" aria-label="Website pages">{pages.map(p=><button key={p.slug} aria-current={active===p.slug?'page':undefined} onClick={()=>{revealPreview();setPreviewAnchor('');setActive(p.slug)}}>{p.title}</button>)}</nav><div className={'forge-auto-frame '+(mobile?'mobile':'')} style={mobile&&previewHeight?{height:previewHeight}:undefined}><iframe key={active+(mobile?":mobile":":desktop")} ref={frameRef} title={'Website preview: '+(current?.title||'Home')} sandbox="allow-scripts" srcDoc={previewHtml}/></div></>:<div className="forge-auto-placeholder"><div className="forge-auto-orb">✦</div><span>THE NEXT GENERATION OF WEBSITES</span><h2>Beautiful by default.<br/>Built around your brand.</h2><p>Your website preview will appear here, ready to explore.</p></div>}
 </main></div></div>
}
