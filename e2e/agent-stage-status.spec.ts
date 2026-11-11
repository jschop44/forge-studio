import {test,expect} from '@playwright/test';

test('intelligence dashboard shows durable six-engine stage counts without claiming completion',async({page})=>{
 await page.route('**/api/agents/jobs',route=>route.fulfill({status:200,json:{jobs:[]}}));
 await page.route('**/api/intelligence/metrics',route=>route.fulfill({status:200,json:{
  metrics:{jobs:4,completed:3,approvals:1,blocked:0},
  pipeline:{scope:'tenant-job-records',stages:[
   {kind:'lead-enrichment',pending:0,evaluating:0,completed:0,needsApproval:0,blocked:0,latestAt:null},
   {kind:'website-audit',pending:0,evaluating:0,completed:0,needsApproval:0,blocked:0,latestAt:null},
   {kind:'site-plan',pending:0,evaluating:0,completed:1,needsApproval:0,blocked:0,latestAt:'2026-11-11T00:00:00Z'},
   {kind:'site-generation',pending:0,evaluating:0,completed:1,needsApproval:0,blocked:0,latestAt:'2026-11-11T00:00:00Z'},
   {kind:'quality-review',pending:0,evaluating:0,completed:1,needsApproval:0,blocked:0,latestAt:'2026-11-11T00:00:00Z'},
   {kind:'publish-review',pending:0,evaluating:0,completed:0,needsApproval:1,blocked:0,latestAt:'2026-11-11T00:00:00Z'}
  ]}
 }}));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/intelligence');
 const table=page.getByRole('table',{name:'Durable job counts by engine'});
 await expect(table).toBeVisible();
 await expect(table.getByRole('row')).toHaveCount(7);
 await expect(table.getByRole('row',{name:/lead enrichment/i})).toContainText('0');
 await expect(table.getByRole('row',{name:/publish review/i})).toContainText('1');
 await expect(page.getByText('Actual tenant-owned database records',{exact:false})).toBeVisible();
 await expect(page.getByText('A recorded job does not by itself verify',{exact:false})).toBeVisible();
 const panel=page.getByRole('region',{name:'Six-stage durable job evidence'});
 const bounds=await panel.boundingBox();
 expect(bounds).not.toBeNull();
 expect(bounds!.width).toBeLessThanOrEqual(390);
});
