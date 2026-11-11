import {test,expect} from '@playwright/test';
import {applyCapturedAppearance} from '../src/lib/captured-appearance';

for(const width of [390,1280]){
 test(`captured unavailable fonts use the observed fallback at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:800});
  const source='https://typography.example/';
  const capture={version:1,sourceUrl:source,capturedAt:'2026-11-11T12:00:00Z',viewport:{width:1280,height:800},warnings:[],pages:[{path:'/',title:'Typography',landmarks:[],interactions:[],designTokens:{backgroundColor:'#ffffff',textColor:'#111111',fontFamily:'MissingForgeBusinessFont, monospace',headingFontFamily:'MissingForgeHeadingFont, serif',headingFontSize:'48px',baseFontSize:'16px'}}]};
  const result=applyCapturedAppearance([{html:'<html><head></head><body><h1>Business heading</h1><p>Business details</p></body></html>'}],capture,source,'preserve');
  await page.setContent(result.pages[0].html);
  const rendered=await page.evaluate(()=>{
   const context=document.createElement('canvas').getContext('2d')!;
   const measure=(font:string)=>{context.font='20px '+font;return [context.measureText('WWWW').width,context.measureText('iiii').width]};
   const body=getComputedStyle(document.body).fontFamily;
   const heading=getComputedStyle(document.querySelector('h1')!).fontFamily;
   return {body,heading,bodyWidths:measure(body),headingWidths:measure(heading)};
  });
  expect(rendered.body).toMatch(/MissingForgeBusinessFont, monospace/);
  expect(rendered.heading).toMatch(/MissingForgeHeadingFont, serif/);
  expect(Math.abs(rendered.bodyWidths[0]-rendered.bodyWidths[1])).toBeLessThan(.01);
  expect(rendered.headingWidths[0]).toBeGreaterThan(rendered.headingWidths[1]);
 });
}
