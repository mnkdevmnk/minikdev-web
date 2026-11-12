#!/usr/bin/env python3
"""
tools/og.html'den paylaşım görselini ve iPhone ana ekran ikonunu üretir:
  img/og.png               1200×630  (link paylaşınca çıkan kart)
  img/apple-touch-icon.png 180×180   (Safari › Ana Ekrana Ekle)
Mac'teki Google Chrome'u başsız (headless) çalıştırır.

Çalıştır:
  cd ~/KOD_CALISMALARIM/WEB_PORTFOLIO && python3 tools/gorsel-uret.py
"""
import pathlib, subprocess, sys

KOK = pathlib.Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SAYFA = (KOK / "tools" / "og.html").as_uri()

if not pathlib.Path(CHROME).exists():
    sys.exit("Google Chrome bulunamadı: " + CHROME)

for hedef, boyut, ek in [("img/og.png", "1200,630", ""), ("img/apple-touch-icon.png", "180,180", "?ikon")]:
    cikti = KOK / hedef
    r = subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--force-device-scale-factor=1", "--virtual-time-budget=4000",
                        f"--window-size={boyut}", f"--screenshot={cikti}", SAYFA + ek],
                       capture_output=True, text=True, timeout=60)
    if r.returncode != 0 or not cikti.exists():
        sys.exit(f"{hedef} üretilemedi:\n{r.stderr}")
    print(f"✓ {hedef} ({boyut.replace(',', '×')})")
