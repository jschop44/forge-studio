import test from 'node:test';
import assert from 'node:assert/strict';
import {agentStages,summarizeDurableStages} from '../src/lib/agents/pipeline-observability';

test('all six stages appear even when only part of the workflow has persisted records',()=>{
 const report=summarizeDurableStages([
  {kind:'site-plan',status:'completed',total:1,last_updated:'2026-11-10T23:00:00Z'},
  {kind:'site-generation',status:'completed',total:'1',last_updated:'2026-11-11T00:00:00Z'},
  {kind:'quality-review',status:'completed',total:1,last_updated:'2026-11-11T00:30:00Z'},
  {kind:'publish-review',status:'needs-approval',total:1,last_updated:'2026-11-11T00:45:00Z'}
 ]);
 assert.equal(report.scope,'tenant-job-records');
 assert.deepEqual(report.stages.map(row=>row.kind),[...agentStages]);
 assert.equal(report.stages[0].completed,0,'no lead-enrichment completion must be inferred');
 assert.equal(report.stages[1].completed,0,'no website-audit completion must be inferred');
 assert.equal(report.stages[2].completed,1);
 assert.equal(report.stages[5].needsApproval,1);
 assert.equal(report.stages[5].completed,0,'approval is not publication');
});
test('accumulates pending, active, blocked and approved stages with their last update',()=>{
 const result=summarizeDurableStages([
  {kind:'website-audit',status:'pending',total:'2',last_updated:'2026-11-09T00:00:00Z'},
  {kind:'website-audit',status:'evaluating',total:1,last_updated:'2026-11-11T00:00:00Z'},
  {kind:'website-audit',status:'blocked',total:3,last_updated:'2026-11-10T00:00:00Z'}
 ]);
 const audit=result.stages[1];
 assert.equal(audit.pending,2);assert.equal(audit.evaluating,1);assert.equal(audit.blocked,3);
 assert.equal(audit.latestAt,'2026-11-11T00:00:00.000Z');
});
test('ignores unknown, malformed, negative and noninteger aggregate rows without inflating counts',()=>{
 const result=summarizeDurableStages([
  null,{}, {kind:'unknown',status:'completed',total:700},
  {kind:'site-plan',status:'completed',total:-2},
  {kind:'site-plan',status:'completed',total:'1.5'},
  {kind:'site-plan',status:'completed',total:Infinity},
  {kind:'site-plan',status:'unrecognized',total:500}
 ]);
 assert.ok(result.stages.every(stage=>stage.pending+stage.evaluating+stage.completed+stage.needsApproval+stage.blocked===0));
 assert.equal(summarizeDurableStages(null).stages.length,6);
});
