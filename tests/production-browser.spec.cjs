'use strict';
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173'});
test.setTimeout(90000);

test('wildlife production page plays the actual clip and restores the still on pause',async({page})=>{
  await page.goto('/wildlife-production.html');
  await expect(page.locator('h1')).toContainText('Real wildlife');
  const wrapper=page.locator('.production-video-wrap');
  const poster=wrapper.locator('.production-poster');
  const video=wrapper.locator('video');
  await expect(poster).toBeVisible();
  await expect(video).toBeHidden();
  await expect(wrapper.locator('.production-play-button')).toBeVisible();
  await expect(wrapper.locator('source')).toHaveAttribute('src','/listpull_production_before_and_after_editing.mp4');
  await wrapper.locator('.production-play-button').click();
  await expect(wrapper).toHaveClass(/is-playing/);
  await expect(video).toBeVisible();
  await expect.poll(()=>video.evaluate(el=>el.readyState),{timeout:20000}).toBeGreaterThanOrEqual(2);
  await video.evaluate(el=>el.pause());
  await expect(wrapper).not.toHaveClass(/is-playing/);
  await expect(video).toBeHidden();
  await expect(poster).toBeVisible();
  await expect(wrapper.locator('.production-play-button')).toBeVisible();
});

test('before-after slider uses real stills and stays operable by keyboard',async({page})=>{
  for(const route of ['/wildlife-production.html','/','/engineering.html','/solutions.html']){
    await page.goto(route);
    const compare=page.locator('[data-production-compare]').first();
    await expect(compare).toHaveCount(1);
    await expect(compare.locator('img')).toHaveCount(2);
    await expect(compare.locator('.production-before-image')).toHaveAttribute('src','/assets/production/fox-cubs-before.webp');
    await expect(compare.locator('.production-after-image')).toHaveAttribute('src','/assets/production/fox-cubs-after.webp');
    const input=compare.locator('input[type="range"]');
    await expect(input).toHaveValue('50');
    await input.focus();
    await page.keyboard.press('ArrowRight');
    await expect(input).toHaveValue('51');
    await expect(input).toHaveAttribute('aria-valuetext','51% finished edit visible');
    const reveal=await compare.evaluate(el=>el.style.getPropertyValue('--production-split'));
    expect(reveal).toBe('51%');
  }
});

test('all new engineering and production pages retain direct navigation and project links',async({page})=>{
  const routes=['/wildlife-production.html','/engineering/ai-applications.html',
    '/engineering/cloud-integration.html','/engineering/custom-software.html',
    '/engineering/projects.html'];
  for(const route of routes){
    const response=await page.goto(route);
    expect(response.status(),route).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#lp-global-navigation')).toHaveCount(1);
    await expect(page.locator('#labs-options .lp-app-tile')).toHaveCount(12);
    await expect(page.locator('.lp-more-links a[href="/wildlife-production.html"]')).toHaveCount(1);
    await expect(page.locator('.lp-more-links a[href="/engineering/projects.html"]')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/index, follow/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://listpull.com'+route);
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('/wildlife-production.html');
  const bodyWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(392);
});

test('Video Studio adds optional original wildlife footage without replacing the editor',async({page})=>{
  await page.goto('/studio/video-editor.html');
  await expect(page.locator('#video-upload')).toHaveCount(1);
  await expect(page.locator('.video-work-layout')).toBeVisible();
  const sample=page.locator('#video-load-wildlife-sample');
  await expect(sample).toBeVisible();
  await sample.click();
  await expect(page.locator('#video-wildlife-sample-status')).toContainText('media library',{timeout:30000});
  await expect(page.locator('#video-library')).toContainText('ListPull wildlife fox cubs',{timeout:30000});
  await expect(page.locator('#video-upload')).toHaveCount(1);
  await expect(page.locator('[data-video="export"]')).toBeVisible();
});
