import {AgentTaskSchema,type AgentTask,type AgentDecision} from './types';
const transitions:Record<AgentTask['kind'],AgentTask['kind']|null>={
 'lead-enrichment':'website-audit','website-audit':'site-plan','site-plan':'site-generation',
 'site-generation':'quality-review','quality-review':'publish-review','publish-review':null
};
export function planNextTask(input:unknown):AgentDecision{
 const task=AgentTaskSchema.parse(input);
 if(task.kind==='publish-review')return {taskId:task.id,status:'needs-approval',reason:'Publication requires owner approval'};
 if(task.kind==='website-audit'&&!task.payload.website)return {taskId:task.id,status:'blocked',reason:'A verified public website URL is required'};
 if(task.kind==='site-generation'&&!task.payload.approvedPlan)return {taskId:task.id,status:'needs-approval',reason:'A site plan must be approved before generation'};
 const next=transitions[task.kind];
 return {taskId:task.id,status:'ready',reason:next?'Ready to advance to '+next:'No further automatic tasks',...(next?{next}:{})};
}
