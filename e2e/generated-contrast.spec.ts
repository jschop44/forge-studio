import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
test('baseball product copy and section labels remain readable on desktop and mobile',async({page})=>{
 await page.route('https://images.unsplash.com/**',route=>route.abort());
 const pages=generateBusinessWebsite({businessName:'Northstar Baseball',industry:'Baseball Sports Equipment Retail',description:'A baseball equipment and memorabilia shop offering gloves, bats and balls.',services:['Baseball bats','Gloves'],experienceStyle:'standard'}).pages;
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});await page.setContent(pages[0].html,{waitUntil:'domcontentloaded'});
  const contrasts=await page.locator('.service-copy h2,.service-copy p,.service-copy a,.section-heading .eyebrow').evaluateAll(nodes=>{
   const luminance=(color:string)=>{const channels=(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]};
   return nodes.map(node=>{let parent:Element|null=node;let background='';while(parent){background=getComputedStyle(parent).backgroundColor;if(background!=='rgba(0, 0, 0, 0)'&&background!=='transparent')break;parent=parent.parentElement}const a=luminance(getComputedStyle(node).color),b=luminance(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
  });
  expect(contrasts.length).toBeGreaterThan(4);for(const contrast of contrasts)expect(contrast).toBeGreaterThanOrEqual(4.5);
 }
});
