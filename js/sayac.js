/* ZİYARET + TIKLAMA SAYACI (ziyaretçi tarafı)
   Her sayfa açılışında ve her yazı açılışında bir "ziyaret", bağlantı/düğme tıklamalarında
   bir "tıklama" gönderir. Uç: /api/sayac (canlıda Vercel fonksiyonu, yerelde tools/sunucu.py).
   - IP ya da kişisel bilgi gönderilmez; kimlik tarayıcıda üretilen rastgele bir sayı.
   - Yönetici girişi yapılmış tarayıcı kendini saymaz (localStorage: sayacBeniSayma).
   - Panel: js/istatistik.js */
(() => {
  const UC = "/api/sayac";
  const yerelHost = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (yerelHost && location.port === "8644") return; // VS Code Live Preview: ucu yok
  if (navigator.webdriver) return;

  const ls = {
    al: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    koy: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };
  if (ls.al("sayacBeniSayma") === "1") return;

  let id = ls.al("sayacId");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
    ls.koy("sayacId", id);
  }

  function gonder(veri) {
    if (ls.al("sayacBeniSayma") === "1") return; // bu sekmede giriş yapıldıysa
    const govde = JSON.stringify({ ...veri, id });
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(UC, new Blob([govde], { type: "text/plain" }))) return;
    } catch {}
    fetch(UC, { method: "POST", body: govde, keepalive: true, headers: { "Content-Type": "text/plain" } }).catch(() => {});
  }

  // Hangi sayfa: /, /yazi/slug/ ya da ana sayfadaki #yazi/slug okuyucusu
  const sayfa = () => {
    const m = location.hash.match(/^#(yazi\/[^?#]+)/);
    return m ? "/#" + decodeURIComponent(m[1]) : location.pathname;
  };
  let kaynak = "";
  try {
    const r = document.referrer && new URL(document.referrer);
    if (r && r.hostname !== location.hostname) kaynak = r.hostname.replace(/^www\./, "");
  } catch {}

  let son = "";
  function ziyaret() {
    const s = sayfa();
    if (s === son) return;
    son = s;
    gonder({ t: "z", s, r: kaynak });
    kaynak = ""; // kaynak sadece ilk görüntülemede
  }
  ziyaret();
  addEventListener("hashchange", () => { if (/^#yazi\//.test(location.hash) || son.startsWith("/#yazi/")) ziyaret(); });

  // Tıklamalar: bağlantılar, düğmeler, data-sayac="ad" verilen her şey
  const DISARIDA = "#adminBox, #editor, #istatistik";
  let kalan = 200; // bir sayfada en fazla
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest("a, button, [data-sayac], [data-slug]");
    if (!el || el.closest(DISARIDA) || kalan-- <= 0) return;
    let ad = el.dataset.sayac || (el.dataset.slug && !el.href ? "yazı kartı · " + el.dataset.slug : "")
      || el.getAttribute("aria-label") || el.innerText || el.textContent || el.title || "";
    ad = ad.replace(/\s+/g, " ").trim().replace(/^\d{1,2}(?=\D)/, "").trim().slice(0, 40); // menüdeki "05" numarası gitsin
    if (el.tagName === "A" && el.getAttribute("href")) {
      try {
        const u = new URL(el.href, location.href);
        const hedef = u.hostname === location.hostname ? (u.hash || u.pathname) : "↗ " + u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
        ad = (ad ? ad + " · " : "") + hedef.slice(0, 40);
      } catch {}
    }
    if (ad) gonder({ t: "t", h: ad });
  }, { capture: true, passive: true });
})();
