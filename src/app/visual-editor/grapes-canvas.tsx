'use client';
import {useEffect,useRef,useState} from 'react';
import 'grapesjs/dist/css/grapes.min.css';
import './grapes-canvas.css';
import type {Editor} from 'grapesjs';
type Props={html:string;css:string;onChange:(html:string,css:string)=>void};
export default function GrapesVisualCanvas({html,css,onChange}:Props){
 const mount=useRef<HTMLDivElement>(null);
 const editorRef=useRef<Editor|null>(null);
 const dropAreaRef=useRef<HTMLDivElement>(null);
 const draggingIdRef=useRef<string|null>(null);
 const [insertMessage,setInsertMessage]=useState('');
 const insertBlock=(id:string)=>{
  const current=editorRef.current;
  const content=current?.BlockManager.get(id)?.get('content');
  if(!content||!current){setInsertMessage('Unable to add '+id+' block.');return}
  current.addComponents(content);
  latest.current(current.getHtml(),current.getCss()||'');
  setInsertMessage('Inserted '+id+' block.');
 };
 const applyHistory=(action:'undo'|'redo')=>{
  const current=editorRef.current;
  if(!current)return;
  if(action==='undo')current.UndoManager.undo();
  else current.UndoManager.redo();
  latest.current(current.getHtml(),current.getCss()||'');
  setInsertMessage(action==='undo'?'Last canvas edit undone.':'Canvas edit restored.');
 };
 const finishDrop=(id:string|null)=>{
  draggingIdRef.current=null;
  setDragging(false);
  if(id&&['heading','paragraph','button','section','image'].includes(id))insertBlock(id);
 };
 const finishIfOverDropArea=(x:number,y:number)=>{
  const box=dropAreaRef.current?.getBoundingClientRect();
  if(box&&x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom)finishDrop(draggingIdRef.current);
  else{draggingIdRef.current=null;setDragging(false)}
 };
 const [loadError,setLoadError]=useState('');
 const [ready,setReady]=useState(false);
 const [device,setDevice]=useState('Desktop');
 const fitDevice=(instance:Editor)=>{
  const width=parseFloat(String(instance.Devices.getSelected()?.get('width')||''));
  const available=mount.current?.clientWidth||width;
  instance.Canvas.setZoom(Number.isFinite(width)&&width>0?Math.max(10,Math.min(100,(available-24)/width*100)):100);
 };
 const previewDevice=(name:string)=>{
  if(!editorRef.current)return;
  editorRef.current.setDevice(name);fitDevice(editorRef.current);setDevice(name);
 };
 const [dragging,setDragging]=useState(false);
 const latest=useRef(onChange);
 latest.current=onChange;
 useEffect(()=>{
  let active=true;
  let editor:{destroy:()=>void}|undefined;
  let resizeObserver:ResizeObserver|undefined;
  void import('grapesjs').then(({default:grapesjs})=>{
   if(!active||!mount.current)return;
   const instance=grapesjs.init({
    container:mount.current,
    height:'620px',
    width:'auto',
    storageManager:false,
    fromElement:false,
    components:html,
    style:css,
    canvas:{styles:[],scripts:[]},
    panels:{defaults:[]},
    devicePreviewMode:true,
    deviceManager:{default:'Desktop',devices:[
     {id:'Desktop',name:'Desktop',width:''},
     {id:'Tablet',name:'Tablet',width:'768px',widthMedia:'992px'},
     {id:'Mobile',name:'Mobile',width:'390px',widthMedia:'650px'}
    ]},
    blockManager:{appendTo:'#forge-grapes-blocks',blocks:[
     {id:'heading',label:'Heading',category:'Content',content:'<h2>New heading</h2>'},
     {id:'paragraph',label:'Paragraph',category:'Content',content:'<p>New paragraph</p>'},
     {id:'button',label:'Button',category:'Content',content:'<a href="#">Learn more</a>'},
     {id:'section',label:'Section',category:'Layout',content:'<section><h2>Section heading</h2><p>Section description</p></section>'},
     {id:'image',label:'Image',category:'Content',content:{type:'image',src:'https://placehold.co/800x500?text=Replace+image',alt:'Replace this image'}}
    ]},
    styleManager:{appendTo:'#forge-grapes-styles'},
    layerManager:{appendTo:'#forge-grapes-layers'},
    selectorManager:{appendTo:'#forge-grapes-styles'}
   });
   editor=instance;
   editorRef.current=instance;
   resizeObserver=new ResizeObserver(()=>fitDevice(instance));
   resizeObserver.observe(mount.current);
   setReady(true);
   instance.on('update',()=>latest.current(instance.getHtml(),instance.getCss()||''));
  }).catch((error:unknown)=>{if(active)setLoadError(error instanceof Error?error.message:'Unknown editor loading error')});
  return ()=>{active=false;resizeObserver?.disconnect();editorRef.current=null;editor?.destroy()};
 // The editor owns the initial snapshot. Parent updates come from its change callback.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 return <section aria-label="Drag and drop page designer" style={{marginTop:24}}>
  <h2>Drag-and-drop page designer</h2>
  {!ready&&!loadError&&<p role="status">Loading visual designer…</p>}
  {loadError&&<p role="alert">The visual designer could not load: {loadError}. Your HTML and CSS remain available below.</p>}
  {insertMessage&&<p aria-live="polite">{insertMessage}</p>}
  <p>Select text or images on the canvas to edit them. Drag content blocks into the page; changes synchronize to the HTML and CSS fields below.</p>
  <div role="toolbar" aria-label="Canvas history" style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}><button type="button" disabled={!ready} onClick={()=>applyHistory('undo')}>Undo canvas edit</button><button type="button" disabled={!ready} onClick={()=>applyHistory('redo')}>Redo canvas edit</button></div>
  <div role="toolbar" aria-label="Website preview devices" className="forge-device-toolbar">{['Desktop','Tablet','Mobile'].map(name=><button type="button" key={name} disabled={!ready} aria-label={name+' canvas preview'} aria-pressed={device===name} onClick={()=>previewDevice(name)}>{name}</button>)}<span aria-live="polite">{device==='Desktop'?'Fits the editing area':device==='Tablet'?'768 px viewport':'390 px viewport'}</span></div>
  <div className="forge-grapes-layout">
   <aside><h3>Blocks</h3><div id="forge-grapes-blocks"/><p>Tap to add on touch devices:</p><div style={{display:'grid',gap:6}}>{(['heading','paragraph','button','section','image'] as const).map(id=><button type="button" key={id} onClick={()=>insertBlock(id)} draggable={ready} onPointerDown={()=>{draggingIdRef.current=id}} onDragStart={event=>{draggingIdRef.current=id;event.dataTransfer.setData('application/x-forge-block',id);event.dataTransfer.setData('text/plain',id);event.dataTransfer.effectAllowed='copy';setDragging(true)}} onDragEnd={event=>finishIfOverDropArea(event.clientX,event.clientY)} disabled={!ready} aria-label={'Insert '+id+' block'}>Add {id}</button>)}</div><h3>Layers</h3><div id="forge-grapes-layers"/></aside>
   <div className="forge-grapes-center"><div ref={dropAreaRef} role="region" aria-label="Drop new content into page" onPointerUp={()=>{if(draggingIdRef.current)finishDrop(draggingIdRef.current)}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect='copy'}} onDrop={event=>{event.preventDefault();finishDrop(event.dataTransfer.getData('application/x-forge-block')||event.dataTransfer.getData('text/plain')||draggingIdRef.current)}} style={{padding:12,marginBottom:8,border:'2px dashed #8b9abb',borderRadius:8,background:dragging?'#d9eafe':'transparent'}}>Drag a block here to add it to the page, or tap an Add button</div><div ref={mount} style={{minWidth:0,border:'1px solid #aaa'}}/></div>
   <aside><h3>Styles</h3><div id="forge-grapes-styles"/></aside>
  </div>
 </section>;
}
