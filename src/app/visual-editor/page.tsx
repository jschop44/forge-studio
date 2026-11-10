'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {prepareVisualEditorDocument} from '../../lib/visual-editor-adapter';
import {downloadText} from '../../lib/export';
import type {GeneratedPage} from '../../lib/business-site';

export default function VisualEditor(){
 const [page,setPage]=useState<GeneratedPage|null>(null);
 const [body,setBody]=useState('');
 const [css,setCss]=useState('');
 const [message,setMessage]=useState('');
 const [visualHeadline,setVisualHeadline]=useState('');
 const [visualParagraph,setVisualParagraph]=useState('');
 useEffect(()=>{try{const raw=sessionStorage.getItem('forge:visual-editor:handoff');if(!raw)return;sessionStorage.removeItem('forge:visual-editor:handoff');if(raw.length>2_000_000){setMessage('Transferred page exceeds the editor size limit.');return}const candidate=JSON.parse(raw) as GeneratedPage;if(!candidate||typeof candidate.html!=='string'||typeof candidate.slug!=='string'||typeof candidate.title!=='string'){setMessage('Invalid transferred website page.');return}const doc=prepareVisualEditorDocument(candidate);if(!doc.bodyHtml){setMessage(doc.warnings.join(' ')||'Unable to open this page safely.');return}setPage(candidate);setBody(doc.bodyHtml);setCss(doc.css);setVisualHeadline(doc.bodyHtml.match(/<h1\b[^>]*>([^<]*)<\/h1>/i)?.[1]||'');setVisualParagraph(doc.bodyHtml.match(/<p\b[^>]*>([^<]*)<\/p>/i)?.[1]||'');setMessage('Generated page loaded. Edits are local until you export them.')}catch{setMessage('Unable to load transferred page.')}},[]);
 async function load(file:File){
  if(file.size>2_000_000){setMessage('HTML file exceeds 2 MB limit.');return}
  const html=await file.text();
  const candidate:GeneratedPage={slug:'index',title:file.name.replace(/\.html?$/i,''),html};
  const document=prepareVisualEditorDocument(candidate);
  if(!document.bodyHtml){setPage(null);setMessage(document.warnings.join(' ')||'Unable to import page safely.');return}
  setPage(candidate);setBody(document.bodyHtml);setCss(document.css);setVisualHeadline(document.bodyHtml.match(/<h1\b[^>]*>([^<]*)<\/h1>/i)?.[1]||'');setVisualParagraph(document.bodyHtml.match(/<p\b[^>]*>([^<]*)<\/p>/i)?.[1]||'');
  setMessage('Imported into the isolated editing preview. Original file remains unchanged.');
 }
 function applyVisualText(){
  const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');
  let updated=body;
  if(/<h1\b[^>]*>[^<]*<\/h1>/i.test(updated))updated=updated.replace(/(<h1\b[^>]*>)[^<]*(<\/h1>)/i,(_,open:string,close:string)=>open+escape(visualHeadline)+close);
  if(/<p\b[^>]*>[^<]*<\/p>/i.test(updated))updated=updated.replace(/(<p\b[^>]*>)[^<]*(<\/p>)/i,(_,open:string,close:string)=>open+escape(visualParagraph)+close);
  setBody(updated);setMessage('Visual text changes applied. Review the preview before exporting.');
 }
 function returnToGenerator(){
  if(!page)return;
  const html='<!doctype html><html><head><meta charset="utf-8"><title>'+page.title.replace(/[&<>"]/g,'')+'</title><style>'+css+'</style></head><body>'+body+'</body></html>';
  const check=prepareVisualEditorDocument({...page,html});
  if(!check.bodyHtml){setMessage('Return blocked: '+check.warnings.join(' '));return}
  try{sessionStorage.setItem('forge:visual-editor:return',JSON.stringify({...page,html}));window.location.assign('/business')}catch{setMessage('Unable to return edited page. Download it instead.')}
 }
 function save(){
  if(!page)return;
  const html='<!doctype html><html><head><meta charset="utf-8"><title>'+page.title.replace(/[&<>"]/g,'')+'</title><style>'+css+'</style></head><body>'+body+'</body></html>';
  const check=prepareVisualEditorDocument({...page,html});
  if(!check.bodyHtml){setMessage('Export blocked: '+check.warnings.join(' '));return}
  downloadText(page.slug+'.edited.html',html,'text/html');
  setMessage('Edited HTML downloaded. Publishing requires separate review and approval.');
 }
 const candidatePreview=page?'<!doctype html><html><head><style>'+css+'</style></head><body>'+body+'</body></html>':'';
 const previewCheck=page?prepareVisualEditorDocument({...page,html:candidatePreview}):null;
 const preview=previewCheck?.bodyHtml?candidatePreview:'';
 return <main style={{maxWidth:1200,margin:'auto',padding:24,fontFamily:'system-ui'}}>
  <Link href="/business">← Website generator</Link>
  <h1>Website HTML editor</h1>
  <p>Import a generated HTML page, edit its markup and CSS, preview it in a script-disabled sandbox, and download the result. This is a basic editing bridge, not yet the GrapesJS visual editor.</p>
  <label>Import HTML page <input type="file" accept=".html,.htm,text/html" onChange={event=>{const file=event.target.files?.[0];if(file)void load(file);event.target.value=''}}/></label>
  {message&&<p role="status">{message}</p>}
  {page&&<><section aria-label="Visual text editing" style={{padding:16,border:'1px solid #bbb',borderRadius:12,marginTop:20}}><h2>Quick visual text editing</h2><p>Edit the main headline and first plain-text paragraph without writing HTML. More complex layouts still require the HTML editor.</p><label style={{display:'block'}}>Main headline <input aria-label="Visual main headline" value={visualHeadline} onChange={event=>setVisualHeadline(event.target.value)} style={{display:'block',width:'100%'}}/></label><label style={{display:'block',marginTop:12}}>First paragraph <textarea aria-label="Visual first paragraph" value={visualParagraph} onChange={event=>setVisualParagraph(event.target.value)} rows={3} style={{display:'block',width:'100%'}}/></label><button type="button" onClick={applyVisualText}>Apply visual text changes</button></section><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16,marginTop:24}}>
   <label>HTML body<textarea aria-label="HTML body" value={body} onChange={event=>setBody(event.target.value)} rows={18} style={{display:'block',width:'100%',fontFamily:'monospace'}}/></label>
   <label>CSS<textarea aria-label="CSS" value={css} onChange={event=>setCss(event.target.value)} rows={18} style={{display:'block',width:'100%',fontFamily:'monospace'}}/></label>
  </div><button type="button" onClick={save}>Validate and download edited page</button> <button type="button" onClick={returnToGenerator}>Return edited page to generator</button>
  <h2>Isolated preview</h2>{page&&!preview&&<p role="alert">Preview blocked: potentially unsafe HTML or CSS. Remove active content before exporting.</p>}<iframe title="Edited website preview" sandbox="" referrerPolicy="no-referrer" srcDoc={preview} style={{width:'100%',height:540,border:'1px solid #999'}}/></>}
 </main>;
}
