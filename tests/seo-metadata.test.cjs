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
  '/policies/privacy-policy/', '/policies/terms-of-service/',
  '/wildlife-production.html', '/engineering/ai-applications.html',
  '/engineering/cloud-integration.html', '/engineering/custom-software.html',
  '/engineering/projects.html'
];
const canonicalByFile = {
  'index.html': '/',
  'about-listpull/index.html': '/about-listpull/',
  'blobby.html': '/blobby.html',
  'blobby/wiki/index.html': '/blobby/wiki/',
  'contact/index.html': '/contact/',
  'engineering.html': '/engineering.html',
  'engineering/ai-applications.html': '/engineering/ai-applications.html',
  'engineering/cloud-integration.html': '/engineering/cloud-integration.html',
  'engineering/custom-software.html': '/engineering/custom-software.html',
  'engineering/projects.html': '/engineering/projects.html',
  'wildlife-production.html': '/wildlife-production.html',
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
  for (const match of urls) assert.match(match[2], /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
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
test('all HTML pages permit search indexing', () => {
  for (const file of Object.keys(canonicalByFile)) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const directives = tags(html, 'robots');
    assert.equal(directives.length, 1, file + ': one robots directive');
    assert.match(content(directives[0]), /^index,\s*follow\b/i,
      file + ': indexing allowed');
    assert.doesNotMatch(html, /\bnoindex\b/i, file + ': no blocking directive');
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


test('Studio applications identify themselves as free limited versions in HTML and metadata', () => {
  const applications = [
    'studio/image-editor.html', 'studio/video-editor.html',
    'studio/ai.html', 'studio/strategy.html', 'studio/forecast.html'
  ];
  for (const file of applications) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const pageDesc = content(tags(html, 'description')[0]);
    assert.match(pageDesc, /free, limited version/i, file + ': page description');
    const ogDesc = content(tags(html, 'og:description', 'property')[0]);
    assert.equal(ogDesc, pageDesc, file + ': matching social description');
    const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(visible, /free limited version/i, file + ': visible application label');
    const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(match => JSON.parse(match[1]));
    const nodes = schemas.flatMap(schema => schema['@graph'] || [schema]);
    const app = nodes.find(node => node['@type'] === 'SoftwareApplication');
    assert.ok(app, file + ': software application data');
    assert.match(app.description, /free, limited version/i, file + ': software description');
  }
});

test('marketing pages describe the applications without claiming why they are free', () => {
  for (const file of ['index.html', 'studio.html', 'labs.html', 'solutions.html', 'engineering.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.match(visible, /\blimited versions?\b/i, file + ': limited applications explained');
    assert.doesNotMatch(visible, /\b(?:sales pitch|showcase for clients|marketing demo|lead generation)\b/i,
      file + ': no explanation of promotional intent');
    assert.doesNotMatch(visible, /\b(?:try our tools|free browser tools|choose a tool)\b/i,
      file + ': application labels instead of generic tool labels');
  }
});


test('every HTML head has the ListPull bookmark icon, social cards, and verified social profiles', () => {
  const profiles = [
    'https://www.youtube.com/@listpull',
    'https://www.instagram.com/listpull/',
    'https://www.facebook.com/listpull',
    'https://www.tiktok.com/@listpull',
    'https://www.linkedin.com/company/listpull'
  ];
  for (const file of Object.keys(canonicalByFile)) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const head = html.split(/<\/head\s*>/i)[0];
    const icons = [...head.matchAll(/<link\b[^>]*\brel="icon"[^>]*>/gi)];
    assert.equal(icons.length, 1, file + ': one bookmark icon');
    assert.match(icons[0][0], /type="image\/x-icon"/, file + ': correct ICO type');
    assert.match(icons[0][0], /href="\/favicon\.ico"/, file + ': root icon URL');
    const identities = [...head.matchAll(/<link\b[^>]*\brel="me"[^>]*>/gi)].map(m => m[0]);
    assert.equal(identities.length, profiles.length, file + ': all official social accounts');
    for (const url of profiles) {
      assert.ok(identities.some(link => link.includes('href="' + url + '"')),
        file + ': social link ' + url);
    }
    assert.match(content(tags(html, 'og:image', 'property')[0]), /^https:\/\/listpull\.com\//,
      file + ': Open Graph image for sharing');
    assert.match(content(tags(html, 'twitter:image')[0]), /^https:\/\/listpull\.com\//,
      file + ': social card image');
  }
});

test('Creative Studio and Image Studio names match their destinations on every HTML page', () => {
  const special = new Set(['301.html', '404.html', 'studio/vector.html']);
  const tools = new Set(['studio/image-editor.html', 'studio/video-editor.html',
    'studio/ai.html', 'studio/strategy.html', 'studio/forecast.html']);
  const launchers = new Set(['index.html', 'engineering.html', 'solutions.html', 'studio.html']);
  for (const file of Object.keys(canonicalByFile)) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(html, /ListPull Studio|Creative Editor/,
      file + ': old names are not used');
    if (special.has(file)) continue;
    if (!tools.has(file)) {
      assert.match(html, /class="lp-nav-studio" href="\/studio\.html">Creative Studio<\/a>/,
        file + ': top navigation identifies Creative Studio');
    }
    const primaryMenu = html.match(/<a class="lp-app-tile lp-app-tile-menu lp-app-studio" href="\/studio\.html"[^>]*>[\s\S]*?<span class="lp-app-name">([^<]*)<\/span><\/a>/);
    assert.equal(primaryMenu?.[1], 'Creative Studio', file + ': Studio application entry');
    const imageMenu = html.match(/<a class="lp-app-tile lp-app-tile-menu lp-app-creative" href="\/studio\/image-editor\.html"[^>]*>[\s\S]*?<span class="lp-app-name">([^<]*)<\/span><\/a>/);
    assert.equal(imageMenu?.[1], 'Image Studio', file + ': image application entry');
    if (launchers.has(file)) {
      const strip = html.match(/<a class="lp-app-tile lp-app-tile-strip lp-app-studio" href="\/studio\.html"[^>]*>[\s\S]*?<span class="lp-app-name">([^<]*)<\/span><\/a>/);
      assert.equal(strip?.[1], 'Creative Studio', file + ': overview strip');
    }
  }
  const studio = fs.readFileSync(path.join(root, 'studio.html'), 'utf8');
  const image = fs.readFileSync(path.join(root, 'studio/image-editor.html'), 'utf8');
  const about = fs.readFileSync(path.join(root, 'about-listpull/index.html'), 'utf8');
  assert.match(studio, /<h1>Make something with <span class="accent-orange">Creative Studio\.<\/span><\/h1>/);
  assert.match(image, /<h1>Image Studio<\/h1>/);
  assert.match(image, /<title>Image Studio \| Free Image &amp; SVG Editor by ListPull<\/title>/);
  assert.match(image, /"name":"Image Studio","description":/);
  assert.match(studio, /"name":"Creative Studio","item":"https:\/\/listpull\.com\/studio\.html"/);
  assert.match(about, /href="\/studio\.html">Explore Creative Studio<\/a>/);
  assert.match(about, /href="\/solutions\.html">Explore ListPull Solutions<\/a>/);
});


test('official LinkedIn and visitor routes are consistent with ListPull identity', () => {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const home = read('index.html');
  const contact = read('contact/index.html');
  const engineering = read('engineering.html');
  const solutions = read('solutions.html');
  const about = read('about-listpull/index.html');
  const linkedIn = 'https://www.linkedin.com/company/listpull';
  const organizations = [...home.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => JSON.parse(match[1])).flatMap(data => data['@graph'] || [data])
    .filter(node => node['@type'] === 'Organization' && node.url === site + '/');
  assert.equal(organizations.length, 1, 'the homepage names one ListPull organization');
  assert.ok(organizations[0].sameAs.includes(linkedIn), 'Organization lists the official LinkedIn');
  assert.match(home, /class="social-btn"[^>]*>[\s\S]*?LinkedIn\s*<\/a>/i, 'LinkedIn has a visible homepage link');
  for (const file of [engineering, solutions, about, contact]) {
    assert.ok(file.includes('href="' + linkedIn + '"'), 'LinkedIn is reachable from client pages');
  }
  const socialLinks = [
    'https://www.youtube.com/@listpull',
    'https://www.instagram.com/listpull/',
    'https://www.tiktok.com/@listpull',
    'https://www.facebook.com/listpull',
    linkedIn
  ];
  for (const url of socialLinks) {
    assert.ok(contact.includes('href="' + url + '"'), 'Contact social destination ' + url);
  }
  assert.doesNotMatch(contact, /href="https:\/\/www\.(?:youtube|tiktok)\.com\/listpull"/,
    'no old social URLs remain');
  assert.match(home, /Explore Creative Studio/, 'clear link to Creative Studio');
  assert.match(home, /Explore Blobby gameplay guide/, 'clear link to Blobby instructions');
  assert.match(home, /<section class="wildlife-section" id="wildlife">/, 'wildlife card leads to an existing section');
});

test('Blobby metadata links to a real landing page while preserving app downloads', () => {
  const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
  const apple = 'https://apps.apple.com/us/app/blobbys-woodland-wonder/id1507379429';
  const android = 'https://play.google.com/store/apps/details?id=com.listpull.matchblock4';
  for (const file of ['blobby.html', 'about-blobby.html']) {
    const html = read(file);
    const data = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
      .map(match => JSON.parse(match[1])).flatMap(node => node['@graph'] || [node]);
    const video = data.find(node => node['@type'] === 'VideoObject');
    assert.ok(video, file + ': gameplay video metadata');
    assert.equal(video.url, site + '/about-blobby.html', file + ': real video landing route');
    assert.equal(video.embedUrl, site + '/about-blobby.html', file + ': real video embed route');
    assert.ok(fs.existsSync(path.join(root, 'blobby-preview.mp4')), 'gameplay video asset exists');
  }
  const page = read('blobby.html');
  assert.ok(page.includes('href="' + apple + '"'), 'iOS download link');
  assert.ok(page.includes('href="' + android + '"'), 'Android download link');
});


test('wildlife production uses the original video, real stills, schema, and Blobby-style fallback', () => {
  const html = fs.readFileSync(path.join(root, 'wildlife-production.html'), 'utf8');
  const video = 'listpull_production_before_and_after_editing.mp4';
  const stills = [
    'assets/production/fox-cubs-before.webp',
    'assets/production/fox-cubs-after.webp',
    'assets/production/fox-cubs-before-after-social.webp'
  ];
  assert.ok(fs.existsSync(path.join(root, video)), 'original video asset exists');
  const proxy = 'assets/production/fox-cubs-editor-sample.mp4';
  assert.ok(fs.existsSync(path.join(root, proxy)), 'optimized Video Studio sample exists');
  assert.ok(fs.statSync(path.join(root, proxy)).size < fs.statSync(path.join(root, video)).size,
    'the optional sample costs less to download than the full-resolution source');
  for (const still of stills) {
    assert.ok(fs.existsSync(path.join(root, still)), still + ': original footage still exists');
    assert.ok(html.includes('/' + still), still + ': featured in direct HTML or metadata');
  }
  assert.match(html, /class="production-video-wrap"/, 'poster fallback container');
  assert.match(html, /class="production-play-button"/, 'visible play button');
  assert.match(html, /class="production-preview-video"/, 'video player');
  assert.match(html, /poster="\/assets\/production\/fox-cubs-after\.webp"/, 'source-derived poster');
  assert.match(html, /<source src="\/listpull_production_before_and_after_editing\.mp4" type="video\/mp4">/, 'original MP4 source');
  assert.match(html, /data-production-compare/, 'native slider starts in HTML');
  assert.match(html, /type="range" min="0" max="100"/, 'keyboard-accessible comparison');
  assert.match(html, /<meta property="og:video" content="https:\/\/listpull\.com\//, 'video social metadata');
  const schema = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
    .flatMap(match => {
      const json = JSON.parse(match[1]);
      return json['@graph'] || [json];
    });
  const videoSchema = schema.find(node => node['@type'] === 'VideoObject');
  assert.ok(videoSchema, 'video structured data');
  assert.equal(videoSchema.contentUrl, site + '/' + video, 'video data refers to the real MP4');
  assert.equal(videoSchema.thumbnailUrl[0], site + '/' + stills[1], 'thumbnail refers to the real video');
  const sampleScript = fs.readFileSync(path.join(root, 'assets/production-sample.js'), 'utf8');
  assert.ok(sampleScript.includes("'/assets/production/fox-cubs-editor-sample.mp4'"),
    'Video Studio imports the optimized sample without downloading the full source');
  const script = fs.readFileSync(path.join(root, 'assets/production-showcase.js'), 'utf8');
  for (const text of ["video.play()", "video.pause()", "video.currentTime = 0",
    "video.addEventListener('ended', showPreview)", "video.addEventListener('error', showPreview)"]) {
    assert.ok(script.includes(text), 'video fallback supports ' + text);
  }
});

test('media and B2B pathways are directly linked and remain fully indexable', () => {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  for (const file of ['index.html', 'engineering.html', 'solutions.html']) {
    const html = read(file);
    assert.match(html, /data-production-compare/, file + ': real frame comparison in HTML');
    assert.ok(html.includes('assets/production-showcase.css'), file + ': comparison CSS');
    assert.ok(html.includes('assets/production-showcase.js'), file + ': comparison interaction');
    assert.ok(html.includes('href="/wildlife-production.html"'), file + ': production case route');
  }
  for (const file of ['about-listpull/index.html', 'labs.html', 'studio.html',
    'studio/video-editor.html', 'blobby.html', 'contact/index.html']) {
    assert.ok(read(file).includes('href="/wildlife-production.html"'), file + ': media work is reachable');
  }
  const services = [
    'engineering/ai-applications.html',
    'engineering/cloud-integration.html',
    'engineering/custom-software.html',
    'engineering/projects.html'
  ];
  for (const file of services) {
    const html = read(file);
    assert.ok(html.includes('href="/contact/#engineering"'), file + ': contact path for real projects');
    assert.ok(html.includes('href="/engineering/projects.html"'), file + ': project evidence');
    assert.match(content(tags(html, 'robots')[0]), /^index,\s*follow/i, file + ': indexable');
    assert.doesNotMatch(html, /\bnoindex\b/i, file + ': no noindex anywhere');
  }
  const navFiles = Object.keys(canonicalByFile)
    .filter(file => !['301.html', '404.html', 'studio/vector.html'].includes(file));
  for (const file of navFiles) {
    const html = read(file);
    const start = html.indexOf('<div class="lp-more-links" id="lp-more-links" popover="auto">');
    assert.ok(start >= 0, file + ': static More menu');
    const menu = html.slice(start, html.indexOf('</div>', start));
    assert.ok(menu.includes('<a href="/wildlife-production.html">Media Production</a>'),
      file + ': direct Media Production menu link');
    assert.ok(menu.includes('<a href="/engineering/projects.html">Selected Work</a>'),
      file + ': direct Selected Work menu link');
  }
});
