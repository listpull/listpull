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
  '/wildlife/', '/links/',
  '/wildlife/articles/sea-turtles-navigators-of-the-oceans-mysteries.html',
  '/wildlife/articles/hummingbirds-the-dazzling-aerial-acrobats-of-the-bird-world.html',
  '/wildlife/articles/discovering-the-northern-saw-whet-owl-natures-tiny-nocturnal-hunter.html',
  '/wildlife/articles/the-charming-world-of-the-tufted-titmouse-a-closer-look-at-these-backyard-favorites.html',
  '/wildlife/articles/the-bald-eagle-a-symbol-of-resilience-and-conservation-triumph.html',
  '/wildlife/articles/the-majestic-male-lion-king-of-the-pride.html',
  '/wildlife/articles/discover-the-elusive-leopard-natures-master-of-stealth-and-beauty.html',
  '/wildlife/articles/the-fascinating-world-of-lion-cubs-a-glimpse-into-their-early-life.html',
  '/wildlife/articles/the-cheetah-natures-speedster-and-conservation-icon.html',
  '/wildlife/articles/the-amur-leopard-conservation-efforts-for-the-worlds-rarest-big-cat.html',
  '/wildlife/articles/the-fascinating-world-of-pandas-gentle-giants-of-the-bamboo-forest.html',
  '/wildlife/articles/understanding-the-rusty-spotted-cat-the-worlds-smallest-feline-marvel.html',
  '/wildlife/articles/dolphins-the-playful-ambassadors-of-the-ocean.html',
  '/wildlife/articles/butterflies-natures-delicate-dancers.html',
  '/wildlife/articles/the-enchanting-world-of-baby-lynx-natures-little-mysteries.html',
  '/wildlife/articles/koalas-australias-beloved-tree-huggers.html',
  '/wildlife/articles/understanding-the-ermine-a-guide-to-the-elusive-weasel.html',
  '/wildlife/articles/discover-the-margay-the-master-climber-of-the-cat-world.html',
  '/wildlife/articles/understanding-tigers-majestic-predators-of-the-wild.html',
  '/wildlife/articles/discover-the-majestic-snowy-owl-the-arctics-iconic-bird.html',
  '/wildlife/articles/exploring-the-wonders-of-underwater-wildlife-marine-mammals-fish-and-ocean-ecosystems.html',
  '/wildlife/articles/unveiling-the-mysteries-of-the-king-cobra-natures-majestic-predator.html',
  '/wildlife/articles/the-fascinating-world-of-catfish-natures-whiskered-wonders.html',
  '/wildlife/articles/the-fascinating-world-of-ants-tiny-architects-of-the-earth.html',
  '/wildlife/articles/polar-bears-giants-of-the-arctic-ice.html',
  '/wildlife/articles/discover-the-fascinating-world-of-tree-frogs.html',
  '/wildlife/articles/unveiling-the-world-of-leopard-geckos-a-beginners-guide.html',
  '/wildlife/articles/salamanders-natures-fascinating-amphibians.html',
  '/wildlife/articles/discover-the-world-of-beetles-natures-ingenious-insects.html',
  '/wildlife/articles/chameleons-the-colorful-communicators-of-the-reptile-world.html',
  '/wildlife/articles/unveiling-the-secrets-of-ulua-the-mighty-predators-of-the-ocean.html',
  '/wildlife/articles/axolotls-the-fascinating-underwater-marvels.html',
  '/wildlife/articles/bearded-dragons-the-ultimate-pet-lizard.html',
  '/wildlife/articles/capybaras-gentle-giants-of-the-waterways.html',
  '/wildlife/articles/african-forest-elephants-gentle-giants-of-the-forest.html',
  '/wildlife/articles/unveiling-the-mystique-of-the-black-panther-natures-shadowy-marvel.html',
  '/wildlife/articles/the-clouded-leopard-a-mysterious-marvel-of-the-wild.html',
  '/wildlife/articles/the-southern-brazilian-ocelot-a-hidden-jewel-of-the-wild.html',
  '/wildlife/articles/the-enigmatic-white-lions-a-glimpse-into-their-world.html',
  '/wildlife/articles/the-truth-about-white-tigers-understanding-their-unique-existence.html',
  '/wildlife/articles/discovering-the-marbled-cat-a-hidden-gem-of-the-forest.html',
  '/wildlife/articles/exploring-the-world-of-the-brown-arctic-fox.html',
  '/wildlife/articles/grizzly-bears-the-mighty-wanderers-of-the-wild.html',
  '/wildlife/articles/discover-the-european-wildcat-a-mysterious-forest-dweller.html',
  '/wildlife/articles/meet-the-american-pine-marten-the-forests-furry-acrobat.html',
  '/wildlife/articles/snow-leopards-the-ghosts-of-the-mountains.html',
  '/wildlife/articles/discover-the-asian-small-clawed-otter-natures-playful-paddler.html',
  '/wildlife/articles/kangaroos-the-hopping-marvels-of-australia.html',
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
  'wildlife/index.html': '/wildlife/',
  'links/index.html': '/links/',
  'wildlife/articles/sea-turtles-navigators-of-the-oceans-mysteries.html': '/wildlife/articles/sea-turtles-navigators-of-the-oceans-mysteries.html',
  'sea-turtles-navigators-of-the-oceans-mysteries/index.html': '/wildlife/articles/sea-turtles-navigators-of-the-oceans-mysteries.html',
  'wildlife/articles/hummingbirds-the-dazzling-aerial-acrobats-of-the-bird-world.html': '/wildlife/articles/hummingbirds-the-dazzling-aerial-acrobats-of-the-bird-world.html',
  'hummingbirds-the-dazzling-aerial-acrobats-of-the-bird-world/index.html': '/wildlife/articles/hummingbirds-the-dazzling-aerial-acrobats-of-the-bird-world.html',
  'wildlife/articles/discovering-the-northern-saw-whet-owl-natures-tiny-nocturnal-hunter.html': '/wildlife/articles/discovering-the-northern-saw-whet-owl-natures-tiny-nocturnal-hunter.html',
  'discovering-the-northern-saw-whet-owl-natures-tiny-nocturnal-hunter/index.html': '/wildlife/articles/discovering-the-northern-saw-whet-owl-natures-tiny-nocturnal-hunter.html',
  'wildlife/articles/the-charming-world-of-the-tufted-titmouse-a-closer-look-at-these-backyard-favorites.html': '/wildlife/articles/the-charming-world-of-the-tufted-titmouse-a-closer-look-at-these-backyard-favorites.html',
  'the-charming-world-of-the-tufted-titmouse-a-closer-look-at-these-backyard-favorites/index.html': '/wildlife/articles/the-charming-world-of-the-tufted-titmouse-a-closer-look-at-these-backyard-favorites.html',
  'wildlife/articles/the-bald-eagle-a-symbol-of-resilience-and-conservation-triumph.html': '/wildlife/articles/the-bald-eagle-a-symbol-of-resilience-and-conservation-triumph.html',
  'the-bald-eagle-a-symbol-of-resilience-and-conservation-triumph/index.html': '/wildlife/articles/the-bald-eagle-a-symbol-of-resilience-and-conservation-triumph.html',
  'wildlife/articles/the-majestic-male-lion-king-of-the-pride.html': '/wildlife/articles/the-majestic-male-lion-king-of-the-pride.html',
  'the-majestic-male-lion-king-of-the-pride/index.html': '/wildlife/articles/the-majestic-male-lion-king-of-the-pride.html',
  'wildlife/articles/discover-the-elusive-leopard-natures-master-of-stealth-and-beauty.html': '/wildlife/articles/discover-the-elusive-leopard-natures-master-of-stealth-and-beauty.html',
  'discover-the-elusive-leopard-natures-master-of-stealth-and-beauty/index.html': '/wildlife/articles/discover-the-elusive-leopard-natures-master-of-stealth-and-beauty.html',
  'wildlife/articles/the-fascinating-world-of-lion-cubs-a-glimpse-into-their-early-life.html': '/wildlife/articles/the-fascinating-world-of-lion-cubs-a-glimpse-into-their-early-life.html',
  'the-fascinating-world-of-lion-cubs-a-glimpse-into-their-early-life/index.html': '/wildlife/articles/the-fascinating-world-of-lion-cubs-a-glimpse-into-their-early-life.html',
  'wildlife/articles/the-cheetah-natures-speedster-and-conservation-icon.html': '/wildlife/articles/the-cheetah-natures-speedster-and-conservation-icon.html',
  'the-cheetah-natures-speedster-and-conservation-icon/index.html': '/wildlife/articles/the-cheetah-natures-speedster-and-conservation-icon.html',
  'wildlife/articles/the-amur-leopard-conservation-efforts-for-the-worlds-rarest-big-cat.html': '/wildlife/articles/the-amur-leopard-conservation-efforts-for-the-worlds-rarest-big-cat.html',
  'the-amur-leopard-conservation-efforts-for-the-worlds-rarest-big-cat/index.html': '/wildlife/articles/the-amur-leopard-conservation-efforts-for-the-worlds-rarest-big-cat.html',
  'wildlife/articles/the-fascinating-world-of-pandas-gentle-giants-of-the-bamboo-forest.html': '/wildlife/articles/the-fascinating-world-of-pandas-gentle-giants-of-the-bamboo-forest.html',
  'the-fascinating-world-of-pandas-gentle-giants-of-the-bamboo-forest/index.html': '/wildlife/articles/the-fascinating-world-of-pandas-gentle-giants-of-the-bamboo-forest.html',
  'wildlife/articles/understanding-the-rusty-spotted-cat-the-worlds-smallest-feline-marvel.html': '/wildlife/articles/understanding-the-rusty-spotted-cat-the-worlds-smallest-feline-marvel.html',
  'understanding-the-rusty-spotted-cat-the-worlds-smallest-feline-marvel/index.html': '/wildlife/articles/understanding-the-rusty-spotted-cat-the-worlds-smallest-feline-marvel.html',
  'wildlife/articles/dolphins-the-playful-ambassadors-of-the-ocean.html': '/wildlife/articles/dolphins-the-playful-ambassadors-of-the-ocean.html',
  'dolphins-the-playful-ambassadors-of-the-ocean/index.html': '/wildlife/articles/dolphins-the-playful-ambassadors-of-the-ocean.html',
  'wildlife/articles/butterflies-natures-delicate-dancers.html': '/wildlife/articles/butterflies-natures-delicate-dancers.html',
  'butterflies-natures-delicate-dancers/index.html': '/wildlife/articles/butterflies-natures-delicate-dancers.html',
  'wildlife/articles/the-enchanting-world-of-baby-lynx-natures-little-mysteries.html': '/wildlife/articles/the-enchanting-world-of-baby-lynx-natures-little-mysteries.html',
  'the-enchanting-world-of-baby-lynx-natures-little-mysteries/index.html': '/wildlife/articles/the-enchanting-world-of-baby-lynx-natures-little-mysteries.html',
  'wildlife/articles/koalas-australias-beloved-tree-huggers.html': '/wildlife/articles/koalas-australias-beloved-tree-huggers.html',
  'koalas-australias-beloved-tree-huggers/index.html': '/wildlife/articles/koalas-australias-beloved-tree-huggers.html',
  'wildlife/articles/understanding-the-ermine-a-guide-to-the-elusive-weasel.html': '/wildlife/articles/understanding-the-ermine-a-guide-to-the-elusive-weasel.html',
  'understanding-the-ermine-a-guide-to-the-elusive-weasel/index.html': '/wildlife/articles/understanding-the-ermine-a-guide-to-the-elusive-weasel.html',
  'wildlife/articles/discover-the-margay-the-master-climber-of-the-cat-world.html': '/wildlife/articles/discover-the-margay-the-master-climber-of-the-cat-world.html',
  'discover-the-margay-the-master-climber-of-the-cat-world/index.html': '/wildlife/articles/discover-the-margay-the-master-climber-of-the-cat-world.html',
  'wildlife/articles/understanding-tigers-majestic-predators-of-the-wild.html': '/wildlife/articles/understanding-tigers-majestic-predators-of-the-wild.html',
  'understanding-tigers-majestic-predators-of-the-wild/index.html': '/wildlife/articles/understanding-tigers-majestic-predators-of-the-wild.html',
  'wildlife/articles/discover-the-majestic-snowy-owl-the-arctics-iconic-bird.html': '/wildlife/articles/discover-the-majestic-snowy-owl-the-arctics-iconic-bird.html',
  'discover-the-majestic-snowy-owl-the-arctics-iconic-bird/index.html': '/wildlife/articles/discover-the-majestic-snowy-owl-the-arctics-iconic-bird.html',
  'wildlife/articles/exploring-the-wonders-of-underwater-wildlife-marine-mammals-fish-and-ocean-ecosystems.html': '/wildlife/articles/exploring-the-wonders-of-underwater-wildlife-marine-mammals-fish-and-ocean-ecosystems.html',
  'exploring-the-wonders-of-underwater-wildlife-marine-mammals-fish-and-ocean-ecosystems/index.html': '/wildlife/articles/exploring-the-wonders-of-underwater-wildlife-marine-mammals-fish-and-ocean-ecosystems.html',
  'wildlife/articles/unveiling-the-mysteries-of-the-king-cobra-natures-majestic-predator.html': '/wildlife/articles/unveiling-the-mysteries-of-the-king-cobra-natures-majestic-predator.html',
  'unveiling-the-mysteries-of-the-king-cobra-natures-majestic-predator/index.html': '/wildlife/articles/unveiling-the-mysteries-of-the-king-cobra-natures-majestic-predator.html',
  'wildlife/articles/the-fascinating-world-of-catfish-natures-whiskered-wonders.html': '/wildlife/articles/the-fascinating-world-of-catfish-natures-whiskered-wonders.html',
  'the-fascinating-world-of-catfish-natures-whiskered-wonders/index.html': '/wildlife/articles/the-fascinating-world-of-catfish-natures-whiskered-wonders.html',
  'wildlife/articles/the-fascinating-world-of-ants-tiny-architects-of-the-earth.html': '/wildlife/articles/the-fascinating-world-of-ants-tiny-architects-of-the-earth.html',
  'the-fascinating-world-of-ants-tiny-architects-of-the-earth/index.html': '/wildlife/articles/the-fascinating-world-of-ants-tiny-architects-of-the-earth.html',
  'wildlife/articles/polar-bears-giants-of-the-arctic-ice.html': '/wildlife/articles/polar-bears-giants-of-the-arctic-ice.html',
  'polar-bears-giants-of-the-arctic-ice/index.html': '/wildlife/articles/polar-bears-giants-of-the-arctic-ice.html',
  'wildlife/articles/discover-the-fascinating-world-of-tree-frogs.html': '/wildlife/articles/discover-the-fascinating-world-of-tree-frogs.html',
  'discover-the-fascinating-world-of-tree-frogs/index.html': '/wildlife/articles/discover-the-fascinating-world-of-tree-frogs.html',
  'wildlife/articles/unveiling-the-world-of-leopard-geckos-a-beginners-guide.html': '/wildlife/articles/unveiling-the-world-of-leopard-geckos-a-beginners-guide.html',
  'unveiling-the-world-of-leopard-geckos-a-beginners-guide/index.html': '/wildlife/articles/unveiling-the-world-of-leopard-geckos-a-beginners-guide.html',
  'wildlife/articles/salamanders-natures-fascinating-amphibians.html': '/wildlife/articles/salamanders-natures-fascinating-amphibians.html',
  'salamanders-natures-fascinating-amphibians/index.html': '/wildlife/articles/salamanders-natures-fascinating-amphibians.html',
  'wildlife/articles/discover-the-world-of-beetles-natures-ingenious-insects.html': '/wildlife/articles/discover-the-world-of-beetles-natures-ingenious-insects.html',
  'discover-the-world-of-beetles-natures-ingenious-insects/index.html': '/wildlife/articles/discover-the-world-of-beetles-natures-ingenious-insects.html',
  'wildlife/articles/chameleons-the-colorful-communicators-of-the-reptile-world.html': '/wildlife/articles/chameleons-the-colorful-communicators-of-the-reptile-world.html',
  'chameleons-the-colorful-communicators-of-the-reptile-world/index.html': '/wildlife/articles/chameleons-the-colorful-communicators-of-the-reptile-world.html',
  'wildlife/articles/unveiling-the-secrets-of-ulua-the-mighty-predators-of-the-ocean.html': '/wildlife/articles/unveiling-the-secrets-of-ulua-the-mighty-predators-of-the-ocean.html',
  'unveiling-the-secrets-of-ulua-the-mighty-predators-of-the-ocean/index.html': '/wildlife/articles/unveiling-the-secrets-of-ulua-the-mighty-predators-of-the-ocean.html',
  'wildlife/articles/axolotls-the-fascinating-underwater-marvels.html': '/wildlife/articles/axolotls-the-fascinating-underwater-marvels.html',
  'axolotls-the-fascinating-underwater-marvels/index.html': '/wildlife/articles/axolotls-the-fascinating-underwater-marvels.html',
  'wildlife/articles/bearded-dragons-the-ultimate-pet-lizard.html': '/wildlife/articles/bearded-dragons-the-ultimate-pet-lizard.html',
  'bearded-dragons-the-ultimate-pet-lizard/index.html': '/wildlife/articles/bearded-dragons-the-ultimate-pet-lizard.html',
  'wildlife/articles/capybaras-gentle-giants-of-the-waterways.html': '/wildlife/articles/capybaras-gentle-giants-of-the-waterways.html',
  'capybaras-gentle-giants-of-the-waterways/index.html': '/wildlife/articles/capybaras-gentle-giants-of-the-waterways.html',
  'wildlife/articles/african-forest-elephants-gentle-giants-of-the-forest.html': '/wildlife/articles/african-forest-elephants-gentle-giants-of-the-forest.html',
  'african-forest-elephants-gentle-giants-of-the-forest/index.html': '/wildlife/articles/african-forest-elephants-gentle-giants-of-the-forest.html',
  'wildlife/articles/unveiling-the-mystique-of-the-black-panther-natures-shadowy-marvel.html': '/wildlife/articles/unveiling-the-mystique-of-the-black-panther-natures-shadowy-marvel.html',
  'unveiling-the-mystique-of-the-black-panther-natures-shadowy-marvel/index.html': '/wildlife/articles/unveiling-the-mystique-of-the-black-panther-natures-shadowy-marvel.html',
  'wildlife/articles/the-clouded-leopard-a-mysterious-marvel-of-the-wild.html': '/wildlife/articles/the-clouded-leopard-a-mysterious-marvel-of-the-wild.html',
  'the-clouded-leopard-a-mysterious-marvel-of-the-wild/index.html': '/wildlife/articles/the-clouded-leopard-a-mysterious-marvel-of-the-wild.html',
  'wildlife/articles/the-southern-brazilian-ocelot-a-hidden-jewel-of-the-wild.html': '/wildlife/articles/the-southern-brazilian-ocelot-a-hidden-jewel-of-the-wild.html',
  'the-southern-brazilian-ocelot-a-hidden-jewel-of-the-wild/index.html': '/wildlife/articles/the-southern-brazilian-ocelot-a-hidden-jewel-of-the-wild.html',
  'wildlife/articles/the-enigmatic-white-lions-a-glimpse-into-their-world.html': '/wildlife/articles/the-enigmatic-white-lions-a-glimpse-into-their-world.html',
  'the-enigmatic-white-lions-a-glimpse-into-their-world/index.html': '/wildlife/articles/the-enigmatic-white-lions-a-glimpse-into-their-world.html',
  'wildlife/articles/the-truth-about-white-tigers-understanding-their-unique-existence.html': '/wildlife/articles/the-truth-about-white-tigers-understanding-their-unique-existence.html',
  'the-truth-about-white-tigers-understanding-their-unique-existence/index.html': '/wildlife/articles/the-truth-about-white-tigers-understanding-their-unique-existence.html',
  'wildlife/articles/discovering-the-marbled-cat-a-hidden-gem-of-the-forest.html': '/wildlife/articles/discovering-the-marbled-cat-a-hidden-gem-of-the-forest.html',
  'discovering-the-marbled-cat-a-hidden-gem-of-the-forest/index.html': '/wildlife/articles/discovering-the-marbled-cat-a-hidden-gem-of-the-forest.html',
  'wildlife/articles/exploring-the-world-of-the-brown-arctic-fox.html': '/wildlife/articles/exploring-the-world-of-the-brown-arctic-fox.html',
  'exploring-the-world-of-the-brown-arctic-fox/index.html': '/wildlife/articles/exploring-the-world-of-the-brown-arctic-fox.html',
  'wildlife/articles/grizzly-bears-the-mighty-wanderers-of-the-wild.html': '/wildlife/articles/grizzly-bears-the-mighty-wanderers-of-the-wild.html',
  'grizzly-bears-the-mighty-wanderers-of-the-wild/index.html': '/wildlife/articles/grizzly-bears-the-mighty-wanderers-of-the-wild.html',
  'wildlife/articles/discover-the-european-wildcat-a-mysterious-forest-dweller.html': '/wildlife/articles/discover-the-european-wildcat-a-mysterious-forest-dweller.html',
  'discover-the-european-wildcat-a-mysterious-forest-dweller/index.html': '/wildlife/articles/discover-the-european-wildcat-a-mysterious-forest-dweller.html',
  'wildlife/articles/meet-the-american-pine-marten-the-forests-furry-acrobat.html': '/wildlife/articles/meet-the-american-pine-marten-the-forests-furry-acrobat.html',
  'meet-the-american-pine-marten-the-forests-furry-acrobat/index.html': '/wildlife/articles/meet-the-american-pine-marten-the-forests-furry-acrobat.html',
  'wildlife/articles/snow-leopards-the-ghosts-of-the-mountains.html': '/wildlife/articles/snow-leopards-the-ghosts-of-the-mountains.html',
  'snow-leopards-the-ghosts-of-the-mountains/index.html': '/wildlife/articles/snow-leopards-the-ghosts-of-the-mountains.html',
  'wildlife/articles/discover-the-asian-small-clawed-otter-natures-playful-paddler.html': '/wildlife/articles/discover-the-asian-small-clawed-otter-natures-playful-paddler.html',
  'discover-the-asian-small-clawed-otter-natures-playful-paddler/index.html': '/wildlife/articles/discover-the-asian-small-clawed-otter-natures-playful-paddler.html',
  'wildlife/articles/kangaroos-the-hopping-marvels-of-australia.html': '/wildlife/articles/kangaroos-the-hopping-marvels-of-australia.html',
  'kangaroos-the-hopping-marvels-of-australia/index.html': '/wildlife/articles/kangaroos-the-hopping-marvels-of-australia.html',
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

