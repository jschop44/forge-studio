'use client';
import {useEffect,useRef} from 'react';
import 'grapesjs/dist/css/grapes.min.css';
type Props={html:string;css:string;onChange:(html:string,css:string)=>void};
export default function GrapesVisualCanvas({html,css,onChange}:Props){
 const mount=useRef<HTMLDivElement>(null);
 const latest=useRef(onChange);
 latest.current=onChange;
 useEffect(()=>{
  let active=true;
  let editor:{destroy:()=>void}|undefined;
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
   instance.on('update',()=>latest.current(instance.getHtml(),instance.getCss()));
  }).catch(()=>{});
  return ()=>{active=false;editor?.destroy()};
 // The editor owns the initial snapshot. Parent updates come from its change callback.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 return <section aria-label="Drag and drop page designer" style={{marginTop:24}}>
  <h2>Drag-and-drop page designer</h2>
  <p>Select text or images on the canvas to edit them. Drag content blocks into the page; changes synchronize to the HTML and CSS fields below.</p>
  <div style={{display:'grid',gridTemplateColumns:'minmax(150px,1fr) minmax(0,4fr) minmax(170px,1fr)',gap:12}}>
   <aside><h3>Blocks</h3><div id="forge-grapes-blocks"/><h3>Layers</h3><div id="forge-grapes-layers"/></aside>
   <div ref={mount} style={{minWidth:0,border:'1px solid #aaa'}}/>
   <aside><h3>Styles</h3><div id="forge-grapes-styles"/></aside>
  </div>
 </section>;
}
