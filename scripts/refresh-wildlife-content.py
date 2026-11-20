#!/usr/bin/env python3
"""Build real WebP wildlife photos and repair 48 imported ListPull articles.

Original photographs are sourced from their Wikimedia Commons file pages. Each
output stores photographer/license attribution in HTML and photo-credits.json.
This script is intentionally rerunnable and only touches wildlife presentation.
"""
from __future__ import annotations
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
ARTICLES = ROOT / "wildlife" / "articles"
PHOTOS = ROOT / "assets" / "wildlife" / "photos"
PHOTOS.mkdir(parents=True, exist_ok=True)
MANIFEST = {
  "african-forest-elephants-gentle-giants-of-the-forest": "African Forest Elephant.jpg",
  "axolotls-the-fascinating-underwater-marvels": "Axolotls.JPG",
  "bearded-dragons-the-ultimate-pet-lizard": "BeardedDragon.jpg",
  "butterflies-natures-delicate-dancers": "Butterfly photo.jpg",
  "capybaras-gentle-giants-of-the-waterways": "Capybara.jpg",
  "chameleons-the-colorful-communicators-of-the-reptile-world": "A Photo of a Chameleon.jpg",
  "discover-the-asian-small-clawed-otter-natures-playful-paddler": "Asian-small-clawed-otter.jpg",
  "discover-the-elusive-leopard-natures-master-of-stealth-and-beauty": "Leopard (1).jpg",
  "discover-the-european-wildcat-a-mysterious-forest-dweller": "European wildcat 2018-06-21.jpg",
  "discover-the-fascinating-world-of-tree-frogs": "Red-eyed tree frog.jpg",
  "discover-the-majestic-snowy-owl-the-arctics-iconic-bird": "Snowy Owl (43199437234).jpg",
  "discover-the-margay-the-master-climber-of-the-cat-world": "Margay.jpg",
  "discover-the-world-of-beetles-natures-ingenious-insects": "BEETLE.jpg",
  "discovering-the-marbled-cat-a-hidden-gem-of-the-forest": "Pardofelis marmorata 300280177.jpg",
  "discovering-the-northern-saw-whet-owl-natures-tiny-nocturnal-hunter": "Northern Saw-whet Owl (31782230482).jpg",
  "dolphins-the-playful-ambassadors-of-the-ocean": "Dolphin.jpg",
  "exploring-the-wonders-of-underwater-wildlife-marine-mammals-fish-and-ocean-ecosystems": "Coral reef.jpg",
  "exploring-the-world-of-the-brown-arctic-fox": "Posing for a portrait (Unsplash).jpg",
  "grizzly-bears-the-mighty-wanderers-of-the-wild": "Grizzly bear (28902713776).jpg",
  "hummingbirds-the-dazzling-aerial-acrobats-of-the-bird-world": "Hovering Hummingbird.jpg",
  "kangaroos-the-hopping-marvels-of-australia": "Kangaroo - 1.jpg",
  "koalas-australias-beloved-tree-huggers": "Koala 2026.jpg",
  "meet-the-american-pine-marten-the-forests-furry-acrobat": "American marten (53471037352).jpg",
  "polar-bears-giants-of-the-arctic-ice": "Polar bear.jpg",
  "salamanders-natures-fascinating-amphibians": "Salamander-salamandra.jpg",
  "sea-turtles-navigators-of-the-oceans-mysteries": "Seaturtle Underwater (43718019402).jpg",
  "snow-leopards-the-ghosts-of-the-mountains": "Snow leopard.jpg",
  "the-amur-leopard-conservation-efforts-for-the-worlds-rarest-big-cat": "Amur Leopard.jpg",
  "the-bald-eagle-a-symbol-of-resilience-and-conservation-triumph": "Bald eagle (Haliaeetus leucocephalus).jpg",
  "the-charming-world-of-the-tufted-titmouse-a-closer-look-at-these-backyard-favorites": "Tufted Titmouse USA.jpg",
  "the-cheetah-natures-speedster-and-conservation-icon": "Cheetah.jpg",
  "the-clouded-leopard-a-mysterious-marvel-of-the-wild": "Clouded Leopard.jpg",
  "the-enchanting-world-of-baby-lynx-natures-little-mysteries": "Lynx kitten.jpg",
  "the-enigmatic-white-lions-a-glimpse-into-their-world": "White lions.JPG",
  "the-fascinating-world-of-ants-tiny-architects-of-the-earth": "Ant Macro.jpg",
  "the-fascinating-world-of-catfish-natures-whiskered-wonders": "Catfish.JPG",
  "the-fascinating-world-of-lion-cubs-a-glimpse-into-their-early-life": "Lion cub.jpg",
  "the-fascinating-world-of-pandas-gentle-giants-of-the-bamboo-forest": "Giant panda (1).jpg",
  "the-majestic-male-lion-king-of-the-pride": "Male Lion.jpg",
  "the-southern-brazilian-ocelot-a-hidden-jewel-of-the-wild": "Ocelot.jpg",
  "the-truth-about-white-tigers-understanding-their-unique-existence": "White tiger.jpg",
  "understanding-the-ermine-a-guide-to-the-elusive-weasel": "Stoat in the wild.jpg",
  "understanding-the-rusty-spotted-cat-the-worlds-smallest-feline-marvel": "Rustyspottedcat.jpg",
  "understanding-tigers-majestic-predators-of-the-wild": "Photogenic Tiger.jpg",
  "unveiling-the-mysteries-of-the-king-cobra-natures-majestic-predator": "King Cobra.jpg",
  "unveiling-the-mystique-of-the-black-panther-natures-shadowy-marvel": "Black Panther.JPG",
  "unveiling-the-secrets-of-ulua-the-mighty-predators-of-the-ocean": "Giant trevally (Caranx ignobilis).jpg",
  "unveiling-the-world-of-leopard-geckos-a-beginners-guide": "Common leopard gecko.jpg"
}
HEADERS = {
    "User-Agent": "ListPull-Wildlife-Media/1.0 (https://listpull.com/contact/; Commons attribution and reuse)",
    "Accept": "application/json,image/webp,image/jpeg,image/png,*/*",
}
RESOLUTION = (1200, 900)


