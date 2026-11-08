import type {AgentTask} from '../agents/types';

export type JobClaim={id:string;tenantId:string;attempt:number;lease:string};
export type JobSettlement={status:'completed'|'blocked'|'needs-approval';result:Record<string,unknown>|null;reason:string;next?:{id:string;kind:AgentTask['kind'];payload:Record<string,unknown>}};
export type QueueQuery=(text:string,parameters:unknown[])=>PromiseLike<Record<string,unknown>[]>;

/** One Postgres statement commits the result and child together, or neither.
 * The exact database lease and attempt prevent stale workers from settling reclaimed jobs.
 */
export async function settleAgentJob(query:QueueQuery,claim:JobClaim,settlement:JobSettlement){
 if(settlement.next&&settlement.status!=='completed')throw Error('Only completed stages may enqueue a successor');
 const rows=await query(`WITH finished AS (
  UPDATE forge_jobs SET status=$5,result=$6::jsonb,last_error=$7,updated_at=now()
  WHERE id=$1::uuid AND tenant_id=$2::uuid AND status='evaluating'
   AND updated_at=$3::timestamptz AND attempt=$4
  RETURNING id,tenant_id,source
 ), successor AS (
  INSERT INTO forge_jobs(id,tenant_id,parent_id,kind,source,payload)
  SELECT $8::uuid,tenant_id,id,$9::text,source,$10::jsonb FROM finished
  WHERE $9::text IS NOT NULL
  ON CONFLICT (parent_id,kind) WHERE parent_id IS NOT NULL DO NOTHING
  RETURNING id
 ) SELECT id FROM finished`,[
  claim.id,claim.tenantId,claim.lease,claim.attempt,settlement.status,
  settlement.result?JSON.stringify(settlement.result):null,settlement.reason,
  settlement.next?.id||null,settlement.next?.kind||null,
  settlement.next?JSON.stringify(settlement.next.payload):null
 ]);
 return rows.length===1;
}
