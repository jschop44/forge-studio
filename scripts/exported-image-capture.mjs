/**
 * A full-page Chromium screenshot can leave below-the-fold lazy images blank
 * even when the exported HTML and image URLs are correct. Visit the actual
 * images at the requested viewport, decode them, and return to the top before
 * capturing. This tests the user-visible image path instead of guessing that
 * lazy images outside the viewport are broken.
 */
export async function primeExportImages(page,{maxImages=48,decodeTimeoutMs=7000}={}){
 const visible=page.locator('img:visible');
 const total=Math.min(await visible.count(),maxImages);
 for(let index=0;index<total;index++){
  const image=visible.nth(index);
  // Normal viewport scrolling triggers loading without rewriting user HTML.
  await image.scrollIntoViewIfNeeded({timeout:3500}).catch(()=>{});
 }
 const delivery=await page.evaluate(async timeout=>{
  const images=[...document.images].filter(img=>img.getClientRects().length>0);
  // decode() explicitly waits for image pixels, not only an HTTP response.
  await Promise.race([
   Promise.all(images.map(img=>img.decode().catch(()=>{}))),
   new Promise(resolve=>setTimeout(resolve,timeout))
  ]);
  return {
   visibleCount:images.length,
   loaded:images.filter(img=>img.complete&&img.naturalWidth>0).length,
   broken:images.filter(img=>img.complete&&img.naturalWidth===0).length,
   pending:images.filter(img=>!img.complete).length
  };
 },decodeTimeoutMs);
 await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
 // Give Chromium a paint frame after scrolling back before full-page capture.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 return {...delivery,inspectedCount:total,truncated:await visible.count()>maxImages};
}
