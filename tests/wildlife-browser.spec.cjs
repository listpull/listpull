'use strict';
const {test,expect}=require('@playwright/test');
test.use({baseURL:'http://127.0.0.1:4173'});
test.setTimeout(90000);

test('wildlife directory has 48 real HTML article cards and responsive filters',async({page})=>{
  await page.goto('/wildlife/');
  await expect(page.locator('h1')).toContainText('Nature has');
  await expect(page.locator('.wildlife-hero-art img')).toHaveCount(3);
  await expect(page.locator('.wildlife-hero-production')).toHaveAttribute('href','/wildlife-production.html');
  await expect(page.locator('.wildlife-story-card img[src$=".webp"]')).toHaveCount(48);
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
  await expect(page.locator('.wildlife-feature img')).toHaveAttribute('src',/\/assets\/wildlife\/photos\/sea-turtles.*\.webp/);
  await expect(page.locator('.wildlife-article-body')).toContainText('sea turtles');
  await expect(page.locator('.wildlife-social iframe')).toHaveCount(2);
  await expect(page.locator('.wildlife-feature img')).toHaveAttribute('width','1200');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',/sea-turtles.*\.webp/);
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

test('all wildlife pages use local WebP photos with source credits and valid inline citations',async({page})=>{
  const fs=require('fs'),path=require('path');
  const root=path.resolve(__dirname,'..');
  const articles=fs.readdirSync(path.join(root,'wildlife/articles')).filter(f=>f.endsWith('.html'));
  expect(articles).toHaveLength(48);
  for(const file of articles){
    const source=fs.readFileSync(path.join(root,'wildlife/articles',file),'utf8');
    const slug=file.replace(/\.html$/,'');
    const raster=path.join(root,'assets','wildlife','photos',slug+'.webp');
    expect(fs.existsSync(raster),slug).toBe(true);
    expect(fs.readFileSync(raster).subarray(0,4).toString('ascii')).toBe('RIFF');
    expect(source).toContain('/assets/wildlife/photos/'+slug+'.webp');
    expect(source).not.toContain('Wildlife illustration created for this ListPull article.');
    expect(source).not.toMatch(/\[caption[^\]]*\]/);
    expect(source).toContain('wildlife-photo-credit');
    expect(source).toContain('og:image');
    for(const match of source.matchAll(/href="#wildlife-ref-(\d+)"/g)){
      expect(source).toContain('id="wildlife-ref-'+match[1]+'"');
    }
  }
});

test('wildlife discovery cards on other pages link to ListPull rather than a social platform',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.wildlife-card .wildlife-link').last()).toHaveAttribute('href','/wildlife/');
  await page.goto('/labs.html');
  await expect(page.locator('.lp-labs-actions a[href*="instagram.com"]')).toHaveCount(0);
  await expect(page.locator('.lp-labs-actions a[href="/wildlife/"]')).toHaveCount(1);
});
