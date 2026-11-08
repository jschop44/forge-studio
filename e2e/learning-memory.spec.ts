import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('**/api/agents/jobs',route=>route.fulfill({json:{jobs:[]}}));
 await page.route('**/api/intelligence/metrics',route=>route.fulfill({json:{metrics:{}}}));
});

test('project feedback saves explicit outcomes and displays bounded review priorities',async({page})=>{
 let saved:Record<string,unknown>|undefined;
 await page.route('**/api/intelligence/memory**',async route=>{
  if(route.request().method()==='POST'){
   saved=route.request().postDataJSON();
   await route.fulfill({status:201,json:{ok:true}});
  }else{
   expect(new URL(route.request().url()).searchParams.get('projectId')).toBe('studio-1');
   await route.fulfill({json:{observations:[],summary:{total:4,scope:'returned-records',reviewPriorities:[{category:'navigation',helpful:3,total:4,action:'Prioritize owner review of navigation'}]}}});
  }
 });
 await page.goto('/intelligence');
 await page.getByLabel('Project ID',{exact:true}).fill('studio-1');
 await page.getByLabel('Observed result').fill('Customers found the contact link more easily.');
 await page.getByRole('button',{name:'Save feedback',exact:true}).click();
 await expect(page.getByText('Feedback saved.',{exact:true})).toBeVisible();
 expect(saved).toMatchObject({source:'owner-feedback',projectId:'studio-1',category:'navigation',outcome:'helpful'});
 await expect(page.getByText('Prioritize owner review of navigation',{exact:false})).toBeVisible();
 await expect(page.getByLabel('Observed result')).toHaveValue('');
});

test('feedback errors preserve the form without claiming it was saved',async({page})=>{
 await page.route('**/api/intelligence/memory**',route=>route.fulfill({status:503,json:{error:'Learning memory unavailable'}}));
 await page.goto('/intelligence');
 await page.getByLabel('Project ID',{exact:true}).fill('studio-2');
 await page.getByLabel('Observed result').fill('The revised navigation still needs review.');
 await page.getByRole('button',{name:'Save feedback',exact:true}).click();
 await expect(page.getByText('Learning memory unavailable',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Observed result')).toHaveValue('The revised navigation still needs review.');
 await expect(page.getByText('Feedback saved.',{exact:true})).toHaveCount(0);
});
