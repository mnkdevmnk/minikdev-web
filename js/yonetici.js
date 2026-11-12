/* YÖNETİCİ GİRİŞİ + İÇERİK DÜZENLEYİCİ
   Menünün altındaki formdan giriş yapılır, sonra "İÇERİĞİ DÜZENLE" ile js/content.js açılır.
   - Kendi bilgisayarında (tools/sunucu.py, localhost:8643): KAYDET dosyayı diske yazar,
     eski hâli .yedek/ klasörüne kopyalanır, sayfa kendiliğinden yenilenir.
   - Canlı sitede: sunucu yok, KAYDET çalışmaz. İNDİR ile content.js'i alıp repoya koyarsın.

   ŞİFREYİ DEĞİŞTİRMEK: Terminal'de
     printf 'kullanici:sifre' | shasum -a 256
   çıkan ilk uzun yazıyı aşağıdaki GIRIS_OZETI'ne yapıştır.

   CANLI SİTEDE giriş kutusu gizli; adresin sonuna ?yonetici eklenince görünür.

   NOT: Bu giriş gerçek bir güvenlik değil. Statik sitede kod herkese açık; sadece
   ziyaretçilerin yanlışlıkla düzenleyiciye girmesini engeller. Asıl koruma şu:
   diske yazma sadece senin bilgisayarındaki sunucuda var. */
