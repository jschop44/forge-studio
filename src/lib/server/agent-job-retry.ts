import type {JobClaim,QueueQuery} from './agent-job-settlement';

/** Fence retry scheduling to the same lease as successful settlement. */
export async function retryAgentJob(query:QueueQuery,claim:JobClaim,delaySeconds:number){
 if(!Number.isInteger(delaySeconds)||delaySeconds<1||delaySeconds>3600)throw Error('Invalid retry delay');
 const rows=await query(`UPDATE forge_jobs SET status='pending',attempt=attempt+1,
  available_at=now()+($5::int*interval '1 second'),updated_at=now(),last_error='AI provider temporarily unavailable; retry scheduled'
  WHERE id=$1::uuid AND tenant_id=$2::uuid AND status='evaluating'
   AND updated_at=$3::timestamptz AND attempt=$4 AND attempt<max_attempts
  RETURNING id`,[claim.id,claim.tenantId,claim.lease,claim.attempt,delaySeconds]);
 return rows.length===1;
}
