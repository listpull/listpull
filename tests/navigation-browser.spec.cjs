'use strict';
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173'});
test.setTimeout(60000);

test('public pages have one sticky site nav; only overview pages have an app strip',async({page})=>{
 const routes=['/','/labs.html','/studio.html','/engineering.html','/solutions.html',
  '/studio/image-editor.html','/studio/video-editor.html','/studio/ai.html',
  '/studio/strategy.html','/studio/forecast.html','/blobby.html',
  '/blobby/wiki/','/contact/','/about-listpull/','/policies/privacy-policy/'];
 const toolRoutes=new Set(['/studio/image-editor.html','/studio/video-editor.html',
  '/studio/ai.html','/studio/strategy.html','/studio/forecast.html']);
 const overviewRoutes=new Set(['/','/studio.html','/engineering.html','/solutions.html']);
 const expected=['/studio.html','/studio/image-editor.html','/studio/video-editor.html',
  '/studio/ai.html#assistant','/studio/ai.html#code-editor','/studio/strategy.html',
  '/studio/forecast.html','/blobby.html','/labs.html#wildlife','/',
  '/engineering.html','/labs.html'];
 for(const route of routes){
  await page.goto(route);
  const host=page.locator('#lp-global-navigation');
  await expect(host).toHaveCount(1);
  if(toolRoutes.has(route)){
   await expect(host).toHaveClass(/lp-tool-navigation/);
   await expect(page.locator('.lp-site-header')).toHaveCount(0);
   await expect(page.locator('.lp-app-strip')).toHaveCount(0);
   await expect(page.locator(
    'header.creative-topbar #lp-global-navigation, header.video-header #lp-global-navigation, header.vector-header #lp-global-navigation'
   )).toHaveCount(1);
   await expect(page.locator('.lp-nav-actions')).toHaveCount(1);
  }else{
   await expect(host).toHaveClass(/lp-global-navigation/);
   await expect(page.locator('.lp-site-header .lp-brand')).toHaveAttribute('href','/');
   const headerLinks=await page.locator('.lp-nav-links a').evaluateAll(
    nodes=>nodes.map(node=>node.getAttribute('href')));
   expect(headerLinks[0],route+' first navbar link').toBe('/studio.html');
   expect(headerLinks.at(-1),route+' engineering link').toBe('/engineering.html');
   const strip=await page.locator('.lp-app-strip .lp-app-tile').evaluateAll(
    nodes=>nodes.map(node=>node.getAttribute('href')));
   expect(strip,route+' overview links only').toEqual(overviewRoutes.has(route)?expected:[]);
  }
  const grid=await page.locator('#labs-options .lp-app-tile').evaluateAll(
   nodes=>nodes.map(node=>node.getAttribute('href')));
  expect(grid,route+' Labs apps').toEqual(expected);
  await expect(page.locator('.lp-labs-trigger')).toHaveText(/ListPull Labs/);
  await expect(page.locator('.lp-app-popover')).toBeHidden();
 }
});

test('public navigation is already present in the HTML before any JavaScript runs',async({page})=>{
 const routes=['/','/labs.html','/studio.html','/engineering.html','/solutions.html',
  '/studio/image-editor.html','/studio/video-editor.html','/studio/ai.html',
  '/studio/strategy.html','/studio/forecast.html','/blobby.html',
  '/blobby/wiki/','/contact/','/about-listpull/','/policies/privacy-policy/',
  '/policies/terms-of-service/','/about-blobby.html','/contact-us.html',
  '/contact-us/','/pages/contact/','/pages/privacy-policy/',
  '/pages/terms-of-service/','/privacy-policy.html','/support/',
  '/support/privacy-policy/','/support/terms-of-service/'];
 for(const route of routes){
  const response=await page.request.get(route);
  expect(response.ok(),route+' returns a page').toBeTruthy();
  const html=await response.text();
  expect(html,route+' contains HTML site navigation').toContain('id="lp-global-navigation"');
  expect(html,route+' contains 12 direct application links').toContain('class="lp-app-grid"');
  expect(html,route+' contains direct Labs links').toContain('href="/labs.html"');
  expect(html,route+' has a native Labs popover').toContain('popovertarget="labs-options"');
  expect(html,route+' does not load a nav injection script').not.toContain('/assets/listpull-navigation.js');
 }
});

test('site navigation works with JavaScript disabled',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:1280,height:800}});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#lp-global-navigation .lp-brand')).toBeVisible();
 await expect(page.locator('#lp-app-strip .lp-app-tile')).toHaveCount(12);
 await page.locator('.lp-labs-trigger').click();
 await expect(page.locator('#labs-options')).toBeVisible();
 await expect(page.locator('#labs-options a[href="/studio.html"]')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('#labs-options')).toBeHidden();
 await page.locator('#lp-app-strip .lp-app-creative').click();
 await expect(page).toHaveURL(/\/studio\/image-editor\.html$/);
 await expect(page.locator('header.creative-topbar .lp-nav-actions')).toBeVisible();
 await context.close();
});

