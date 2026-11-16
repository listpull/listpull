'use strict';
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173'});
test.setTimeout(60000);

test('consistent ListPull nav and direct application links on public pages',async({page})=>{
 const routes=['/','/labs.html','/studio.html','/engineering.html','/solutions.html',
 '/studio/image-editor.html','/studio/video-editor.html','/studio/ai.html',
 '/studio/strategy.html','/studio/forecast.html','/blobby.html',
 '/blobby/wiki/','/contact/','/about-listpull/','/policies/privacy-policy/'];
 const expected=['/studio.html','/studio/image-editor.html','/studio/video-editor.html',
 '/studio/ai.html#assistant','/studio/ai.html#code-editor','/studio/strategy.html',
 '/studio/forecast.html','/blobby.html','/labs.html#wildlife','/',
 '/engineering.html','/labs.html'];
 for(const route of routes){
  await page.goto(route);
  const header=page.locator('#lp-global-navigation');
  await expect(header).toHaveCount(1);
  await expect(page.locator('.lp-site-header .lp-brand')).toHaveAttribute('href','/');
  const headerLinks=await page.locator('.lp-nav-links a').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  expect(headerLinks[0],route+' first navbar link').toBe('/studio.html');
  expect(headerLinks.at(-1),route+' engineering link').toBe('/engineering.html');
  const strip=await page.locator('.lp-app-strip .lp-app-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  expect(strip,route+' direct app links').toEqual(expected);
  const grid=await page.locator('#labs-options .lp-app-tile').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));
  expect(grid,route+' Labs apps').toEqual(expected);
  await expect(page.locator('.lp-labs-trigger')).toHaveText(/ListPull Labs/);
  await expect(page.locator('.lp-app-popover')).toBeHidden();
 }
});

test('icon launcher and Labs popup directly reach individual tools',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#game')).toBeVisible();
 await expect(page.locator('.lp-app-strip .lp-app-blobby img')).toHaveAttribute('src','/blobby-no-bg.webp');
 await expect(page.locator('.lp-app-strip .lp-app-home img')).toHaveAttribute('src','/favicon.ico');
 const open=page.locator('[data-labs-trigger]');
 await open.click();
 await expect(open).toHaveAttribute('aria-expanded','true');
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

test('mobile menu, full launcher and app directory have compact non-overflowing layout',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 for(const route of ['/','/labs.html','/studio.html','/studio/video-editor.html']){
  await page.goto('http://127.0.0.1:4173'+route);
  await expect(page.locator('.lp-site-header')).toBeVisible();
  const frame=await page.evaluate(()=>{
   const nav=document.querySelector('.lp-site-header').getBoundingClientRect();
   const ribbon=document.querySelector('.lp-app-strip').getBoundingClientRect();
   return {window:window.innerWidth,navLeft:nav.left,navRight:nav.right,
    ribbonLeft:ribbon.left,ribbonRight:ribbon.right,appCount:
    document.querySelectorAll('.lp-app-strip .lp-app-tile').length};
  });
  expect(frame.navLeft,route).toBeGreaterThanOrEqual(-1);
  expect(frame.navRight,route).toBeLessThanOrEqual(frame.window+1);
  expect(frame.ribbonRight,route).toBeLessThanOrEqual(frame.window+1);
  expect(frame.appCount).toBe(12);
 }
 await page.goto('http://127.0.0.1:4173/');
 await page.locator('[data-labs-trigger]').click();
 const popover=page.locator('#labs-options');
 await expect(popover).toBeVisible();
 const box=await popover.boundingBox();
 expect(box.x).toBeGreaterThanOrEqual(0);
 expect(box.x+box.width).toBeLessThanOrEqual(391);
 await expect(popover.locator('a[href="/studio/video-editor.html"]')).toBeVisible();
 await context.close();
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
