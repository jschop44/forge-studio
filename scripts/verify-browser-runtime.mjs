import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

// Actual browser startup verifies native library availability. Never suppress
// Playwright's host dependency validation or substitute a different executable.
const browser=await chromium.launch();
try{
 const page=await browser.newPage();
 await page.setContent('<!doctype html><html><head><style>body{font:20px sans-serif}</style></head><body><h1>Forge browser readiness</h1></body></html>');
 const heading=page.getByRole('heading',{name:'Forge browser readiness'});
 assert.equal(await heading.isVisible(),true,'Chromium must render visible content');
 const box=await heading.boundingBox();
 assert.ok(box&&box.width>0&&box.height>0,'Rendered content must have nonzero dimensions');
 console.log('Installed Chromium launched and rendered successfully. Full browser acceptance follows.');
}finally{
 await browser.close();
}
