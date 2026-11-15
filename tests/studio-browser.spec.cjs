'use strict';
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173'});
test.setTimeout(60000);

test('original consumer homepage and Labs dropdown are reachable',async({page})=>{
 await page.goto('/');
 await expect(page.locator('#game')).toBeVisible();
 await expect(page.locator('#wildlife')).toBeAttached();
 const dropdown=page.locator('[data-labs-trigger]');
 await dropdown.click();
 await expect(page.locator('#labs-options a[href="/studio.html"]')).toBeVisible();
 await expect(page.locator('#labs-options a[href="/labs.html"]')).toBeVisible();
 await expect(page.locator('a[href="/solutions.html"]').first()).toBeAttached();
});
test('business visitors find team contact page rather than a mailto action',async({page})=>{
 await page.goto('/contact/');
 await expect(page.locator('#engineering')).toBeVisible();
 await expect(page.locator('#labs')).toBeAttached();
 await expect(page.locator('#support')).toBeAttached();
 expect(await page.locator('a[href^="mailto:"]').count()).toBe(0);
});
test('Strategy Lab runs examples and discovered observed rates',async({page})=>{
 await page.goto('/studio/strategy.html');
 const result=page.locator('#discovery-insights');
 await expect(result).toContainText('Which items may need replenishment');
 await page.locator('[data-demo="customers"]').click();
 await expect(result).toContainText('Where does the outcome differ');
 await page.locator('#discovery-outcome').selectOption('repeat_purchase');
 await expect(page.locator('#discovery-positive')).toBeVisible();
 await page.locator('#discovery-positive').selectOption('Yes');
 await page.locator('#discovery-analyze').click();
 await expect(result).toContainText('observed rate');
 await page.locator('[data-demo="strategic"]').click();
 await expect(result).toContainText('observed decisions suggest');
 await expect(page.locator('#solve-game')).toBeAttached();
});
test('Strategy Lab accepts new CSV with auto-schema',async({page})=>{
 await page.goto('/studio/strategy.html');
 const content='segment,orders,spend\nNew,1,30\nReturning,3,90\nNew,2,50\nReturning,5,155\nReturning,2,80\nNew,4,75\n';
 await page.locator('#discovery-upload').setInputFiles({name:'customers.csv',mimeType:'text/csv',buffer:Buffer.from(content)});
 await expect(page.locator('#discovery-dataset-name')).toContainText('customers.csv');
 await expect(page.locator('#discovery-schema-body')).toContainText('spend');
 await page.locator('#discovery-goal').selectOption('groups');
 await page.locator('#discovery-group').selectOption('segment');
 await page.locator('#discovery-outcome').selectOption('spend');
 await page.locator('#discovery-analyze').click();
 await expect(page.locator('#discovery-insights')).toContainText('Valid records analyzed');
});
test('Forecast Lab imports CSV and shows validation against a baseline',async({page})=>{
 await page.goto('/studio/forecast.html');
 const values=Array.from({length:26},(_,i)=>'2026-09-'+String(i+1).padStart(2,'0')+','+(80+i*3)).join('\n');
 await page.locator('#forecast-upload').setInputFiles({name:'weekly-visits.csv',mimeType:'text/csv',buffer:Buffer.from('date,visits\n'+values)});
 await expect(page.locator('#forecast-import-message')).toContainText('Imported 26 observations');
 await expect(page.locator('#forecast-business-summary')).toContainText('next value is estimated');
 await expect(page.locator('#forecast-backtest')).toContainText('average miss');
});
test('Image Studio supports one-click look and destination-sized download',async({page})=>{
 await page.goto('/studio/image-editor.html');
 await page.locator('[data-image-look="social"]').click();
 await expect(page.locator('#editor-canvas')).toBeVisible();
 await page.locator('#image-export-size').selectOption('square');
 await page.locator('#image-check').click();
 await expect(page.locator('#image-check-result')).toContainText('transparent space');
 const download=page.waitForEvent('download');
 await page.locator('#export-png').click();
 expect((await download).suggestedFilename()).toContain('1080x1080');
});
test('Vector Studio template loads and PNG export works',async({page})=>{
 await page.goto('/studio/vector.html');
 await page.locator('[data-vector-template="badge"]').click();
 await expect(page.locator('#vector-layers')).toContainText('Label border');
 await page.locator('#vector-export-size').selectOption('square');
 await page.locator('#vector-preflight').click();
 await expect(page.locator('#vector-preflight-results')).toContainText('preflight');
 const download=page.waitForEvent('download');
 await page.locator('#vector-export-png').click();
 expect((await download).suggestedFilename()).toContain('1080x1080');
});
test('Vector selected shape has direct resize handles',async({page})=>{
 await page.goto('/studio/vector.html');
 await page.locator('[data-vector-template="badge"]').click();
 await page.locator('#vector-layers button').filter({hasText:'Label border'}).click();
 const field=page.locator('[data-property="w"]');
 const initial=Number(await field.inputValue());
 const handle=page.locator('#vector-stage [data-resize-handle="se"]');
 await expect(handle).toBeVisible();
 const box=await handle.boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(box.x+box.width/2+55,box.y+box.height/2+35,{steps:6});
 await page.mouse.up();
 console.log('VECTOR DRAG CHECK:', 'original',initial,'current',await field.inputValue(),'status',await page.locator('#vector-status').textContent());
 await expect.poll(async()=>Number(await field.inputValue())).toBeGreaterThan(initial);
});
test('Visual business explorer shows tracking scenario',async({page})=>{
 await page.goto('/studio/strategy.html');
 await page.locator('[data-demo="movement"]').click();
 await expect(page.locator('#discovery-insights')).toContainText('Where could');
 await expect(page.locator('#discovery-insights svg[role="img"]')).toBeVisible();
 await expect(page.locator('#discovery-insights')).toContainText('Scenario location');
});
test('Studio hub launches separate full editors',async({page})=>{
 await page.goto('/studio.html');
 await expect(page.locator('#editor-canvas')).toHaveCount(0);
 await expect(page.locator('a[href="/studio/image-editor.html"]').first()).toBeVisible();
 await page.locator('a[href="/studio/image-editor.html"]').first().click();
 await expect(page).toHaveURL(/\/studio\/image-editor.html/);
 await expect(page.locator('#editor-canvas')).toBeAttached();
});
test('Fiddle has working isolated preview and friendly sample',async({page})=>{
 await page.goto('/studio/ai.html#fiddle');
 await page.locator('[data-fiddle-preset="poster"]').click();
 await expect(page.frameLocator('#fiddle-preview').locator('h1')).toContainText('MAKE');
 await page.locator('#fiddle-tab-js').click();
 await expect(page.locator('#fiddle-js')).toBeVisible();
 await expect(page.locator('#ai-local-start')).toBeVisible();
 await page.locator('#fiddle-tab-html').click();
 await expect(page.locator('#fiddle-html')).toBeVisible();
});
test('mobile visitor can open Labs menu without losing Blobby',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:4173/');
 await expect(page.locator('#game')).toBeVisible();
 await page.locator('[data-labs-trigger]').click();
 await expect(page.locator('#labs-options a[href="/studio.html"]')).toBeVisible();
 await context.close();
});
