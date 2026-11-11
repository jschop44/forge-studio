'use client';
import {useEffect,useState} from 'react';
import type {Component,Editor} from 'grapesjs';
import {EDITOR_FONTS,editorDestination,editorImage,editorStylePatch} from '../../lib/visual-editor-controls';
import {escapeHtml} from '../../lib/export';
import type {GeneratedPage} from '../../lib/business-site';
type Props={editor:Editor|null;pages:GeneratedPage[]};
export default function ComponentInspector({editor,pages}:Props){
 const [selected,setSelected]=useState<Component|null>(null);
 const [fields,setFields]=useState({text:'',src:'',alt:'',href:''});
 const [styles,setStyles]=useState<Record<string,string>>({});
 const [message,setMessage]=useState('');
 const [,refresh]=useState(0);
 useEffect(()=>{
  if(!editor)return;
  const select=()=>{const component=editor.getSelected()||null;setSelected(component);setStyles({});setMessage('');if(component){const attrs=component.getAttributes();setFields({text:component.getEl()?.textContent||'',src:String(component.get('src')||attrs.src||''),alt:String(attrs.alt||''),href:String(attrs.href||'')})}};
  editor.on('component:selected component:deselected undo redo',select);select();
  return ()=>{editor.off('component:selected component:deselected undo redo',select)};
 },[editor]);
 const tag=String(selected?.get('tagName')||'').toLowerCase();
 const element=selected?.getEl();
 const computed=element?element.ownerDocument.defaultView?.getComputedStyle(element):undefined;
 const hex=(value:string|undefined,fallback:string)=>{const rgb=value?.match(/\d+/g);return rgb&&rgb.length>=3?'#'+rgb.slice(0,3).map(value=>Math.min(255,Number(value)).toString(16).padStart(2,'0')).join(''):fallback};
 const image=selected?.is('image')||tag==='img';
 const link=tag==='a';
 const text=/^(?:h[1-6]|p|span|button|li|summary|blockquote|a)$/.test(tag);
 function applyContent(){
  if(!selected)return;
  try{
   const url=image?editorImage(fields.src):link?editorDestination(fields.href):'';
   if(image)selected.set({src:url,attributes:{...selected.getAttributes(),src:url,alt:fields.alt.slice(0,350)}});
   else{if(link)selected.addAttributes({href:url});if(text&&fields.text!==selected.getEl()?.textContent)selected.components(escapeHtml(fields.text.slice(0,2000)))}
   setMessage('Selected element updated.');
  }catch(error){setMessage(error instanceof Error?error.message:'Unable to update element.')}
 }
 function applyStyles(){
  if(!selected)return;
  try{const patch=editorStylePatch(styles);if(!Object.keys(patch).length){setMessage('Choose a style to change.');return}selected.addStyle(patch);setStyles({});setMessage('Selected element styles updated.')}catch(error){setMessage(error instanceof Error?error.message:'Unable to update styles.')}
 }
 function move(direction:number){
  const parent=selected?.parent();if(!selected||!parent)return;
  const index=selected.index()+direction;if(index<0||index>=parent.components().length)return;
  selected.move(parent,{at:index});editor?.select(selected);refresh(value=>value+1);setMessage('Element moved.');
 }
 const updateStyle=(key:string,value:string)=>setStyles(current=>({...current,[key]:value}));
 return <section className="forge-element-inspector" aria-label="Selected element controls"><h3>Selected element</h3>
  {!selected?<p>Select an element on the canvas or in Layers.</p>:<><p>{image?'Image':link?'Link / button':tag.toUpperCase()}</p><div role="group" aria-label="Element placement"><button type="button" disabled={!selected.parent()||selected.index()===0} onClick={()=>move(-1)}>Move element up</button><button type="button" disabled={!selected.parent()||selected.index()>=selected.parent()!.components().length-1} onClick={()=>move(1)}>Move element down</button></div>
   {text&&<label>Element text<textarea aria-label="Selected element text" rows={2} value={fields.text} onChange={e=>setFields({...fields,text:e.target.value})}/></label>}
   {image&&<><label>Image URL<input aria-label="Selected image URL" type="url" value={fields.src} onChange={e=>setFields({...fields,src:e.target.value})}/></label><label>Image description<input aria-label="Selected image description" value={fields.alt} onChange={e=>setFields({...fields,alt:e.target.value})}/></label></>}
   {link&&<><label>Link destination<input aria-label="Selected link destination" value={fields.href} onChange={e=>setFields({...fields,href:e.target.value})}/></label><label>Link to a website page<select aria-label="Selected link page" value={pages.some(page=>page.slug+'.html'===fields.href)?fields.href:''} onChange={e=>{if(e.target.value)setFields({...fields,href:e.target.value})}}><option value="">Custom destination</option>{pages.map(page=><option key={page.slug} value={page.slug+'.html'}>{page.title}</option>)}</select></label></>}
   {(image||text)&&<button type="button" onClick={applyContent}>Apply element content</button>}
   <details><summary>Colors, fonts and layout</summary><div className="forge-style-controls">
    <label>Text color<input aria-label="Selected text color" type="color" value={styles.color||hex(computed?.color,'#14263e')} onChange={e=>updateStyle('color',e.target.value)}/></label>
    <label>Background color<input aria-label="Selected background color" type="color" value={styles['background-color']||hex(computed?.backgroundColor,'#ffffff')} onChange={e=>updateStyle('background-color',e.target.value)}/></label>
    <label>Font<select aria-label="Selected font" value={styles['font-family']||''} onChange={e=>updateStyle('font-family',e.target.value)}><option value="">Keep current font</option>{EDITOR_FONTS.map(font=><option key={font}>{font}</option>)}</select></label>
    {([['font-size','Text size'],['padding','Padding'],['margin','Margin'],['gap','Gap'],['border-radius','Corner radius']] as const).map(([key,label])=><label key={key}>{label} (px)<input aria-label={'Selected '+label.toLowerCase()} type="number" min={key==='font-size'?1:0} max={200} placeholder="Keep current" value={styles[key]||''} onChange={e=>updateStyle(key,e.target.value)}/></label>)}
    <label>Layout<select aria-label="Selected layout" value={styles.display||''} onChange={e=>updateStyle('display',e.target.value)}><option value="">Keep current layout</option><option value="block">Stacked</option><option value="flex">Flexible row</option><option value="grid">Grid</option></select></label>
    <label>Grid columns<input aria-label="Selected grid columns" type="number" min={1} max={6} placeholder="Keep current" value={styles['grid-template-columns']||''} onChange={e=>updateStyle('grid-template-columns',e.target.value)}/></label>
    <button type="button" onClick={applyStyles}>Apply element styles</button>
   </div></details>
  </>}{message&&<p role="status">{message}</p>}
 </section>;
}
