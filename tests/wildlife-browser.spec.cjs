'use strict';
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173'});
test.setTimeout(90000);

test('wildlife directory has 48 real HTML article cards and responsive filters',async({page})=>{
  await page.goto('/wildlife/');
  await expect(page.locator('h1')).toContainText('Nature has');
  await expect(page.locator('.wildlife-story-card')).toHaveCount(48);
  await expect(page.locator('#wildlife-results-count')).toHaveText('48 stories');
  await expect(page.locator('.wildlife-story-card:visible')).toHaveCount(48);
  await page.locator('[data-wildlife-filter="cats"]').click();
  await expect(page.locator('.wildlife-story-card:visible')).toHaveCount(18);
  await expect(page.locator('[data-wildlife-filter="cats"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-wildlife-filter="all"]').click();
  await page.locator('#wildlife-story-search').fill('hummingbird');
  await expect(page.locator('.wildlife-story-card:visible')).toHaveCount(1);
  await expect(page.locator('.wildlife-story-card:visible')).toContainText('Hummingbirds');
  await page.locator('#wildlife-story-search').clear();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.wildlife-story-card:visible')).toHaveCount(48);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  expect(overflow).toBe(false);
});

test('wildlife article is readable, indexable, includes related video and the production comparison',async({page})=>{
  await page.goto('/wildlife/articles/sea-turtles-navigators-of-the-oceans-mysteries.html');
  await expect(page.locator('h1')).toContainText('Sea Turtles');
  await expect(page.locator('.wildlife-feature img')).toHaveAttribute('src',/\/assets\/wildlife\/sea-turtles.*\.svg/);
  await expect(page.locator('.wildlife-article-body')).toContainText('sea turtles');
  await expect(page.locator('.wildlife-social a[href*="instagram.com/reel/"]')).toHaveCount(1);
  await expect(page.locator('.wildlife-social a[href*="youtube.com/watch"]')).toHaveCount(1);
  await expect(page.locator('.wildlife-game-cta a[href="/blobby.html"]')).toBeVisible();
  await expect(page.locator('.production-promo')).toHaveCount(1);
  await expect(page.locator('#lp-app-strip .lp-app-tile')).toHaveCount(12);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content',/index, follow/);
  const articleSchema=await page.locator('script[type="application/ld+json"]').textContent();
  const graph=JSON.parse(articleSchema)['@graph'];
  const article=graph.find(node=>node['@type']==='Article');
  expect(article.datePublished).toMatch(/^2024-04-05T/);
  expect(article.dateModified).toMatch(/^2024-04-11T/);
  expect(graph.find(node=>node['@type']==='VideoObject')).toBeUndefined();
});

test('old WordPress URLs redirect to restored content and non-script visitors can browse archive',async({browser,page})=>{
  await page.goto('/sea-turtles-navigators-of-the-oceans-mysteries/');
  await expect(page).toHaveURL(/\/wildlife\/articles\/sea-turtles-navigators-of-the-oceans-mysteries\.html$/);
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  const noScript=await context.newPage();
  await noScript.goto('http://127.0.0.1:4173/wildlife/');
  await expect(noScript.locator('.wildlife-story-card')).toHaveCount(48);
  await noScript.locator('.wildlife-story-card').first().click();
  await expect(noScript.locator('.wildlife-article-body')).toBeVisible();
  await expect(noScript.locator('.production-promo')).toHaveCount(1);
  await context.close();
});

test('visitor link page has tracked destinations without redirecting to social platforms',async({page})=>{
  await page.goto('/links/');
  await expect(page.locator('h1')).toContainText('Find your next');
  const urls=await page.locator('.wildlife-quick-link').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')));
  expect(urls).toHaveLength(5);
  for(const url of urls){
    expect(url).toContain('utm_source=social');
    expect(url).toContain('utm_medium=bio');
    expect(url.startsWith('/')).toBe(true);
  }
});