test('icon launcher and Labs popup directly reach individual tools',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#game')).toBeVisible();
 await expect(page.locator('.lp-app-strip .lp-app-blobby img')).toHaveAttribute('src','/blobby-no-bg.webp');
 await expect(page.locator('.lp-app-strip .lp-app-home img')).toHaveAttribute('src','/favicon.ico');
 const open=page.locator('.lp-labs-trigger');
 await open.click();
 await expect(open).toHaveAttribute('popovertarget','labs-options');
 await expect(page.locator('#labs-options')).toBeVisible();
 await expect(page.locator('#labs-options .lp-app-tile')).toHaveCount(12);
 await expect(page.locator('#labs-options .lp-app-tile').first()).toHaveAttribute('href','/studio.html');
 await expect(page.locator('#labs-options .lp-app-tile').last()).toHaveAttribute('href','/labs.html');
 await page.keyboard.press('Escape');
 await expect(page.locator('#labs-options')).toBeHidden();
 await expect(open).toBeFocused();
 await page.locator('.lp-app-strip .lp-app-creative').click();
 await expect(page).toHaveURL(/\/studio\/image-editor\.html$/);
 await expect(page.locator('.creative-main')).toBeVisible();
});

test('mobile navigation, tool actions and app menus fit inside the viewport',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const routes=['/','/labs.html','/studio.html','/studio/image-editor.html','/studio/video-editor.html','/studio/ai.html'];
 for(const route of routes){
  await page.goto('http://127.0.0.1:4173'+route);
  const isTool=route.startsWith('/studio/');
  const headerSelector=isTool?'header.creative-topbar, header.video-header, header.vector-header':'.lp-site-header';
  await expect(page.locator(headerSelector)).toBeVisible();
  const frame=await page.evaluate(selector=>{
   const nav=document.querySelector(selector).getBoundingClientRect();
   const strip=document.querySelector('.lp-app-strip')?.getBoundingClientRect();
   const actions=document.querySelector('.lp-nav-actions').getBoundingClientRect();
   return {window:window.innerWidth,navLeft:nav.left,navRight:nav.right,
    stripLeft:strip?.left,stripRight:strip?.right,appCount:
    document.querySelectorAll('.lp-app-strip .lp-app-tile').length,
    actionsRight:actions.right};
  },headerSelector);
  expect(frame.navLeft,route).toBeGreaterThanOrEqual(-1);
  expect(frame.navRight,route).toBeLessThanOrEqual(frame.window+1);
  expect(frame.actionsRight,route).toBeLessThanOrEqual(frame.window+1);
  if(route==='/'||route==='/studio.html'){
   expect(frame.stripRight,route).toBeLessThanOrEqual(frame.window+1);
   expect(frame.appCount,route).toBe(12);
  }else expect(frame.appCount,route).toBe(0);
 }
 await page.goto('http://127.0.0.1:4173/');
 await page.locator('.lp-labs-trigger').click();
 const popover=page.locator('#labs-options');
 await expect(popover).toBeVisible();
 const box=await popover.boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(391);
 await expect(popover.locator('a[href="/studio/video-editor.html"]')).toBeVisible();
 await context.close();
});

test('only the main site navbar sticks while the overview app strip scrolls away',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/');
 const host=page.locator('#lp-global-navigation');
 const strip=page.locator('#lp-app-strip');
 await expect(host).toHaveCount(1);
 await expect(strip).toHaveCount(1);
 await page.evaluate(()=>window.scrollTo(0,500));
 await page.waitForFunction(()=>window.scrollY>=400);
 const positions=await page.evaluate(()=>({
  nav:document.querySelector('#lp-global-navigation').getBoundingClientRect().top,
  strip:document.querySelector('#lp-app-strip').getBoundingClientRect().bottom
 }));
 expect(positions.nav).toBeGreaterThanOrEqual(-2);
 expect(positions.nav).toBeLessThanOrEqual(12);
 expect(positions.strip).toBeLessThan(0);
});

test('every studio tool keeps its own header and working Labs menu',async({page})=>{
 const paths=['/studio/image-editor.html','/studio/video-editor.html',
  '/studio/ai.html','/studio/strategy.html','/studio/forecast.html'];
 for(const route of paths){
  await page.goto(route);
  await expect(page.locator('.lp-site-header,.lp-app-strip')).toHaveCount(0);
  await expect(page.locator('header .lp-nav-actions')).toHaveCount(1);
  await expect(page.locator('#lp-global-navigation')).toHaveCount(1);
  await expect(page.locator('#lp-global-navigation')).toHaveCSS('position','relative');
  const trigger=page.locator('.lp-labs-trigger');
  await trigger.click();
  await expect(page.locator('#labs-options')).toBeVisible();
  await expect(page.locator('#labs-options a[href="/studio.html"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#labs-options')).toBeHidden();
  await expect(trigger).toBeFocused();
 }
});

test('Labs is a product directory rather than a duplicate Studio hub',async({page})=>{
 await page.goto('/labs.html');
 await expect(page.getByRole('heading',{name:/Play\. Create\./})).toBeVisible();
 const cards=page.locator('.lp-labs-app-card');
 await expect(cards).toHaveCount(6);
 const urls=await cards.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
 expect(urls).toEqual(['/studio/image-editor.html','/studio/video-editor.html',
 '/studio/ai.html#assistant','/studio/ai.html#code-editor',
 '/studio/strategy.html','/studio/forecast.html']);
 await expect(page.locator('#blobby')).toHaveAttribute('href','/blobby.html');
 await expect(page.locator('#wildlife')).toHaveAttribute('href','https://www.youtube.com/@listpull');
 await expect(page.locator('.lp-labs-action').first()).toHaveAttribute('href','/studio.html');
 await page.locator('.lp-labs-app-card').first().click();
 await expect(page).toHaveURL(/\/studio\/image-editor\.html$/);
});
