/* CANLI YENİLEME (sadece kendi bilgisayarında çalışır)
   Dosyalardan biri kaydedilince sayfayı kendiliğinden yeniler.
   Site internete çıktığında hiçbir şey yapmaz. */
(() => {
  const yerel = ["localhost", "127.0.0.1"].includes(location.hostname);
  // Sadece python sunucusunda (8643). VS Code Live Preview (8644) kendi yeniliyor.
  if (!yerel || location.port !== "8643") return;

  const DOSYALAR = ["index.html", "css/style.css", "js/content.js", "js/app.js", "js/ajan-sozleri.js", "js/ajanlar.js"];
  const son = {};

  async function damga(yol) {
    try {
      const r = await fetch(yol, { method: "HEAD", cache: "no-store" });
      return r.headers.get("Last-Modified") + "|" + r.headers.get("Content-Length");
    } catch { return null; }
  }

  async function kontrol() {
    for (const yol of DOSYALAR) {
      const d = await damga(yol);
      if (d === null) continue;
      if (son[yol] && son[yol] !== d) {
        // Sadece CSS değiştiyse sayfayı yenilemeden stili değiştir
        if (yol.endsWith(".css")) {
          const link = document.querySelector(`link[href^="${yol}"]`);
          if (link) { link.href = yol + "?t=" + Date.now(); son[yol] = d; continue; }
        }
        // Önbelleği tazele: yoksa yenilenen sayfa eski content.js'i önbellekten alır
        await Promise.all(DOSYALAR.map((f) => fetch(f, { cache: "reload" }).catch(() => {})));
        sessionStorage.setItem("canliScroll", String(scrollY));
        sessionStorage.setItem("canliYenile", "1");   // açılış ajanları bu sefer oynamasın
        location.reload();
        return;
      }
      son[yol] = d;
    }
  }

  // Yenilemeden önceki kaydırma konumuna geri dön
  const eski = sessionStorage.getItem("canliScroll");
  if (eski !== null) {
    sessionStorage.removeItem("canliScroll");
    addEventListener("load", () => scrollTo(0, +eski));
  }

  kontrol();
  setInterval(kontrol, 800);
  console.info("[canlı] VS Code'da kaydedince sayfa kendiliğinden yenilenir.");
})();
