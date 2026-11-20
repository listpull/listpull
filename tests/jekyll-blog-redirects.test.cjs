'use strict';

// Run this against built Jekyll output, not the unprocessed source directory.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, '_site');
const articles = fs.readdirSync(path.join(root, 'wildlife/articles'))
  .filter(file => file.endsWith('.html'));
const slugs = articles.map(file => file.slice(0, -'.html'.length)).sort();

test('48 historical /blogs/blog/<slug> routes redirect to the root wildlife slugs', () => {
  assert.equal(slugs.length, 48, 'all 48 WordPress wildlife posts must be mapped');
  assert.ok(fs.existsSync(path.join(output, 'index.html')),
    'a completed Jekyll build must be available at _site');
  const sourceRedirects = path.join(root, 'blogs/blog');
  const actual = fs.readdirSync(sourceRedirects, { withFileTypes: true })
    .filter(item => item.isDirectory()).map(item => item.name).sort();
  assert.deepEqual(actual, slugs, 'each article must have exactly one matching blog redirect');
  for (const slug of slugs) {
    const source = path.join(sourceRedirects, slug, 'index.md');
    const page = path.join(output, 'blogs/blog', slug, 'index.html');
    const rootPage = path.join(output, slug, 'index.html');
    const article = path.join(output, 'wildlife/articles', slug + '.html');
    assert.ok(fs.existsSync(source), slug + ': redirect source');
    assert.ok(fs.existsSync(page), slug + ': Jekyll generated redirect HTML');
    assert.ok(fs.existsSync(rootPage), slug + ': original root URL remains available');
    assert.ok(fs.existsSync(article), slug + ': restored wildlife article remains available');
    const yaml = fs.readFileSync(source, 'utf8');
    assert.match(yaml, /^---\s*\n/);
    assert.ok(yaml.includes('redirect_to: https://listpull.com/' + slug),
      slug + ': destination is the requested root-level slug');
    const rendered = fs.readFileSync(page, 'utf8');
    assert.match(rendered, /http-equiv=["']refresh["']/i,
      slug + ': generated page has an automatic redirect');
    assert.ok(rendered.includes('https://listpull.com/' + slug),
      slug + ': generated redirect points to the requested root-level URL');
  }
});

test('Jekyll build preserves important static site content', () => {
  for (const filename of [
    'index.html',
    'wildlife/index.html',
    'labs.html',
    'wildlife-production.html',
    'assets/wildlife/photos/unveiling-the-mystique-of-the-black-panther-natures-shadowy-marvel.webp',
    '.well-known/assetlinks.json',
  ]) {
    assert.ok(fs.existsSync(path.join(output, filename)), filename + ' survives the Jekyll build');
  }
});
