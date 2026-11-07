/** Deterministic, script-free depth scene derived from captured visual regions. */
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function buildDepthScene(blueprint,pageIndex=0){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.pages))throw Error('Invalid blueprint');
 if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=blueprint.pages.length)throw Error('Invalid page index');
 const page=blueprint.pages[pageIndex];
 const regions=Array.isArray(page?.regions)?page.regions.slice(0,100):[];
 const layers=regions.flatMap((region,index)=>{
  const b=region?.bounds;
  if(!b||![b.x,b.y,b.width,b.height].every(finite)||b.width<=0||b.height<=0||b.x<0||b.y<0||b.x>10000||b.y>10000||b.width>10000||b.height>10000)return [];
  const role=['hero','navigation','footer','section','content','header','main','nav'].includes(region.type)?region.type:'content';
  const depth=role==='hero'?24:role==='navigation'?8:role==='footer'?2:12;
  return [{id:'layer-'+index,role,x:clamp(b.x,0,10000),y:clamp(b.y,0,10000),width:clamp(b.width,1,10000),height:clamp(b.height,1,10000),depth,interactive:false}];
 });
 return {version:1,pageIndex,layers,camera:{perspective:1000,tiltDegrees:0},accessibility:{reducedMotion:'disable-depth-animation',keyboardNavigation:'document-order'},source:'observed-regions',publicationReady:false};
}

/**
 * Pure layout projection for an accessible, responsive depth preview.
 * Geometry is derived from observed bounds; no browser scripts or network access.
 */
export function projectDepthScene(scene,viewportWidth,{reducedMotion=false,maxTilt=8}={}){
 if(!scene||scene.version!==1||!Array.isArray(scene.layers)||scene.layers.length>100||scene.layers.some(l=>!l||![l.x,l.y,l.width,l.height,l.depth].every(finite)||l.x<0||l.y<0||l.width<=0||l.height<=0||l.depth<0||l.depth>100||l.x>10000||l.y>10000||l.width>10000||l.height>10000))throw Error('Invalid depth scene');
 if(!finite(viewportWidth)||viewportWidth<240||viewportWidth>10000)throw Error('Invalid viewport width');
 if(typeof reducedMotion!=='boolean'||!finite(maxTilt)||maxTilt<0||maxTilt>15)throw Error('Invalid projection settings');
 if(scene.camera&&(!finite(scene.camera.perspective)||scene.camera.perspective<100||scene.camera.perspective>10000||!finite(scene.camera.tiltDegrees)||Math.abs(scene.camera.tiltDegrees)>90))throw Error('Invalid depth camera');
 const contentWidth=Math.max(1,...scene.layers.map(l=>l.x+l.width));
 const scale=Math.min(1,viewportWidth/contentWidth);
 return {version:1,viewportWidth,scale,animationEnabled:!reducedMotion,
  camera:{perspective:Math.max(600,Math.round((scene.camera?.perspective||1000)*scale)),tiltDegrees:reducedMotion?0:clamp(scene.camera?.tiltDegrees||0,-maxTilt,maxTilt)},
  layers:scene.layers.map(layer=>({id:layer.id,role:layer.role,x:Math.round(layer.x*scale),y:Math.round(layer.y*scale),width:Math.max(1,Math.round(layer.width*scale)),height:Math.max(1,Math.round(layer.height*scale)),depth:reducedMotion?0:layer.depth,interactive:false}))};
}