def get_bytes(url: str, tries: int = 5) -> bytes:
    error = None
    for attempt in range(tries):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read()
                if not data:
                    raise ValueError("Empty response")
                return data
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as exc:
            error = exc
            if attempt + 1 < tries:
                time.sleep(min(20, 2 ** attempt + 1))
    raise RuntimeError(f"Download failed: {url}: {error}")


def commons_info(filename: str) -> dict:
    query = urllib.parse.urlencode({
        "action": "query", "format": "json", "formatversion": 2,
        "prop": "imageinfo", "iiprop": "url|extmetadata",
        "iiurlwidth": 1280, "redirects": 1,
        "titles": "File:" + filename,
    })
    url = "https://commons.wikimedia.org/w/api.php?" + query
    data = json.loads(get_bytes(url))
    pages = data.get("query", {}).get("pages", [])
    if not pages or "imageinfo" not in pages[0]:
        raise ValueError(f"Commons photo not found: {filename}")
    info = pages[0]["imageinfo"][0]
    ex = info.get("extmetadata", {})

    def meta(name: str) -> str:
        return ex.get(name, {}).get("value", "")

    def strip_markup(value: str) -> str:
        soup = BeautifulSoup(value or "", "html.parser")
        return re.sub(r"\s+", " ", html.unescape(soup.get_text(" ", strip=True))).strip()

    rights = strip_markup(meta("LicenseShortName") or meta("UsageTerms"))
    rights_url = meta("LicenseUrl")
    artist = strip_markup(meta("Artist") or meta("Credit") or "Wikimedia Commons contributor")
    if not rights or not re.search(r"CC|Creative Commons|public domain|PD-|GFDL|Free Art|FAL", rights, re.I):
        raise RuntimeError(f"Please review image license for {filename}: {rights!r}")
    actual = pages[0].get("title", "File:" + filename).removeprefix("File:")
    source = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(actual.replace(" ", "_"), safe="()_-,.")
    return {
        "filename": actual, "source": source, "artist": artist,
        "license": rights, "license_url": rights_url or source,
        "image_url": info.get("thumburl") or info["url"],
    }


