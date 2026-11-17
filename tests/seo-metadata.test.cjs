'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const site = 'https://listpull.com';
const primary = [
  '/', '/about-listpull/', '/blobby.html', '/blobby/wiki/', '/contact/',
  '/engineering.html', '/labs.html', '/solutions.html', '/studio.html',
  '/studio/ai.html', '/studio/forecast.html', '/studio/image-editor.html',
  '/studio/strategy.html', '/studio/video-editor.html',
  '/policies/privacy-policy/', '/policies/terms-of-service/'
];
const canonicalByFile = {
  'index.html': '/',
  'about-listpull/index.html': '/about-listpull/',
  'blobby.html': '/blobby.html',
  'blobby/wiki/index.html': '/blobby/wiki/',
  'contact/index.html': '/contact/',
  'engineering.html': '/engineering.html',
  'labs.html': '/labs.html',
  'solutions.html': '/solutions.html',
  'studio.html': '/studio.html',
  'studio/ai.html': '/studio/ai.html',
  'studio/forecast.html': '/studio/forecast.html',
  'studio/image-editor.html': '/studio/image-editor.html',
  'studio/strategy.html': '/studio/strategy.html',
  'studio/video-editor.html': '/studio/video-editor.html',
  'policies/privacy-policy/index.html': '/policies/privacy-policy/',
  'policies/terms-of-service/index.html': '/policies/terms-of-service/',
  '301.html': '/',
  '404.html': '/',
  'about-blobby.html': '/blobby.html',
  'contact-us.html': '/contact/',
  'contact-us/index.html': '/contact/',
  'pages/contact/index.html': '/contact/',
  'privacy-policy.html': '/policies/privacy-policy/',
  'pages/privacy-policy/index.html': '/policies/privacy-policy/',
  'support/index.html': '/policies/privacy-policy/',
  'support/privacy-policy/index.html': '/policies/privacy-policy/',
  'pages/terms-of-service/index.html': '/policies/terms-of-service/',
  'support/terms-of-service/index.html': '/policies/terms-of-service/',
  'studio/vector.html': '/studio/image-editor.html'
};
function collectHtml(dir, prefix = '') {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) return collectHtml(path.join(dir, entry.name), relative);
    return entry.name.endsWith('.html') ? [relative] : [];
  });
}
function tags(html, name, type = 'name') {
  const head = html.split(/<\/head\s*>/i)[0];
  const matcher = new RegExp('\\b' + type + '=["\\x27]' + name + '["\\x27]', 'i');
  return [...head.matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]).filter(tag => matcher.test(tag));
}
function content(tag) {
  return tag.match(/\bcontent="([^"]*)"/i)?.[1];
}
test('every HTML file has a canonical URL decision', () => {
  assert.deepEqual(collectHtml(root).sort(), Object.keys(canonicalByFile).sort());
});
test('all HTML pages have unique head metadata tags and consistent canonicals', () => {
  for (const [file, canonical] of Object.entries(canonicalByFile)) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const head = html.split(/<\/head\s*>/i)[0];
    const titles = [...head.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)];
    assert.equal(titles.length, 1, file + ': one title');
    assert.ok(titles[0][1].trim().length > 12, file + ': useful title');
    for (const [name, type] of [
      ['description', 'name'], ['robots', 'name'],
      ['og:site_name', 'property'], ['og:title', 'property'],
      ['og:description', 'property'], ['og:url', 'property'],
      ['og:image', 'property'], ['twitter:card', 'name'],
      ['twitter:title', 'name'], ['twitter:description', 'name'],
      ['twitter:image', 'name']
    ]) {
      const matches = tags(html, name, type);
      assert.equal(matches.length, 1, file + ': one ' + name);
      assert.ok(content(matches[0]), file + ': nonempty ' + name);
    }
    assert.equal(content(tags(html, 'og:site_name', 'property')[0]), 'ListPull', file);
    assert.equal(content(tags(html, 'og:url', 'property')[0]), site + canonical, file);
    assert.ok(content(tags(html, 'description')[0]).length >= 70, file + ': useful description');
    const links = [...head.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
    const canonicals = links.filter(tag => /\brel=["']canonical["']/i.test(tag));
    assert.equal(canonicals.length, 1, file + ': one canonical');
    assert.ok(canonicals[0].includes('href="' + site + canonical + '"'), file + ': correct canonical');
  }
});
test('sitemap contains only canonical pages with updated lastmod', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g)];
  const listed = urls.map(match => match[1]);
  assert.deepEqual([...new Set(listed)].sort(), primary.map(p => site + p).sort());
  for (const match of urls) assert.match(match[2], /<lastmod>2026-11-17<\/lastmod>/);
  assert.match(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8'),
    /Sitemap:\s*https:\/\/listpull\.com\/sitemap\.xml/);
});
test('homepage structured data identifies ListPull, not only the game', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => JSON.parse(match[1]));
  const nodes = scripts.flatMap(data => data['@graph'] || [data]);
  assert.ok(nodes.some(n => n['@type'] === 'WebSite' && n.name === 'ListPull' && n.url === site + '/'));
  assert.ok(nodes.some(n => n['@type'] === 'Organization' && n.name === 'ListPull'));
  assert.ok(nodes.some(n => n['@type'] === 'WebPage' && n.url === site + '/'));
  assert.ok(!nodes.some(n => n['@type'] === 'VideoGame'), 'game schema belongs on game page');
});
test('every indexable page has a clear visible page heading', () => {
  for (const url of primary) {
    const file = url === '/' ? 'index.html' : url.endsWith('/') ? url.slice(1) + 'index.html' : url.slice(1);
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const headings = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
    assert.equal(headings.length, 1, file + ': one main heading');
    assert.ok(headings[0][1].replace(/<[^>]*>/g, '').trim().length > 8, file + ': meaningful heading');
  }
});
test('error and redirect files are noindex', () => {
  for (const file of ['301.html', '404.html', 'studio/vector.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(content(tags(html, 'robots')[0]), /\bnoindex\b/, file);
  }
  for (const [file, url] of Object.entries(canonicalByFile)) {
    if (!primary.includes(url) || ['301.html', '404.html', 'studio/vector.html'].includes(file)) continue;
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(content(tags(html, 'robots')[0]), /\bnoindex\b/, file);
  }
});


test('every indexable or legacy HTML page includes its own navigation source', () => {
  const special = new Set(['301.html', '404.html', 'studio/vector.html']);
  const tools = new Set(['studio/image-editor.html', 'studio/video-editor.html',
    'studio/ai.html', 'studio/strategy.html', 'studio/forecast.html']);
  const launchers = new Set(['index.html', 'engineering.html', 'solutions.html', 'studio.html']);

  for (const file of Object.keys(canonicalByFile)) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(html, /(?:src=["']|href=["'])\/assets\/listpull-navigation\.js/,
      file + ': no navigation injection script');
    if (special.has(file)) continue;
    assert.match(html, /id="lp-global-navigation"/, file + ': direct navbar markup');
    assert.match(html, /popovertarget="labs-options"/, file + ': native Labs popup');
    assert.equal((html.match(/class="lp-app-tile lp-app-tile-menu/g) || []).length, 12,
      file + ': twelve actual app links in HTML');
    if (tools.has(file)) {
      assert.match(html, /class="lp-tool-navigation"/, file + ': compact tool navigation');
      assert.doesNotMatch(html, /class="lp-site-header"/, file + ': no duplicate site navbar');
    } else {
      assert.match(html, /class="lp-site-header"/, file + ': full website navbar');
    }
    assert.equal(html.includes('id="lp-app-strip"'), launchers.has(file),
      file + ': launcher only on the four overview pages');
  }
  assert.equal(fs.existsSync(path.join(root, 'assets/listpull-navigation.js')), false,
    'the navigation injection file is deleted');
});
