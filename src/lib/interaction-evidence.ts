import {z} from 'zod';

/** Static affordances discovered by a browser worker. These are observations,
 * not proof that an action works. No interaction is executed here. */
export const InteractionEvidenceSchema=z.array(z.object({
 kind:z.enum(['link','button','form']),
 label:z.string().max(100),
 target:z.string().max(300).optional(),
 verified:z.literal(false),
}).strict()).max(80);

export function summarizeInteractionEvidence(input:unknown){
 const items=InteractionEvidenceSchema.parse(input);
 const links=items.filter(item=>item.kind==='link');
 const buttons=items.filter(item=>item.kind==='button');
 const forms=items.filter(item=>item.kind==='form');
 const emptyLabels=items.filter(item=>!item.label.trim()).length;
 const anchorsWithoutTargets=links.filter(item=>!item.target?.trim()).length;
 return {
  observed:items.length,links:links.length,buttons:buttons.length,forms:forms.length,
  unlabeledControls:emptyLabels,linksWithoutTargets:anchorsWithoutTargets,
  requiresFunctionalVerification:items.length>0,
  interactionsExecuted:false as const,
  limitations:['Static DOM affordances only; click outcomes, submissions, and accessibility behavior have not been verified'],
 };
}