def save_photos() -> dict:
    credits = {}
    for i, (slug, filename) in enumerate(MANIFEST.items(), start=1):
        target = PHOTOS / (slug + ".webp")
        details = commons_info(filename)
        details.pop("image_url", None)
        credits[slug] = details
        if not target.exists() or target.stat().st_size < 1024:
            source = commons_info(filename)["image_url"]
            data = get_bytes(source)
            with Image.open(BytesIO(data)) as original:
                if original.format not in ("JPEG", "PNG", "WEBP"):
                    raise RuntimeError(f"Not a photograph-compatible raster format: {filename}")
                im = ImageOps.exif_transpose(original).convert("RGB")
                cover = ImageOps.fit(im, RESOLUTION, method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
                cover.save(target, "WEBP", quality=82, method=6)
        with Image.open(target) as validation:
            if validation.format != "WEBP" or validation.size != RESOLUTION:
                raise RuntimeError(f"Invalid local WebP cover: {target}")
        print(f"[{i:02d}/{len(MANIFEST)}] {target.relative_to(ROOT)}", flush=True)
        time.sleep(0.35)
    (PHOTOS / "photo-credits.json").write_text(json.dumps(credits, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return credits


def esc(value: str) -> str:
    return html.escape(value, quote=True)


def image_markup(slug: str, title: str, credit: dict) -> str:
    img = "/assets/wildlife/photos/" + slug + ".webp"
    alt = "Photograph of " + title.split(":")[0].replace("Discover ", "").replace("The ", "")
    return (
        '<figure class="wildlife-feature">'
        f'<img src="{img}" alt="{esc(alt)}" width="1200" height="900" '
        'loading="eager" decoding="async" fetchpriority="high">'
        '<figcaption class="wildlife-photo-credit">Photo: '
        f'<a href="{esc(credit["source"])}" target="_blank" rel="noopener noreferrer">'
        f'{esc(credit["artist"])}</a> · '
        f'<a href="{esc(credit["license_url"])}" target="_blank" rel="noopener noreferrer">'
        f'{esc(credit["license"])}</a></figcaption>'
        '</figure>'
    )


def citation_refs(body: str) -> tuple[str, str, int]:
    soup = BeautifulSoup(body, "html.parser")
    citations = {}
    for p in list(soup.find_all("p")):
        t = p.get_text(" ", strip=True)
        if not re.match(r"^Citations\s*:", t, re.I):
            continue
        for match in re.finditer(r"\[(\d{1,3})\]\s*(https?://\S+)", t):
            number = int(match.group(1))
            link = match.group(2).rstrip(".,;")
            if link.startswith("https://") or link.startswith("http://"):
                citations[number] = link
        p.decompose()
    for p in list(soup.find_all("p")):
        t = p.get_text(" ", strip=True)
        if re.search(r"\[caption(?:\s+[^\]]*)?\].*?\[/caption\]", t, re.I | re.S):
            p.decompose()

    def nums_split(digits: str) -> list[int] | None:
        if int(digits) in citations:
            return [int(digits)]
        pieces = []
        pos = 0
        while pos < len(digits):
            match = None
            for size in (2, 1):
                value = int(digits[pos:pos + size])
                if len(digits[pos:pos + size]) == size and value in citations:
                    match = (value, size)
                    break
            if not match:
                return None
            pieces.append(match[0])
            pos += match[1]
        return pieces

    def superscript(numbers: list[int]) -> str:
        return "".join(f'<sup class="wildlife-cite"><a href="#wildlife-ref-{n}" '
                       f'aria-label="Source {n}">[{n}]</a></sup>' for n in numbers)

    if citations:
        for node in list(soup.descendants):
            if not isinstance(node, NavigableString) or not node.parent:
                continue
            if node.parent.name in ("a", "code", "pre", "script", "sup"):
                continue
            raw = str(node)
            updated = re.sub(r"\[(\d{1,2})\]", lambda m:
                             superscript([int(m.group(1))]) if int(m.group(1)) in citations else m.group(0),
                             raw)

            def grouped(m: re.Match) -> str:
                vals = [int(x) for x in re.findall(r"\d+", m.group(0))]
                if vals and all(n in citations for n in vals):
                    return superscript(vals)
                return m.group(0)

            updated = re.sub(r"(?:\s+\d{1,2}){2,}(?=[.,;!?)]|$)", grouped, updated)

            def attached(m: re.Match) -> str:
                vals = nums_split(m.group(1))
                return superscript(vals) if vals else m.group(1)

            updated = re.sub(r"(?<=[A-Za-z)])(\d{1,4})(?=[.,;!?)]|$)", attached, updated)
            # A single terminal source number is treated as a reference only if
            # the preceding word is not a measure or numeral phrase.
            def singleton(m: re.Match) -> str:
                start, num = m.group(1), int(m.group(2))
                if num not in citations or re.search(
                    r"\b(?:about|around|over|under|nearly|approximately|between|by|of|to|in|at|from)\s*$", start, re.I
                ):
                    return m.group(0)
                return start + superscript([num])
            updated = re.sub(r"(.{4,}?\b)(?:\s+)(\d{1,2})(?=[.;!?)]|$)", singleton, updated)
            if updated != raw:
                frag = BeautifulSoup(updated, "html.parser")
                node.replace_with(*list(frag.contents))
    refs_html = ""
    if citations:
        items = "".join(
            f'<li id="wildlife-ref-{n}"><a href="{esc(u)}" target="_blank" rel="noopener noreferrer">'
            f'{esc(urllib.parse.urlparse(u).netloc)} · {esc(u)}</a></li>'
            for n, u in sorted(citations.items())
        )
        refs_html = (
            '<section class="wildlife-references" id="references" aria-labelledby="wildlife-references-title">'
            '<h2 id="wildlife-references-title">Sources and further reading</h2>'
            '<ol>' + items + '</ol></section>'
        )
    return str(soup), refs_html, len(citations)


def social_aside(existing: str) -> str:
    links = list(dict.fromkeys(re.findall(r'href="([^"]+)"', existing)))
    frames = []
    for link in links:
        m = re.search(r"instagram\.com/(?:reel|p)/([A-Za-z0-9_-]+)", link)
        if m:
            code = m.group(1)
            src = "https://www.instagram.com/reel/" + code + "/embed/"
            if "/p/" in link:
                src = "https://www.instagram.com/p/" + code + "/embed/"
            frames.append(
                '<div class="wildlife-embed wildlife-embed-instagram">'
                f'<iframe loading="lazy" src="{esc(src)}" '
                f'title="Related Instagram wildlife post {esc(code)}" '
                'allow="encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin"></iframe>'
                '<p><a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">'
                'View the original Instagram post</a></p></div>'
            )
            continue
        match = re.search(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)([\w-]{11})", link)
        if match:
            vid = match.group(1)
            frames.append(
                '<div class="wildlife-embed wildlife-embed-youtube">'
                f'<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/{vid}" '
                f'title="Related wildlife video on YouTube {vid}" '
                'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" '
                'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
                '<p><a href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">'
                'Watch on YouTube</a></p></div>'
            )
    if not frames:
        return ('<aside class="wildlife-social"><h2>More wildlife stories</h2>'
                '<p>Discover more animals and habitats in the ListPull wildlife archive.</p>'
                '<a class="wildlife-pill" href="/wildlife/">Explore the wildlife archive ↗</a></aside>')
    return ('<aside class="wildlife-social"><h2>Related wildlife media</h2>'
            '<p>Watch the related posts and videos here, or open the originals on their platforms.</p>'
            '<div class="wildlife-embed-grid">' + "".join(frames) + '</div></aside>')


def update_article(path: Path, credit: dict) -> int:
    slug = path.stem
    original = path.read_text(encoding="utf-8")
    h1 = re.search(r'<header class="wildlife-article-header">.*?<h1>(.*?)</h1>', original, re.S)
    title = html.unescape(re.sub(r"<[^>]*>", "", h1.group(1))) if h1 else slug.replace("-", " ").title()
    photo_url = f"https://listpull.com/assets/wildlife/photos/{slug}.webp"
    result, count = re.subn(
        r'<figure class="wildlife-feature">.*?</figure>',
        image_markup(slug, title, credit), original, count=1, flags=re.S
    )
    if count != 1:
        raise ValueError(f"Missing featured image on {path}")
    for key in ('<meta property="og:image" content="', '<meta name="twitter:image" content="'):
        result, count = re.subn(re.escape(key) + r'[^"]*',
                                lambda m: key + esc(photo_url), result, count=1)
        if count != 1:
            raise ValueError(f"Missing social photo metadata in {path}: {key}")
    if 'property="og:image:alt"' not in result:
        result = result.replace(
            '<meta property="og:image" content="' + photo_url + '">',
            '<meta property="og:image" content="' + photo_url + '">'
            f'<meta property="og:image:alt" content="{esc(title)}">',
            1
        )
    def schema(m: re.Match) -> str:
        record = json.loads(m.group(2))
        for entity in record.get('@graph', []):
            if entity.get('@type') == 'Article':
                entity['image'] = {
                    '@type': 'ImageObject', 'url': photo_url, 'width': 1200, 'height': 900
                }
        return m.group(1) + json.dumps(record, ensure_ascii=False, separators=(',', ':')) + m.group(3)
    result, count = re.subn(
        r'(<script type="application/ld\+json">)(.*?)(</script>)',
        schema, result, count=1, flags=re.S
    )
    if not count:
        raise ValueError(f"Missing JSON-LD in {path}")
    m = re.search(r'(<div class="wildlife-article-body">)(.*?)(</div>)', result, re.S)
    if not m:
        raise ValueError(f"Missing article body in {path}")
    updated_body, refs, nrefs = citation_refs(m.group(2))
    result = result[:m.start()] + m.group(1) + updated_body + m.group(3) + refs + result[m.end():]
    result, count = re.subn(
        r'<aside class="wildlife-social">.*?</aside>',
        lambda m: social_aside(m.group()), result, count=1, flags=re.S
    )
    if not count:
        # Some imported posts never contained related social media. Give these a
        # first-party archive link instead of inventing a third-party embed.
        result, inserted = re.subn(r'</article>', social_aside('') + '</article>', result, count=1)
        if not inserted:
            raise ValueError(f"Missing article closing tag in {path}")
    if "Wildlife illustration created for this ListPull article." in result:
        raise ValueError(f"Literal placeholder text survived in {path}")
    path.write_text(result, encoding="utf-8")
    return nrefs


def update_directory() -> None:
    path = ROOT / "wildlife" / "index.html"
    text = path.read_text(encoding="utf-8")
    hero = (
        '<div class="wildlife-hero-art" aria-label="ListPull wildlife photography and production">'
        '<a class="wildlife-hero-photo wildlife-hero-primary" href="#stories">'
        '<img src="/wildlife.webp" width="1100" height="630" loading="eager" fetchpriority="high" '
        'alt="Wildlife scene featured in ListPull media"><strong>Wildlife stories</strong></a>'
        '<a class="wildlife-hero-photo wildlife-hero-secondary" href="#stories">'
        '<img src="/magnific-5h1S5Pe2As9h5lGYfbxQ-IMG_2709-min.webp" '
        'width="1200" height="900" loading="eager" alt="ListPull wildlife photography">'
        '<strong>Explore nature</strong></a>'
        '<a class="wildlife-hero-photo wildlife-hero-production" href="/wildlife-production.html">'
        '<img src="/assets/production/fox-cubs-after.webp" width="810" height="1440" loading="lazy" '
        'alt="Two fox cubs in the finished ListPull wildlife film">'
        '<strong>See our wildlife production ↗</strong></a></div>'
    )
    if 'class="wildlife-hero-art"' not in text:
        text, n = re.subn(
            r'(<section class="wildlife-directory-hero">.*?)<img src="/wildlife\.webp"[^>]*>(</section>)',
            lambda m: m.group(1) + hero + m.group(2),
            text, count=1, flags=re.S
        )
        if n != 1:
            raise ValueError("Unable to replace original Wildlife hero image")
    for slug in MANIFEST:
        old = "/assets/wildlife/" + slug + ".svg"
        new = "/assets/wildlife/photos/" + slug + ".webp"
        if old not in text and new not in text:
            raise ValueError(f"Missing wildlife card for {slug}")
        text = text.replace(old, new)
    text = text.replace('alt="Illustration: ', 'alt="Wildlife photograph: ')
    path.write_text(text, encoding="utf-8")


def update_styles() -> None:
    path = ROOT / "assets" / "wildlife-archive.css"
    css = path.read_text(encoding="utf-8")
    marker = "/* Wildlife photo archive + native provider embeds */"
    if marker in css:
        return
    css += """
/* Wildlife photo archive + native provider embeds */
.wildlife-directory-hero .wildlife-hero-art{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);grid-template-rows:repeat(2,minmax(150px,1fr));gap:12px;min-height:330px;height:clamp(320px,32vw,435px)}
.wildlife-hero-photo{display:block;position:relative;min-width:0;min-height:0;overflow:hidden;border:1px solid #5e7081;border-radius:21px;background:#17352e;text-decoration:none;color:#fff;box-shadow:0 16px 28px #0004}
.wildlife-hero-primary{grid-row:1 / span 2}
.wildlife-hero-photo img{width:100%;height:100%;display:block;object-fit:cover;transition:transform .32s ease}
.wildlife-hero-photo:hover img{transform:scale(1.045)}
.wildlife-hero-photo strong{position:absolute;left:10px;right:10px;bottom:10px;font-size:.81rem;font-weight:850;line-height:1.25;padding:10px 12px;border-radius:10px;background:linear-gradient(90deg,#071c24e8,#071c24a6);color:#fff}
.wildlife-hero-production img{object-position:center 40%}
.wildlife-feature img{display:block;aspect-ratio:4/3;object-fit:cover;background:#172b34}
.wildlife-photo-credit{font-size:.8rem;line-height:1.5;color:#bccbda;margin:9px 0 0}
.wildlife-photo-credit a{color:#b9e6ec;text-decoration:underline}
.wildlife-article-body .wildlife-cite{font-size:.67rem;line-height:0;vertical-align:super;margin-inline:1px}
.wildlife-article-body .wildlife-cite a{color:#88e8d9;text-decoration:none;font-weight:750}
.wildlife-references{padding:23px 26px;margin:35px 0;border:1px solid #3d526c;border-radius:18px;background:#0c1d31}
.wildlife-references h2{font-size:1.35rem;margin:0 0 16px;color:white}
.wildlife-references ol{margin:0;padding-left:27px;overflow-wrap:anywhere}
.wildlife-references li{margin:9px 0;color:#b7cfe0;line-height:1.55}
.wildlife-references a{color:#b7e9e5;text-decoration:underline;font-size:.85rem}
.wildlife-cite a:focus-visible,.wildlife-references a:focus-visible,.wildlife-hero-photo:focus-visible{outline:3px solid #a2e9db;outline-offset:3px}
.wildlife-embed-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr));gap:17px;margin-top:18px}
.wildlife-embed{min-width:0;overflow:hidden;border-radius:16px;background:#071626;border:1px solid #36516e;padding:12px}
.wildlife-embed iframe{width:100%;display:block;border:0;border-radius:9px;background:#fff}
.wildlife-embed-instagram iframe{height:480px;max-height:70vh}
.wildlife-embed-youtube iframe{aspect-ratio:16/9}
.wildlife-embed p{font-size:.83rem;margin:10px 4px 2px}
.wildlife-embed p a{color:#a4e6db;text-decoration:underline}
@media(max-width:780px){.wildlife-directory-hero .wildlife-hero-art{height:340px;min-height:0}}
@media(max-width:520px){.wildlife-directory-hero .wildlife-hero-art{height:280px;gap:8px;grid-template-rows:repeat(2,minmax(0,1fr))}.wildlife-hero-photo{border-radius:14px}.wildlife-hero-photo strong{left:7px;right:7px;bottom:7px;padding:7px 8px;font-size:.68rem}.wildlife-references{padding:20px 15px}}
@media(prefers-reduced-motion:reduce){.wildlife-hero-photo img{transition:none}}
"""
    path.write_text(css, encoding="utf-8")


def update_contextual_links() -> int:
    updates = 0
    for path in ROOT.rglob("*.html"):
        relative = path.relative_to(ROOT).as_posix()
        if relative.startswith("wildlife/articles/") or (len(path.relative_to(ROOT).parts) > 1 and
            path.name == "index.html" and path.parent.name in MANIFEST):
            continue
        old = path.read_text(encoding="utf-8")
        def change(m: re.Match) -> str:
            nonlocal updates
            tag = m.group(0)
            visible = re.sub(r"<[^>]+>", "", tag).strip()
            url_match = re.search(r'href="([^"]+)"', tag)
            if not url_match:
                return tag
            href = html.unescape(url_match.group(1))
            if not re.search(r"(instagram\.com|youtube\.com|youtu\.be)", href):
                return tag
            # Preserve explicit social FOLLOW links; convert nature/wildlife
            # discovery calls-to-action to an owned, indexable landing page.
            if re.search(r"follow|subscribe|Instagram profile|YouTube channel", visible, re.I):
                return tag
            homepage_wildlife = (relative == "index.html" and 'class="wildlife-link"' in tag
                                 and "youtube.com/@listpull" in href)
            if not homepage_wildlife and not re.search(r"wildlife|animal|nature|reel", visible, re.I):
                return tag
            updates += 1
            tag = tag.replace(url_match.group(0), 'href="/wildlife/"')
            tag = re.sub(r'\s+target="_blank"', "", tag)
            tag = re.sub(r'\s+rel="noopener noreferrer"', "", tag)
            if homepage_wildlife:
                tag = tag.replace("Watch on YouTube", "Explore wildlife stories")
            return tag
        new = re.sub(r'<a\b[^>]*>.*?</a>', change, old, flags=re.S | re.I)
        if relative == "labs.html":
            new = new.replace(
                '<a class="lp-labs-action secondary" href="/wildlife/">Wildlife on Instagram ↗</a>', ''
            )
        if new != old:
            path.write_text(new, encoding="utf-8")
    return updates


def update_tests() -> None:
    path = ROOT / "tests" / "wildlife-browser.spec.cjs"
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        r"/\/assets\/wildlife\/sea-turtles.*\.svg/",
        r"/\/assets\/wildlife\/photos\/sea-turtles.*\.webp/"
    )
    anchor = "  await expect(page.locator('h1')).toContainText('Nature has');"
    if "wildlife-hero-art" not in text:
        text = text.replace(anchor, anchor + """
  await expect(page.locator('.wildlife-hero-art img')).toHaveCount(3);
  await expect(page.locator('.wildlife-hero-production')).toHaveAttribute('href','/wildlife-production.html');
  await expect(page.locator('.wildlife-story-card img[src$=".webp"]')).toHaveCount(48);""")
    anchor = "  await expect(page.locator('.wildlife-article-body')).toContainText('sea turtles');"
    if 'wildlife-social iframe' not in text:
        text = text.replace(anchor, anchor + """
  await expect(page.locator('.wildlife-social iframe')).toHaveCount(2);
  await expect(page.locator('.wildlife-feature img')).toHaveAttribute('width','1200');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content',/sea-turtles.*\\.webp/);""")
    text = text.replace(
        "  await expect(page.locator('.wildlife-social a[href*=\"instagram.com/reel/\"]')).toHaveCount(1);",
        "  await expect(page.locator('.wildlife-social a[href*=\"instagram.com/reel/\"]')).toHaveCount(1);"
    )
    if "all wildlife pages use local WebP photos with source credits and valid inline citations" not in text:
        text += """
test('all wildlife pages use local WebP photos with source credits and valid inline citations',async({page})=>{
  const fs=require('fs'),path=require('path');
  const root=path.resolve(__dirname,'..');
  const articles=fs.readdirSync(path.join(root,'wildlife/articles')).filter(f=>f.endsWith('.html'));
  expect(articles).toHaveLength(48);
  for(const file of articles){
    const source=fs.readFileSync(path.join(root,'wildlife/articles',file),'utf8');
    const slug=file.replace(/\\.html$/,'');
    const raster=path.join(root,'assets','wildlife','photos',slug+'.webp');
    expect(fs.existsSync(raster),slug).toBe(true);
    expect(fs.readFileSync(raster).subarray(0,4).toString('ascii')).toBe('RIFF');
    expect(source).toContain('/assets/wildlife/photos/'+slug+'.webp');
    expect(source).not.toContain('Wildlife illustration created for this ListPull article.');
    expect(source).not.toMatch(/\\[caption[^\\]]*\\]/);
    expect(source).toContain('wildlife-photo-credit');
    expect(source).toContain('og:image');
    for(const match of source.matchAll(/href="#wildlife-ref-(\\d+)"/g)){
      expect(source).toContain('id="wildlife-ref-'+match[1]+'"');
    }
  }
});
"""
    path.write_text(text, encoding="utf-8")
    seo_path = ROOT / "tests" / "seo-metadata.test.cjs"
    seo = seo_path.read_text(encoding="utf-8")
    old_asset = "const image = 'assets/wildlife/' + slug + '.svg';"
    new_asset = "const image = 'assets/wildlife/photos/' + slug + '.webp';"
    if old_asset in seo:
        seo = seo.replace(old_asset, new_asset)
        seo = seo.replace("local art asset exists", "local WebP photograph exists")
        seo = seo.replace("local art used", "local WebP photograph used")
        seo = seo.replace(
            "assert.ok(fs.existsSync(path.join(root, image)), route + ': local WebP photograph exists');",
            "assert.ok(fs.existsSync(path.join(root, image)), route + ': local WebP photograph exists');\n"
            "    assert.equal(fs.readFileSync(path.join(root, image)).subarray(0, 4).toString('ascii'), 'RIFF', route + ': real raster image');"
        )
        seo = seo.replace(
            "assert.ok(html.includes('src=\"/' + image + '\"'), route + ': local WebP photograph used');",
            "assert.ok(html.includes('src=\"/' + image + '\"'), route + ': local WebP photograph used');\n"
            "    assert.ok(html.includes('class=\"wildlife-photo-credit\"'), route + ': photographer attribution');"
        )
        seo_path.write_text(seo, encoding="utf-8")


def main() -> None:
    slugs = {p.stem for p in ARTICLES.glob("*.html")}
    if slugs != set(MANIFEST):
        raise ValueError(f"Article/photo mismatch; missing={slugs-set(MANIFEST)}, extra={set(MANIFEST)-slugs}")
    credits = save_photos()
    for file in sorted(ARTICLES.glob("*.html")):
        count = update_article(file, credits[file.stem])
        print(f"Sources: {file.stem} ({count})")
    update_directory()
    update_styles()
    changed = update_contextual_links()
    update_tests()
    for icon in (ROOT / "assets" / "wildlife").glob("*.svg"):
        icon.unlink()
    print(f"Built {len(credits)} real WebP photos. Updated contextual social links: {changed}")


if __name__ == "__main__":
    main()