test('restored wildlife library and all 48 articles have complete real-source metadata and local imagery', () => {
  const articleRoutes = primary.filter(url => url.startsWith('/wildlife/articles/'));
  assert.equal(articleRoutes.length, 48, 'all published original articles are represented');
  const directory = fs.readFileSync(path.join(root, 'wildlife/index.html'), 'utf8');
  assert.equal((directory.match(/class="wildlife-story-card"/g) || []).length, 48, '48 static cards in the index');
  assert.ok(directory.includes('href="/wildlife-production.html"'), 'media production is reachable');
  assert.ok(directory.includes('href="/blobby.html"'), 'Blobby is directly accessible');
  for (const route of articleRoutes) {
    const html = fs.readFileSync(path.join(root, route.slice(1)), 'utf8');
    const slug = route.split('/').at(-1).replace('.html', '');
    assert.ok(html.includes('href="/blobby.html"'), route + ': Blobby promotion');
    assert.ok(html.includes('class="production-promo"'), route + ': original production comparison');
    assert.ok(html.includes('id="lp-app-strip"'), route + ': static 12-app strip');
    assert.ok(html.includes('class="wildlife-article-body"'), route + ': article body');
    const image = 'assets/wildlife/' + slug + '.svg';
    assert.ok(fs.existsSync(path.join(root, image)), route + ': local art asset exists');
    assert.ok(html.includes('src="/' + image + '"'), route + ': local art used');
    const schemas = [...html.matchAll(/<script\\b[^>]*type="application\\/ld\\+json"[^>]*>([\\s\\S]*?)<\\/script>/gi)]
      .map(match => JSON.parse(match[1])).flatMap(data => data['@graph'] || [data]);
    const article = schemas.find(node => node['@type'] === 'Article');
    assert.ok(article, route + ': Article JSON-LD');
    assert.match(article.datePublished, /^2024-\\d{2}-\\d{2}T/, route + ': original published date');
    assert.match(article.dateModified, /^2024-\\d{2}-\\d{2}T/, route + ': original modified date');
    assert.equal(article.mainEntityOfPage['@id'], site + route + '#webpage');
    for (const video of schemas.filter(node => node['@type'] === 'VideoObject')) {
      assert.ok(video.uploadDate, route + ': video uploadDate must be sourced');
      assert.ok(video.thumbnailUrl?.length, route + ': video thumbnail required');
      assert.ok(video.name && video.description, route + ': video name/description required');
    }
  }
});
