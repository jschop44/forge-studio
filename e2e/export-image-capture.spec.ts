import {test,expect} from '@playwright/test';
// @ts-ignore - standalone JS browser harness shares its runtime export with acceptance.
import {primeExportImages} from '../scripts/exported-image-capture.mjs';

test('export screenshots scroll to and decode below-the-fold lazy images',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><rect width="640" height="320" fill="#3478b7"/></svg>';
 await page.route('https://forge-photo.test/**',route=>route.fulfill({status:200,contentType:'image/svg+xml',body:svg}));
 await page.setContent('<html><body style="margin:0">'+
  '<h1>Storefront</h1><div style="height:4200px"></div>'+
  '<section aria-label="Photos">'+
  '<img loading="lazy" src="https://forge-photo.test/first.svg" width="640" height="320" alt="Photo one">'+
  '<img loading="lazy" src="https://forge-photo.test/second.svg" width="640" height="320" alt="Photo two">'+
  '<img loading="lazy" src="https://forge-photo.test/third.svg" width="640" height="320" alt="Photo three">'+
  '</section></body></html>');
 const result=await primeExportImages(page);
 expect(result.truncated).toBe(false);
 expect(result.inspectedCount).toBe(3);
 expect(result.visibleCount).toBe(3);
 expect(result.loaded).toBe(3);
 expect(result.broken).toBe(0);
 expect(result.pending).toBe(0);
 expect(await page.evaluate(()=>scrollY)).toBe(0);
 expect((await page.screenshot({fullPage:true})).byteLength).toBeGreaterThan(500);
});

test('failed visible images are surfaced rather than hidden as still lazy',async({page})=>{
 await page.route('https://forge-photo.test/broken.svg',route=>route.fulfill({status:404,body:'missing'}));
 await page.setContent('<body><div style="height:2200px"></div><img loading="lazy" src="https://forge-photo.test/broken.svg" width="400" height="250" alt="Missing" /></body>');
 const result=await primeExportImages(page);
 expect(result.visibleCount).toBe(1);
 expect(result.loaded).toBe(0);
 expect(result.broken).toBe(1);
 expect(result.pending).toBe(0);
});
