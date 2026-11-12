import {test,expect} from '@playwright/test';
import {collectBrowserQualityEvidence} from '../src/lib/browser-quality-evidence';
test('browser quality collector detects missing images, dead anchors and horizontal overflow',async({page})=>{
 await page.setContent('<!doctype html><html><body><main style="width:200vw"><h1>Store</h1><img src="/nonexistent.jpg"><a href="#missing">Read</a></main></body></html>');
 await page.locator('img').evaluate(img=>new Promise<void>(resolve=>{if((img as HTMLImageElement).complete)return resolve();img.addEventListener('error',()=>resolve(),{once:true});}));
 const evidence=await page.evaluate(collectBrowserQualityEvidence);
 expect(evidence.brokenImages).toHaveLength(1);
 expect(evidence.brokenLinks).toEqual(['#missing']);
 expect(evidence.overflowPx).toBeGreaterThan(0);
 expect(evidence.imageAltMissing).toBe(1);
});
test('browser quality collector accepts valid visual pages',async({page})=>{
 await page.setContent('<!doctype html><html><body><h1>Store</h1><img alt="Product" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\'%3E%3C/svg%3E"><a href="#shop">Shop</a><section id="shop">Products</section></body></html>');
 const evidence=await page.evaluate(collectBrowserQualityEvidence);
 expect(evidence.brokenImages).toEqual([]);
 expect(evidence.brokenLinks).toEqual([]);
 expect(evidence.overflowPx).toBe(0);
});
