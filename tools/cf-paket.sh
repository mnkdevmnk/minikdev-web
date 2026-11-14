#!/bin/sh
# Cloudflare Pages yayın paketi: sadece sitede görünecek dosyaları dist/ klasörüne kopyalar.
# Cloudflare › proje › Settings › Build:  Build command: sh tools/cf-paket.sh   Output directory: dist
# (functions/ klasörü kökte kalır, Cloudflare onu kendisi bulur.)
set -e
rm -rf dist && mkdir dist
for f in index.html 404.html _headers feed.xml sitemap.xml robots.txt; do [ -f "$f" ] && cp "$f" dist/; done
for d in css js img yazi; do [ -d "$d" ] && cp -R "$d" dist/; done
rm -f dist/img/.gitkeep dist/js/canli.js.map
echo "dist hazır: $(find dist -type f | wc -l | tr -d ' ') dosya"
