import {test,expect} from '@playwright/test';
import {generateBusinessWebsite} from '../src/lib/business-site';
const genres=[
 'Coffee shop and cafe','Sporting goods retail','Healthcare and medical services','Pharmacy',
 'Restaurant and hospitality','Real estate','Health and wellness','Automotive','Fashion and luxury',
 'Technology','Education and tutoring','Home and trade services','Legal services','Financial services',
 'Beauty and personal care','Arts and creative services','Pet and animal care',
 'Events and seasonal attractions','Agriculture and farming','Manufacturing and industrial',
 'Logistics and transportation','Construction','Architecture','Nonprofit and community organization',
 'Accounting and bookkeeping','Insurance agency','Florist and garden center','Hardware store',
 'Bookshop and stationery','Hotel and travel','Museum and cultural center','Music lessons',
 'Childcare and early education','Professional consulting','Cleaning and maintenance',
 'Wedding planning','Fitness and sports training','Landscaping and outdoor services',
 'Furniture and interior design','Renewable energy','Marine and boating','Bicycle shop',
 'Outdoor recreation','Grocery and food market','Veterinary clinic','Dental practice',
 'Software development','Photography studio','Artisan crafts','Language translation services',
 'Family-friendly Halloween festival','Community library','Local newspaper','Research laboratory'
];
for(const genre of genres){
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  test(genre+' renders at '+viewport.width+'px',async({page})=>{
   await page.setViewportSize(viewport);
   const generated=generateBusinessWebsite({businessName:'Example Business',industry:genre,description:'A neighborhood business serving its local community.',services:['Customer support','Information']});
   await page.route('**/*',route=>route.request().resourceType()==='image'?route.abort():route.continue());
   for(const generatedPage of generated.pages){
    // Reset document and keyboard focus between independent generated pages.
    await page.goto('about:blank');
    await page.setContent(generatedPage.html,{waitUntil:'domcontentloaded'});
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
    expect(await page.locator('a[href="services.html"]').count()).toBeGreaterThanOrEqual(1);
    expect(await page.locator('body').evaluate(el=>el.scrollWidth),'overflow in '+genre+'/'+generatedPage.slug).toBeLessThanOrEqual(viewport.width+2);
    expect(await page.locator('img:not([alt])').count()).toBe(0);
    expect(await page.locator('a:not([href]), a[href=""], a[href="#"]').count()).toBe(0);
    expect(await page.locator('main').count()).toBe(1);
    expect(await page.locator('nav[aria-label="Main navigation"]').count()).toBe(1);
    expect(await page.locator('script:not([type="application/ld+json"])').count()).toBe(0);
    const links=page.locator('nav a');
    expect(await links.count()).toBeGreaterThanOrEqual(4);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    expect(await page.locator('a[href="contact.html"]').count()).toBeGreaterThanOrEqual(1);
   }
  });
 }
}
