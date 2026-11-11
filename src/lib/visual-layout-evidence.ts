import { z } from "zod";

/** Visual measurements supplied by a trusted capture runner, not inferred
 * from a title or page text. No screenshot pixels are transferred here.
 */
export const VisualLayoutEvidenceSchema = z.object({
  sourceUrl: z.string().url().refine(x=>x.startsWith("https://")),
  viewport: z.object({
    width:z.number().int().min(320).max(3840),
    height:z.number().int().min(320).max(3840),
  }).strict(),
  /** Optional total document height measured by the capture runner, not a viewport estimate. */
  documentHeight:z.number().int().min(320).max(20000).optional(),
  regions:z.array(z.object({
    role:z.enum(["header","navigation","hero","main","section","footer"]),
    x:z.number().finite().min(0),
    y:z.number().finite().min(0),
    width:z.number().finite().positive(),
    height:z.number().finite().positive(),
    text:z.string().max(200).optional(),
  }).strict()).max(100),
  capturedAt:z.string().datetime({offset:true}),
}).strict().superRefine((value,ctx)=>{
  if(value.documentHeight!==undefined&&value.documentHeight<value.viewport.height)
    ctx.addIssue({code:"custom",path:["documentHeight"],message:"Document cannot be shorter than its viewport"});
  for (const [index,region] of value.regions.entries()) {
    // Browser captures may include sections below the initial viewport.
    // Restrict horizontal geometry to the viewport and vertical geometry to
    // the measured document or the fixed 20,000px capture safety bound.
    if (region.x+region.width>value.viewport.width+1 || region.y+region.height>(value.documentHeight??20000)+1) {
      ctx.addIssue({code:"custom",path:["regions",index],message:"Region extends outside captured page bounds"});
    }
  }
});


/** Exact union area: parent/child regions often overlap and must not inflate
 * the measured fraction beyond 100% of the observed document.
 */
function coveredArea(regions:readonly {x:number;y:number;width:number;height:number}[],width:number,height:number):number{
  const rectangles=regions.map(r=>({left:Math.min(width,r.x),right:Math.min(width,r.x+r.width),top:Math.min(height,r.y),bottom:Math.min(height,r.y+r.height)}));
  const xPositions=[...new Set([0,width,...rectangles.flatMap(r=>[r.left,r.right])])].sort((a,b)=>a-b);
  let area=0;
  for(let i=1;i<xPositions.length;i++){
    const x=xPositions[i-1],next=xPositions[i];
    if(next<=x)continue;
    const spans=rectangles.filter(r=>r.left<next&&r.right>x).map(r=>[r.top,r.bottom]).sort((a,b)=>a[0]-b[0]);
    let top=-1,bottom=-1,covered=0;
    for(const [start,end] of spans){
      if(end<=start)continue;
      if(top<0){top=start;bottom=end}
      else if(start<=bottom)bottom=Math.max(bottom,end);
      else{covered+=bottom-top;top=start;bottom=end}
    }
    if(top>=0)covered+=bottom-top;
    area+=(next-x)*covered;
  }
  return area;
}

export function summarizeVisualLayout(input:unknown) {
  const evidence=VisualLayoutEvidenceSchema.parse(input);
  const regions=evidence.regions;
  const hero=regions.find(r=>r.role==="hero");
  const documentHeight=evidence.documentHeight??Math.max(evidence.viewport.height,...regions.map(r=>r.y+r.height));
  return {
    regionCount:regions.length,
    heroPosition:hero ? {x:hero.x,y:hero.y,width:hero.width,height:hero.height} : null,
    navigationObserved:regions.some(r=>r.role==="navigation"),
    footerObserved:regions.some(r=>r.role==="footer"),
    viewport:evidence.viewport,
    documentHeight,
    coverageScope:"measured document geometry" as const,
    screenshotPixelsAnalyzed:false as const,
    heroAreaRatio:hero?Number((hero.width*hero.height/(evidence.viewport.width*evidence.viewport.height)).toFixed(3)):null,
    observedRoles:[...new Set(regions.map(r=>r.role))],
    regionCoverageRatio:Number((coveredArea(regions,evidence.viewport.width,documentHeight)/(evidence.viewport.width*documentHeight)).toFixed(3)),
  };
}
