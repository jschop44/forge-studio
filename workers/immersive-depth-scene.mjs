/** Deterministic, script-free depth scene derived from captured visual regions. */
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export function buildDepthScene(blueprint,pageIndex=0){
 if(!blueprint||blueprint.version!==1||!Array.isArray(blueprint.pages))throw Error('Invalid blueprint');
 if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=blueprint.pages.length)throw Error('Invalid page index');
 const page=blueprint.pages[pageIndex];
 const regions=Array.isArray(page.regions)?page.regions.slice(0,100):[];
 const layers=regions.flatMap((region,index)=>{
  const b=region?.bounds;
  if(!b||![b.x,b.y,b.width,b.height].every(finite)||b.width<=0||b.height<=0||b.x<0||b.y<0)return [];
  const role=['hero','navigation','footer','section','content','header','main','nav'].includes(region.type)?region.type:'content';
  const depth=role==='hero'?24:role==='navigation'?8:role==='footer'?2:12;
  return [{id:'layer-'+index,role,x:clamp(b.x,0,10000),y:clamp(b.y,0,10000),width:clamp(b.width,1,10000),height:clamp(b.height,1,10000),depth,interactive:false}];
 });
 return {version:1,pageIndex,layers,camera:{perspective:1000,tiltDegrees:0},accessibility:{reducedMotion:'disable-depth-animation',keyboardNavigation:'document-order'},source:'observed-regions',publicationReady:false};
}
