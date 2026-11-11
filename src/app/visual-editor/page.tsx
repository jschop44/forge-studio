'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {prepareVisualEditorDocument,serializeEditorDraft,serializeVisualEditorDocument} from '../../lib/visual-editor-adapter';
import {normalizeEditorDocument,parseEditorSite,replaceEditorPage} from '../../lib/visual-editor-site';
import {portableStaticSiteLinks} from '../../lib/portable-static-site-links';
import {auditGeneratedDraft} from '../../lib/draft-quality-gate';
import {downloadText,escapeHtml} from '../../lib/export';
import type {GeneratedPage} from '../../lib/business-site';
import './visual-editor.css';
const GrapesVisualCanvas=dynamic(()=>import('./grapes-canvas'),{ssr:false});
export default function VisualEditor(){
 const rawDirty=useRef(false);
 const refreshRaw=()=>{if(rawDirty.current){rawDirty.current=false;setCanvasVersion(v=>v+1)}};
 const [page,setPage]=useState<GeneratedPage|null>(null),[site,setSite]=useState<GeneratedPage[]>([]);
 const [body,setBody]=useState(''),[css,setCss]=useState('');
 const [attributes,setAttributes]=useState<Record<string,string>>({});
 const [message,setMessage]=useState(''),[canvasOpen,setCanvasOpen]=useState(false),[canvasVersion,setCanvasVersion]=useState(0);
 const [visualHeadline,setVisualHeadline]=useState(''),[visualParagraph,setVisualParagraph]=useState('');
 function openPage(candidate:GeneratedPage,keepCanvas=false){
  const document=prepareVisualEditorDocument(candidate);
  if(!document.bodyHtml){setMessage(document.warnings.join(' ')||'Unable to open this page safely.');return false}
  if(!keepCanvas)setCanvasOpen(false);
  setCanvasVersion(v=>v+1);setPage(candidate);setBody(document.bodyHtml);setCss(document.css);setAttributes(document.bodyAttributes);
  const text=(tag:string)=>{const match=document.bodyHtml.match(new RegExp('<'+tag+'\\b[^>]*>([^<]*)</'+tag+'>','i'));if(!match)return '';const parsed=new DOMParser().parseFromString(match[1],'text/html');return parsed.body.textContent||''};
  setVisualHeadline(text('h1'));setVisualParagraph(text('p'));
  return true;
 }
 useEffect(()=>{
  try{
   const raw=sessionStorage.getItem('forge:visual-editor:handoff');if(!raw)return;
   sessionStorage.removeItem('forge:visual-editor:handoff');
   const candidate=raw.length<=2_000_000?JSON.parse(raw):null;
   const validated=parseEditorSite(JSON.stringify([candidate]));
   if(!validated.length){setMessage('Invalid or oversized transferred website page.');return}
   const pages=parseEditorSite(sessionStorage.getItem('forge:visual-editor:site'));
   setSite(pages.some(item=>item.slug===candidate.slug)?pages:validated);
   if(openPage(candidate))setMessage('Generated page loaded. Choose a page to edit, or open the drag-and-drop designer. '+prepareVisualEditorDocument(candidate).warnings.join(' '));
  }catch{setMessage('Unable to load transferred page.')}
 // Initial handoff is consumed once; document changes remain local to this editor.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 async function load(file:File){
  if(file.size>2_000_000){setMessage('HTML file exceeds 2 MB limit.');return}
  const candidate:GeneratedPage={slug:'index',title:file.name.replace(/\.html?$/i,'').slice(0,200),html:await file.text()};
  if(openPage(candidate)){setSite([candidate]);setMessage('Imported into the isolated editing preview. Original file remains unchanged.')}
 }
 function currentPages(){
  if(!page)throw Error('Open a page first.');
  const check=serializeEditorDraft(page,body,css,attributes);
  if(!check.html)throw Error(check.warnings.join(' '));
  return replaceEditorPage(site,{...page,html:check.html});
 }
 function switchPage(slug:string){
  if(!page||slug===page.slug)return;
  try{const next=currentPages();const selected=next.find(item=>item.slug===slug);if(selected&&openPage(selected,canvasOpen)){setSite(next);setMessage('Page loaded. Your other page edits are preserved.')}}catch(error){setMessage('Page switch blocked: '+(error instanceof Error?error.message:'Invalid page.'))}
 }
 function checkedSite(exporting=false){
  const current=currentPages().map(normalizeEditorDocument);
  const pages=exporting?current.map(item=>{const result=serializeVisualEditorDocument(item);if(!result.html)throw Error(item.title+': '+result.warnings.join(' '));return {...item,html:result.html}}):current;
  const report=auditGeneratedDraft(pages);if(!report.readyForReview)throw Error(report.errors.join(' '));
  return pages;
 }
 function applyVisualText(){
  let updated=body;
  if(/<h1\b[^>]*>[^<]*<\/h1>/i.test(updated))updated=updated.replace(/(<h1\b[^>]*>)[^<]*(<\/h1>)/i,(_,open:string,close:string)=>open+escapeHtml(visualHeadline)+close);
  if(/<p\b[^>]*>[^<]*<\/p>/i.test(updated))updated=updated.replace(/(<p\b[^>]*>)[^<]*(<\/p>)/i,(_,open:string,close:string)=>open+escapeHtml(visualParagraph)+close);
  setBody(updated);setCanvasVersion(v=>v+1);setMessage('Visual text changes applied. Review the preview before exporting.');
 }
 function returnToGenerator(){
  if(!page)return;
  try{const pages=checkedSite();const edited=pages.find(item=>item.slug===page.slug)!;sessionStorage.setItem('forge:visual-editor:site',JSON.stringify(pages));sessionStorage.setItem('forge:visual-editor:return',JSON.stringify(edited));window.location.assign('/business')}
  catch(error){setMessage('Return blocked: '+(error instanceof Error?error.message:'Unable to return edited pages. Download them instead.'))}
 }
 function save(){
  if(!page)return;
  const check=serializeEditorDraft(page,body,css,attributes);
  if(!check.html){setMessage('Export blocked: '+check.warnings.join(' '));return}
  downloadText(page.slug+'.edited.html',check.html,'text/html');setMessage('Edited HTML downloaded. Publishing requires separate review and approval.');
 }
 async function saveSite(){
  try{
   const pages=checkedSite(true);const {zipSync,strToU8}=await import('fflate');
   const bytes=zipSync(Object.fromEntries(pages.map(item=>[item.slug+'.html',strToU8(portableStaticSiteLinks(item.html,pages))])));
   const url=URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer],{type:'application/zip'}));
   const link=document.createElement('a');link.href=url;link.download='edited-website.zip';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
   setMessage('Validated website ZIP downloaded. Review every page before publishing.');
  }catch(error){setMessage('Website export blocked: '+(error instanceof Error?error.message:'Invalid website.'))}
 }
 const preview=page?serializeEditorDraft(page,body,css,attributes).html:'';
 return <main className="forge-visual-editor" style={{maxWidth:1400,margin:'auto',fontFamily:'system-ui'}}>
  <Link href="/business">← Website generator</Link><h1>Website visual editor</h1>
  <p>Edit your website pages, text, images, links and layout without writing code. Imported scripts stay disabled. Review every page before publishing.</p>
  <label>Import HTML page <input type="file" accept=".html,.htm,text/html" onChange={event=>{const file=event.target.files?.[0];if(file)void load(file);event.target.value=''}}/></label>
  {message&&<p role="status">{message}</p>}
  {page&&<>
   <label className="forge-page-switcher">Website page<select aria-label="Website page" value={page.slug} onChange={event=>switchPage(event.target.value)}>{site.map(item=><option key={item.slug} value={item.slug}>{item.title}</option>)}</select></label>
   <button type="button" onClick={()=>setCanvasOpen(value=>!value)}>{canvasOpen?'Close drag-and-drop designer':'Open drag-and-drop designer'}</button>
   {canvasOpen&&<GrapesVisualCanvas key={canvasVersion} html={body} css={css} pages={site} bodyAttributes={attributes} onChange={(nextBody,nextCss)=>{const check=serializeEditorDraft(page,nextBody,nextCss,attributes);if(check.html){setBody(nextBody);setCss(nextCss)}else setMessage('Designer update blocked: '+check.warnings.join(' '))}}/>}
   <section aria-label="Visual text editing" className="forge-quick-text"><h2>Quick visual text editing</h2><p>Edit the main headline and first plain-text paragraph, or select any element in the designer.</p>
    <label>Main headline <input aria-label="Visual main headline" value={visualHeadline} onChange={event=>setVisualHeadline(event.target.value)}/></label>
    <label>First paragraph <textarea aria-label="Visual first paragraph" value={visualParagraph} onChange={event=>setVisualParagraph(event.target.value)} rows={3}/></label>
    <button type="button" onClick={applyVisualText}>Apply visual text changes</button>
   </section>
   <details className="forge-code-editor" open><summary>Advanced HTML and CSS</summary><div className="forge-code-grid">
    <label>HTML body<textarea aria-label="HTML body" value={body} onChange={event=>{rawDirty.current=true;setBody(event.target.value)}} onBlur={refreshRaw} rows={18}/></label>
    <label>CSS<textarea aria-label="CSS" value={css} onChange={event=>{rawDirty.current=true;setCss(event.target.value)}} onBlur={refreshRaw} rows={18}/></label>
   </div></details>
   <div className="forge-editor-actions"><button type="button" onClick={save}>Validate and download edited page</button><button type="button" onClick={()=>void saveSite()}>Validate and download website ZIP</button><button type="button" onClick={returnToGenerator}>Return edited page to generator</button></div>
   <h2>Isolated preview</h2>{!preview&&<p role="alert">Preview blocked: potentially unsafe HTML or CSS. Remove active content before exporting.</p>}
   <iframe title="Edited website preview" sandbox="" referrerPolicy="no-referrer" srcDoc={preview} style={{width:'100%',height:540,border:'1px solid #999'}}/>
  </>}
 </main>;
}
