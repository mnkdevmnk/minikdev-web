#!/usr/bin/env python3
"""
Yayın dosyalarını üretir. js/content.js'i okur, şunları yazar:

  yazi/<slug>/index.html   Her yayınlanmış yazı için ayrı sayfa (Google ve paylaşım önizlemesi için).
                           draft: true olan yazılar ATLANIR.
  feed.xml                 RSS 2.0
  sitemap.xml              Ana sayfa + yazı sayfaları
  robots.txt
  index.html               Sadece <!-- OG:BASLA --> ... <!-- OG:BITIR --> arası (site adresi).

Site adresi aşağıdaki SITE_URL'de. Vercel adresi belli olunca orayı değiştir,
ya da ortam değişkeniyle ver:  SITE_URL=https://ornek.vercel.app python3 tools/yayin.py

content.js düz JS olduğu için çalıştırılarak okunur: varsa `node`, yoksa macOS'taki
`osascript -l JavaScript` kullanılır. Ek kurulum gerekmez.

Çalıştır:
  cd ~/KOD_CALISMALARIM/WEB_PORTFOLIO && python3 tools/yayin.py
"""
import datetime, email.utils, html, json, os, pathlib, re, shutil, subprocess, sys, tempfile

SITE_URL = os.environ.get("SITE_URL", "https://minikdev-web.vercel.app").rstrip("/")
SITE_ADI = "Kayra · Minik.Dev"
ACIKLAMA = "Kayra'nın blogu: ESP32, iOS, macOS ve gömülü sistem projeleri, notlar ve medya bağlantıları."

KOK = pathlib.Path(__file__).resolve().parent.parent


# ---------- content.js'i oku ----------
def site_verisi():
    kaynak = (KOK / "js" / "content.js").read_text(encoding="utf-8")
    govde = "var window = {};\n" + kaynak + "\n;"
    with tempfile.TemporaryDirectory() as d:
        if shutil.which("node"):
            yol = pathlib.Path(d) / "oku.js"
            yol.write_text(govde + "process.stdout.write(JSON.stringify(window.SITE));", encoding="utf-8")
            komut = ["node", str(yol)]
        elif shutil.which("osascript"):
            yol = pathlib.Path(d) / "oku.js"
            yol.write_text(govde + "JSON.stringify(window.SITE);", encoding="utf-8")
            komut = ["osascript", "-l", "JavaScript", str(yol)]
        else:
            sys.exit("node ya da osascript bulunamadı; content.js okunamıyor.")
        r = subprocess.run(komut, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("content.js okunamadı:\n" + r.stderr)
    return json.loads(r.stdout)


def esc(s):
    return html.escape(str(s or ""), quote=True)


def tarih_rfc822(gun):
    d = datetime.datetime.strptime(gun, "%Y-%m-%d").replace(hour=9, tzinfo=datetime.timezone(datetime.timedelta(hours=3)))
    return email.utils.format_datetime(d)


def tarih_tr(gun):
    aylar = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz",
             "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
    y, a, g = map(int, gun.split("-"))
    return f"{g} {aylar[a - 1]} {y}"


def mutlak(govde):
    """Yazı gövdesindeki göreli img/src ve href'leri kök-göreli yap (yazi/slug/ altında kırılmasın)."""
    return re.sub(r'(\s(?:src|href)=")(?!https?:|mailto:|#|/|data:)', r'\1/', govde)


# ---------- şablonlar ----------
FONT = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Instrument+Serif:ital@1'
        '&family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">')

IKON = ('<link rel="icon" href="/img/favicon.svg" type="image/svg+xml">\n'
        '<link rel="apple-touch-icon" href="/img/apple-touch-icon.png">')


def og_blogu(baslik, aciklama, url, tur="website", ekstra=""):
    return f"""<link rel="canonical" href="{url}">
<meta property="og:type" content="{tur}">
<meta property="og:site_name" content="{esc(SITE_ADI)}">
<meta property="og:locale" content="tr_TR">
<meta property="og:title" content="{esc(baslik)}">
<meta property="og:description" content="{esc(aciklama)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE_URL}/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(baslik)}">
<meta name="twitter:description" content="{esc(aciklama)}">
<meta name="twitter:image" content="{SITE_URL}/img/og.png">
<meta name="theme-color" content="#050505">
<link rel="alternate" type="application/rss+xml" title="{esc(SITE_ADI)}" href="{SITE_URL}/feed.xml">{ekstra}"""


