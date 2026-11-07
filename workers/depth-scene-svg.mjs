/** Script-free accessible SVG visualization of measured depth layers. */
import {projectDepthScene} from './immersive-depth-scene.mjs';
const escapeXml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export function renderDepthSceneSvg(scene,viewportWidth=960,{reducedMotion=false}={}){
 const projected=projectDepthScene(scene,viewportWidth,{reducedMotion});
 const height=Math.max(240,Math.min(12000,...projected.layers.map(l=>l.y+l.height+20)));
 const rectangles=projected.layers.map((layer,index)=>{
  const shade=235-Math.min(80,layer.depth*2);
  return '<g data-layer="'+escapeXml(layer.id)+'"><rect x="'+layer.x+'" y="'+layer.y+'" width="'+layer.width+'" height="'+layer.height+'" rx="8" fill="rgb('+shade+','+shade+','+shade+')" stroke="#687080" stroke-width="1"/><title>'+escapeXml(layer.role)+' region '+(index+1)+'</title></g>';
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="scene-title scene-desc" width="'+viewportWidth+'" height="'+height+'" viewBox="0 0 '+viewportWidth+' '+height+'"><title id="scene-title">Observed website depth layout</title><desc id="scene-desc">Static schematic of '+projected.layers.length+' measured website regions; no interactive content or original site assets.</desc>'+rectangles+'</svg>';
}
