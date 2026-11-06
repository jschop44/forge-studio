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
  for (const [index,region] of value.regions.entries()) {
    if (region.x+region.width>value.viewport.width+1 || region.y+region.height>value.viewport.height+1) {
      ctx.addIssue({code:"custom",path:["regions",index],message:"Region extends outside viewport"});
    }
  }
});

export function summarizeVisualLayout(input:unknown) {
  const evidence=VisualLayoutEvidenceSchema.parse(input);
  const regions=evidence.regions;
  const hero=regions.find(r=>r.role==="hero");
  return {
    regionCount:regions.length,
    heroPosition:hero ? {x:hero.x,y:hero.y,width:hero.width,height:hero.height} : null,
    navigationObserved:regions.some(r=>r.role==="navigation"),
    footerObserved:regions.some(r=>r.role==="footer"),
    viewport:evidence.viewport,
    screenshotPixelsAnalyzed:false as const,
    heroAreaRatio:hero?Number((hero.width*hero.height/(evidence.viewport.width*evidence.viewport.height)).toFixed(3)):null,
    observedRoles:[...new Set(regions.map(r=>r.role))],
    regionCoverageRatio:Number((regions.reduce((sum,r)=>sum+r.width*r.height,0)/(evidence.viewport.width*evidence.viewport.height)).toFixed(3)),
  };
}