def yazi_sayfasi(p):
    url = f"{SITE_URL}/yazi/{p['slug']}/"
    ld = json.dumps({
        "@context": "https://schema.org", "@type": "BlogPosting",
        "headline": p["title"], "description": p.get("excerpt", ""),
        "datePublished": p["date"], "inLanguage": "tr",
        "author": {"@type": "Person", "name": "Kayra", "url": SITE_URL + "/"},
        "mainEntityOfPage": url, "image": f"{SITE_URL}/img/og.png",
    }, ensure_ascii=False)
    ekstra = (f'\n<meta property="article:published_time" content="{p["date"]}">'
              f'\n<script type="application/ld+json">{ld}</script>')
    return f"""<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(p['title'])} · {esc(SITE_ADI)}</title>
<meta name="description" content="{esc(p.get('excerpt', ''))}">
<!-- OTOMATİK ÜRETİLDİ: tools/yayin.py. Elle düzenleme; content.js'i değiştirip betiği çalıştır. -->
{og_blogu(p['title'], p.get('excerpt', ''), url, "article", ekstra)}
{IKON}
{FONT}
<link rel="stylesheet" href="/css/style.css">
<style>
  .reader.sayfa{{position:static;background:none;backdrop-filter:none;-webkit-backdrop-filter:none;animation:none}}
  .yazi-alt{{display:flex;flex-wrap:wrap;gap:10px;margin-top:48px;padding-top:28px;border-top:1px solid var(--line)}}
  .yazi-meta{{display:flex;gap:14px;font:12px var(--mono);letter-spacing:.06em;color:var(--dim)}}
</style>
</head>
<body>
<div class="reader sayfa">
  <div class="reader-inner">
    <a class="reader-close" href="/#yazilar">← SİTEYE DÖN</a>
    <article>
      <span class="pill">{esc(p['category'].upper())}</span>
      <h1>{esc(p['title'])}</h1>
      <div class="yazi-meta"><time datetime="{p['date']}">{tarih_tr(p['date'])}</time><span>{p.get('read', '')} dk okuma</span></div>
      <p class="lede">{esc(p.get('excerpt', ''))}</p>
      <div class="body">{mutlak(p['body'])}</div>
    </article>
    <div class="yazi-alt">
      <a class="btn" href="/#yazilar">TÜM YAZILAR →</a>
      <a class="btn ghost" href="/feed.xml">RSS</a>
    </div>
  </div>
</div>
</body>
</html>
"""


def rss(yazilar):
    ogeler = []
    for p in yazilar:
        url = f"{SITE_URL}/yazi/{p['slug']}/"
        ogeler.append(f"""    <item>
      <title>{esc(p['title'])}</title>
      <link>{url}</link>
      <guid isPermaLink="true">{url}</guid>
      <pubDate>{tarih_rfc822(p['date'])}</pubDate>
      <category>{esc(p['category'])}</category>
      <description>{esc(p.get('excerpt', ''))}</description>
      <content:encoded><![CDATA[{mutlak(p['body']).replace(']]>', ']]]]><![CDATA[>')}]]></content:encoded>
    </item>""")
    son = tarih_rfc822(yazilar[0]["date"]) if yazilar else email.utils.format_datetime(datetime.datetime.now(datetime.timezone.utc))
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>{esc(SITE_ADI)}</title>
    <link>{SITE_URL}/</link>
    <description>{esc(ACIKLAMA)}</description>
    <language>tr</language>
    <lastBuildDate>{son}</lastBuildDate>
    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
{chr(10).join(ogeler)}
  </channel>
</rss>
"""


def sitemap(yazilar):
    son = f"<lastmod>{yazilar[0]['date']}</lastmod>" if yazilar else ""
    satir = [f"  <url><loc>{SITE_URL}/</loc>{son}</url>"]
    for p in yazilar:
        satir.append(f"  <url><loc>{SITE_URL}/yazi/{p['slug']}/</loc><lastmod>{p['date']}</lastmod></url>")
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(satir) + "\n</urlset>\n")


def main():
    S = site_verisi()
    yazilar = sorted([p for p in S.get("posts", []) if not p.get("draft")], key=lambda p: p["date"], reverse=True)

    # Eski yazı sayfalarını temizle (taslağa çekilen ya da silinen yazılar kalmasın).
    # Sadece bu betiğin ürettiği klasörlere dokunulur.
    yazi_kok = KOK / "yazi"
    gecerli = {p["slug"] for p in yazilar}
    if yazi_kok.exists():
        for d in yazi_kok.iterdir():
            f = d / "index.html"
            if d.is_dir() and d.name not in gecerli and f.exists() and "tools/yayin.py" in f.read_text(encoding="utf-8"):
                f.unlink()
                if not any(d.iterdir()):
                    d.rmdir()
                print(f"  - yazi/{d.name}/ (artık yayında değil)")

    for p in yazilar:
        hedef = yazi_kok / p["slug"] / "index.html"
        hedef.parent.mkdir(parents=True, exist_ok=True)
        hedef.write_text(yazi_sayfasi(p), encoding="utf-8")
        print(f"  ✓ yazi/{p['slug']}/")

    (KOK / "feed.xml").write_text(rss(yazilar), encoding="utf-8")
    (KOK / "sitemap.xml").write_text(sitemap(yazilar), encoding="utf-8")
    (KOK / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")

    # index.html'deki OG bloğunu site adresine göre güncelle
    idx = KOK / "index.html"
    metin = idx.read_text(encoding="utf-8")
    blok = "<!-- OG:BASLA (tools/yayin.py yazar) -->\n" + og_blogu(SITE_ADI, ACIKLAMA, SITE_URL + "/") + "\n<!-- OG:BITIR -->"
    yeni, n = re.subn(r"<!-- OG:BASLA.*?<!-- OG:BITIR -->", lambda m: blok, metin, flags=re.S)
    if n and yeni != metin:
        idx.write_text(yeni, encoding="utf-8")
        print("  ✓ index.html OG etiketleri")
    elif not n:
        print("  ! index.html'de OG:BASLA işareti yok, atlandı")

    taslak = sum(1 for p in S.get("posts", []) if p.get("draft"))
    print(f"\n✓ {len(yazilar)} yazı yayında ({taslak} taslak atlandı) · feed.xml · sitemap.xml · robots.txt · {SITE_URL}")


if __name__ == "__main__":
    main()
