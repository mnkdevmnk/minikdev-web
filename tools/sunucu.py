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

Ziyaret sayacının yerel kopyası (canlıda api/sayac.js + Upstash Redis):
  POST /api/sayac  ziyaret/tıklama kaydı  → .sayac.json (git'e ve yayına girmez)
  GET  /api/sayac  yönetici paneli özeti (sadece localhost'tan)
"""
import http.server, json, os, shutil, sys, threading, time

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8643
KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(KOK)

YAZILABILIR = {"js/content.js"}
YEDEK = os.path.join(KOK, ".yedek")
IZINLI = {f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}"}
EN_BUYUK = 2 * 1024 * 1024  # 2 MB
SAYAC = os.path.join(KOK, ".sayac.json")
SAYAC_KILIT = threading.Lock()


def gun(geri=0):
    return time.strftime("%Y-%m-%d", time.gmtime(time.time() + 3 * 3600 - geri * 86400))


def sayac_oku():
    try:
        with open(SAYAC, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"gunler": {}, "kisiler": [], "hedef": {}, "sayfa": {}, "kaynak": {}}


def sayac_yaz(v):
    with open(SAYAC + ".tmp", "w", encoding="utf-8") as f:
        json.dump(v, f, ensure_ascii=False)
    os.replace(SAYAC + ".tmp", SAYAC)


def sirala(h, n=15):
    return sorted(([k, v] for k, v in h.items()), key=lambda x: -x[1])[:n]


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

    def do_GET(self):
        if self.path.split("?")[0].rstrip("/") == "/api/sayac":
            return self._sayac_ozet()
        return super().do_GET()

    def _sayac_ozet(self):
        if f"http://{self.headers.get('Host', '')}" not in IZINLI:
            return self._json(403, {"hata": "izin yok"})
        with SAYAC_KILIT:
            v = sayac_oku()
        gunler = [gun(29 - i) for i in range(30)]
        g = v["gunler"]
        def tekil(liste):
            k = set()
            for d in liste:
                k.update(g.get(d, {}).get("u", []))
            return len(k)
        return self._json(200, {
            "gunler": [{"gun": d, "z": g.get(d, {}).get("z", 0), "t": g.get(d, {}).get("t", 0),
                        "u": len(g.get(d, {}).get("u", []))} for d in gunler],
            "tum": {"z": sum(x.get("z", 0) for x in g.values()), "t": sum(x.get("t", 0) for x in g.values()),
                    "u": len(v["kisiler"])},
            "u7": tekil(gunler[-7:]), "u30": tekil(gunler),
            "hedef": sirala(v["hedef"]), "sayfa": sirala(v["sayfa"]), "kaynak": sirala(v["kaynak"]),
        })

    def _sayac_kaydet(self):
        try:
            uzunluk = int(self.headers.get("Content-Length", "0"))
            b = json.loads(self.rfile.read(min(uzunluk, 4096)).decode("utf-8"))
        except Exception:
            return self._json(400, {"hata": "istek okunamadı"})
        kimlik = str(b.get("id", ""))[:40] or "?"
        with SAYAC_KILIT:
            v = sayac_oku()
            d = v["gunler"].setdefault(gun(), {"z": 0, "t": 0, "u": []})
            if b.get("t") == "z":
                d["z"] += 1
                if kimlik not in d["u"]:
                    d["u"].append(kimlik)
                if kimlik not in v["kisiler"]:
                    v["kisiler"].append(kimlik)
                s = str(b.get("s", "/"))[:80] or "/"
                v["sayfa"][s] = v["sayfa"].get(s, 0) + 1
                r = str(b.get("r", ""))[:60]
                if r:
                    v["kaynak"][r] = v["kaynak"].get(r, 0) + 1
            elif b.get("t") == "t" and b.get("h"):
                d["t"] += 1
                h = str(b["h"])[:70]
                v["hedef"][h] = v["hedef"].get(h, 0) + 1
            else:
                return self._json(400, {"hata": "tür yanlış"})
            sayac_yaz(v)
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path.split("?")[0].rstrip("/") == "/api/sayac":
            return self._sayac_kaydet()
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