(() => {
  // sha256("kullanici:sifre") — şifre burada yazmıyor, sadece özeti
  const GIRIS_OZETI = "5e67ebfbfee1f0539c2397f8f4a13d262acdbccc1325da8e86a82ca7a5fbace6";
  const DOSYA = "js/content.js";
  const KAYIT_UCU = "/__kaydet";
  const yerel = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port === "8643";

  const $ = (s) => document.querySelector(s);

  // Canlı sitede giriş kutusu ziyaretçiye hiç görünmez (orada kaydetme yok zaten).
  // Gerekirse adresin sonuna ?yonetici ekle: https://.../?yonetici
  if (!yerel && !new URLSearchParams(location.search).has("yonetici")) {
    $("#adminBox").hidden = true;
    return;
  }

  const ss = {
    al: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    koy: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} }
  };

  async function ozet(metin) {
    if (!crypto.subtle) return null; // http (güvensiz bağlam) — localhost ve https'te var
    const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
  }

  /* ---------- GİRİŞ ---------- */
  const form = $("#adminForm"), hata = $("#adminErr"), iceride = $("#adminIn");
  const girildi = () => ss.al("yonetici") === "1";
  function goster() {
    form.hidden = girildi();
    iceride.hidden = !girildi();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const k = form.kullanici.value.trim(), s = form.sifre.value;
    const o = await ozet(`${k}:${s}`);
    if (o === null) { hata.textContent = "Bu bağlantıda giriş yapılamıyor (https gerekli)."; return; }
    if (o !== GIRIS_OZETI) {
      hata.textContent = "Kullanıcı adı ya da şifre yanlış.";
      form.classList.remove("salla"); void form.offsetWidth; form.classList.add("salla");
      form.sifre.value = ""; form.sifre.focus();
      return;
    }
    hata.textContent = "";
    form.reset();
    ss.koy("yonetici", "1");
    // İstatistik paneli için sunucuya gösterilecek anahtar (api/sayac.js › ISTATISTIK_ANAHTARI)
    ss.koy("sayacAnahtar", await ozet(`sayac|${k}:${s}`));
    try { localStorage.setItem("sayacBeniSayma", "1"); } catch {} // yöneticinin tarayıcısı sayılmaz
    goster();
    $("#adminEdit").focus();
  });

  $("#adminOut").addEventListener("click", () => {
    ss.koy("yonetici", null); ss.koy("editorAcik", null); ss.koy("sayacAnahtar", null);
    editorKapa(true);
    goster();
    form.kullanici.focus();
  });
  $("#adminEdit").addEventListener("click", () => {
    if (document.documentElement.classList.contains("side-open")) $("#sideClose").click(); // önce menüyü kapat
    editorAc();
  });

  /* ---------- DÜZENLEYİCİ ---------- */
  const ed = document.createElement("div");
  ed.className = "editor";
  ed.id = "editor";
  ed.hidden = true;
  ed.setAttribute("role", "dialog");
  ed.setAttribute("aria-modal", "true");
  ed.setAttribute("aria-label", "İçerik düzenleyici");
  ed.innerHTML = `
    <div class="editor-bar">
      <p class="editor-title"><span>//</span> İÇERİK · ${DOSYA}</p>
      <span class="editor-durum" id="edDurum" aria-live="polite"></span>
      <button class="btn kaydet" type="button" data-ed="kaydet">KAYDET <small>⌘S</small></button>
      <button class="btn ghost" type="button" data-ed="indir">İNDİR</button>
      <button class="btn ghost" type="button" data-ed="kapat" aria-label="Düzenleyiciyi kapat">✕</button>
    </div>
    <div class="editor-alan">
      <pre class="editor-satir" id="edSatir" aria-hidden="true"></pre>
      <textarea id="edMetin" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="content.js içeriği"></textarea>
    </div>
    <p class="editor-not">${yerel
      ? "Kaydedince eski hâli <b>.yedek/</b> klasörüne kopyalanır, sayfa yenilenir. Tab = 2 boşluk."
      : "Canlı sitedesin: buradan kaydedilemez. İNDİR ile content.js'i al, repoda js/ klasörüne koy."}</p>`;
  document.body.append(ed);

  const metin = $("#edMetin"), satir = $("#edSatir"), durum = $("#edDurum");
  const kaydetBtn = ed.querySelector('[data-ed="kaydet"]');
  let orijinal = "", oncekiOdak = null;
  if (!yerel) kaydetBtn.disabled = true;

  const durumYaz = (t, tur = "") => { durum.textContent = t; durum.className = "editor-durum" + (tur ? " " + tur : ""); };
  const satirlar = () => {
    const n = metin.value.split("\n").length;
    if (satir.dataset.n !== String(n)) {
      satir.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
      satir.dataset.n = n;
    }
    satir.scrollTop = metin.scrollTop;
  };
  const degisti = () => metin.value !== orijinal;

  async function editorAc() {
    if (!girildi()) return;
    oncekiOdak = document.activeElement;
    ed.hidden = false;
    document.documentElement.classList.add("editor-acik");
    ss.koy("editorAcik", "1");
    durumYaz("yükleniyor…");
    try {
      const r = await fetch(DOSYA, { cache: "no-store" });
      if (!r.ok) throw new Error(r.status);
      orijinal = metin.value = await r.text();
      durumYaz(yerel ? "hazır" : "salt okunur kopya (canlı site)");
    } catch (err) {
      durumYaz("content.js okunamadı: " + err.message, "hata");
    }
    // Kaydedip yenilendiyse kaldığın yere dön
    const imlec = +ss.al("editorImlec") || 0, kay = +ss.al("editorKaydir") || 0;
    ss.koy("editorImlec", null); ss.koy("editorKaydir", null);
    metin.focus({ preventScroll: true });
    metin.setSelectionRange(imlec, imlec);
    metin.scrollTop = kay;
    satirlar();
  }

  function editorKapa(zorla = false) {
    if (ed.hidden) return;
    if (!zorla && degisti() && !confirm("Kaydedilmemiş değişiklikler var. Yine de kapatılsın mı?")) return;
    ed.hidden = true;
    document.documentElement.classList.remove("editor-acik");
    ss.koy("editorAcik", null);
    if (oncekiOdak && oncekiOdak.isConnected) oncekiOdak.focus({ preventScroll: true });
  }

  // Kaydetmeden önce dosya çalışıyor mu? (yazım hatası varsa site boş açılırdı)
  function dogrula(kaynak) {
    try {
      const w = {};
      new Function("window", kaynak)(w);
      if (!w.SITE || typeof w.SITE !== "object") return "window.SITE bulunamadı";
      return null;
    } catch (err) {
      return err.message;
    }
  }

  async function kaydet() {
    if (!yerel) return durumYaz("canlı sitede kaydedilemez, İNDİR'i kullan", "hata");
    const kaynak = metin.value;
    const sorun = dogrula(kaynak);
    if (sorun) return durumYaz("kaydedilmedi · hata: " + sorun, "hata");
    if (!degisti()) return durumYaz("değişiklik yok", "ok");
    kaydetBtn.disabled = true;
    durumYaz("kaydediliyor…");
    try {
      const r = await fetch(KAYIT_UCU, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dosya: DOSYA, icerik: kaynak })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.hata || "HTTP " + r.status);
      orijinal = kaynak;
      durumYaz("kaydedildi ✓ yedek: " + j.yedek + " · sayfa yenileniyor…", "ok");
      ss.koy("editorImlec", String(metin.selectionStart));
      ss.koy("editorKaydir", String(metin.scrollTop));
      // canli.js değişikliği görüp yenileyecek; olmazsa biz yenileyelim
      setTimeout(() => location.reload(), 2500);
    } catch (err) {
      durumYaz("kaydedilemedi: " + err.message + " (sunucuyu yeniden başlat: python3 tools/sunucu.py)", "hata");
    } finally {
      kaydetBtn.disabled = false;
    }
  }

  function indir() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([metin.value], { type: "text/javascript" }));
    a.download = "content.js";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  ed.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ed]");
    if (!b) return;
    ({ kaydet, indir, kapat: () => editorKapa() })[b.dataset.ed]();
  });
  metin.addEventListener("scroll", satirlar, { passive: true });
  metin.addEventListener("input", () => {
    satirlar();
    if (degisti()) durumYaz("kaydedilmemiş değişiklik var", "degisti");
    else durumYaz("hazır");
  });
  metin.addEventListener("keydown", (e) => {
    if (e.key === "Tab" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      document.execCommand("insertText", false, "  "); // geri al (⌘Z) bozulmasın
    }
  });
  // ⌘S / Ctrl+S kaydet, Esc kapat. Ajanların kısayollarına gitmesin.
  document.addEventListener("keydown", (e) => {
    if (ed.hidden) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") { e.preventDefault(); kaydet(); }
    else if (e.key === "Escape") editorKapa();
    e.stopPropagation();
  });
  addEventListener("beforeunload", (e) => {
    if (!ed.hidden && degisti()) { e.preventDefault(); e.returnValue = ""; }
  });

  goster();
  if (girildi() && ss.al("editorAcik") === "1") editorAc();
})();
