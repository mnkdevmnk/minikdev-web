#!/usr/bin/env python3
"""Yerel önizleme sunucusu: python -m http.server gibi, ama önbelleği kapatır.
Böylece content.js'i kaydedip yenileyince tarayıcı hep son hâlini alır.
Çalıştır: python3 tools/sunucu.py   →  http://localhost:8643

Ayrıca sitedeki yönetici düzenleyicisi (js/yonetici.js) için kayıt ucu var:
  POST /__kaydet  {"dosya": "js/content.js", "icerik": "..."}
- Sadece js/content.js yazılabilir.
- Yazmadan önce eski hâli .yedek/content-YYYYAAGG-SSDDss.js olarak kopyalanır.
- Sunucu sadece 127.0.0.1'i dinler; başka sitelerin tarayıcından buraya yazmasını
  engellemek için Origin/Host kontrol edilir ve JSON istenir.
"""
import http.server, json, os, shutil, sys, time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8643
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(KOK)

YAZILABILIR = {"js/content.js"}
YEDEK = os.path.join(KOK, ".yedek")
IZINLI = {f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"}
EN_BUYUK = 2 * 1024 * 1024  # 2 MB


class Isleyici(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, *a):
        pass

    def _json(self, kod, veri):
        govde = json.dumps(veri, ensure_ascii=False).encode("utf-8")
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(govde)))
        self.end_headers()
        self.wfile.write(govde)

    def do_POST(self):
        if self.path != "/__kaydet":
            return self._json(404, {"hata": "yok"})

        # Sadece bu sitenin kendi sayfasından gelen istekler
        origin = self.headers.get("Origin", "")
        host = self.headers.get("Host", "")
        if origin not in IZINLI or f"http://{host}" not in IZINLI:
            return self._json(403, {"hata": "izin yok"})
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return self._json(415, {"hata": "JSON bekleniyor"})

        try:
            uzunluk = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            uzunluk = 0
        if not 0 < uzunluk <= EN_BUYUK:
            return self._json(413, {"hata": "boyut uygun değil"})

        try:
            veri = json.loads(self.rfile.read(uzunluk).decode("utf-8"))
            dosya, icerik = veri["dosya"], veri["icerik"]
        except Exception:
            return self._json(400, {"hata": "istek okunamadı"})
        if dosya not in YAZILABILIR or not isinstance(icerik, str) or "window.SITE" not in icerik:
            return self._json(400, {"hata": "bu dosya yazılamaz"})

        hedef = os.path.join(KOK, dosya)
        os.makedirs(YEDEK, exist_ok=True)
        ad, uzanti = os.path.splitext(os.path.basename(dosya))
        yedek_ad = f"{ad}-{time.strftime('%Y%m%d-%H%M%S')}{uzanti}"
        if os.path.exists(hedef):
            shutil.copy2(hedef, os.path.join(YEDEK, yedek_ad))

        # Önce geçici dosyaya yaz, sonra yerine koy: yarım dosya kalmasın
        gecici = hedef + ".tmp"
        with open(gecici, "w", encoding="utf-8", newline="") as f:
            f.write(icerik)
        os.replace(gecici, hedef)
        print(f"[kaydet] {dosya} yazıldı, yedek: .yedek/{yedek_ad}", flush=True)
        return self._json(200, {"tamam": True, "yedek": f".yedek/{yedek_ad}"})


http.server.ThreadingHTTPServer.allow_reuse_address = True
with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Isleyici) as s:
    print(f"Site: http://localhost:{PORT}  (durdurmak: Ctrl+C)", flush=True)
    s.serve_forever()
