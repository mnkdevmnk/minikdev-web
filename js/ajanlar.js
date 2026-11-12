/* =====================================================================
   AJANLAR
   1) YAPIM: Sayfa taslak (gri, kesik çizgili) açılır. Ziyaretçi kaydırdıkça
      ekrandaki taslaklara ajanlar ekranın kenarından girer. Ekip lideri parçayı
      seçim kutusuyla seçer (köşe tutamaçları + "G × Y" ölçüsü), sonra ekip
      kurar. İşi biten ajan bir süre farenin etrafında dolaşır, iş çıkmazsa
      en yakın kenardan çıkıp gider. Testçiler butonlu parçaları kontrol eder.
      TUR açıksa sayfa, ajanların iş yüküne göre kendiliğinden kayar.
   2) PLANLAMA: Her şey kurulunca ajanların yarısı farenin etrafında sürü gibi
      döner (yarıçap nefes alır, dönüş yönü arada değişir, her ajanın kendi
      hızı/kıvrımı var), yarısı gruplaşıp toplantı yapar. Arada dolaşan bir
      ajan sürüdekine görev teslim eder ve yer değiştirirler.
      Toplantıların bir kısmı fikir ayrılığına, bir kısmı kavgaya döner;
      kavga kızışınca arbede çıkar, bir arabulucu koşup ayırır.
   İsimler, ekipler ve sözler: js/content.js → ajanlar
   Hangi parçayı hangi ekip kurar: aşağıdaki HEDEF listesi
   ===================================================================== */
(() => {
  const CFG = window.SITE && window.SITE.ajanlar;
  const root = document.documentElement;
  if (!CFG) { root.classList.remove("boot"); return; }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const sec = (dizi) => dizi[Math.floor(Math.random() * dizi.length)];
  const uzak = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const sinir = (v, a, b) => Math.max(a, Math.min(b, v));
  const yumusak = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const oku = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const yaz = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

  /* ---------- Hız (1× / 2× / 3×) ---------- */
  const HIZLAR = [1, 2, 3];
  let hizNo = Math.max(0, HIZLAR.indexOf(Number(oku("ajanHiz"))));
  let K = HIZLAR[hizNo];

  /* ---------- Hangi parça, hangi ekip ---------- */
  // [seçici, ekip, kayıtta görünen ad, daktiloyla mı yazılsın]
  const HEDEF = [
    [".nav", "muhendis", "menü"],
    ["#backdrop", "tasarimci", "arka plan yazısı"],
    ["#portrait", "tasarimci", "fotoğraf çerçevesi"],
    ["#hello", "yazar", "selamlama", true],
    ["#name", "yazar", "isim", true],
    ["#role", "yazar", "rol etiketi", true],
    ["#lead", "yazar", "tanıtım metni", true],
    [".hero .actions", "editor", "butonlar"],
    ["#stats", "muhendis", "sayaçlar"],
    ["#now li", "muhendis", "şu an kartı"],
    ["#stack", "editor", "teknoloji etiketleri"],
    [".sec-meta", "editor", "bölüm etiketi"],
    [".eyebrow", "yazar", "üst başlık"],
    [".sec-title", "yazar", "bölüm başlığı", true],
    [".sec-lead", "yazar", "açıklama"],
    [".about", "tasarimci", "hakkımda kartı"],
    [".featured", "tasarimci", "öne çıkan yazı"],
    [".gh-strip", "muhendis", "GitHub şeridi"],
    [".filters", "muhendis", "filtreler"],
    [".post", "yazar", "yazı kartı"],
    [".flagship", "tasarimci", "öne çıkan proje"],
    [".proj", "muhendis", "proje kartı"],
    [".pipe", "muhendis", "ajan hattı"],
    [".media", "tasarimci", "medya kartı"],
    [".contact-title", "yazar", "iletişim başlığı", true],
    [".contact-row", "muhendis", "e-posta satırı"],
    [".dm-row", "muhendis", "mesaj butonları"],
    [".foot", "tasarimci", "alt bilgi"]
  ];
  // Bu parçalar bitince bir testçi gelip kontrol eder
  const KONTROL = ".hero .actions, .filters, .contact-row, .dm-row, .nav";
  // Ekranda her zaman en az bu kadar ajan kalır (fazlası işi yoksa çıkıp gider)
  const MIN_AJAN = () => (innerWidth < 600 ? 3 : 4);
  // Telefon: dokunmatik ve dar ekran. Planlamada daha az ajan, MNK dev yazıdan uzak durur
  const telefon = () => innerWidth < 600 || matchMedia("(hover: none)").matches;
  const TELEFON_AJAN = 9;

  /* ---------- Katman: imleçler + çizgiler ---------- */
  const katman = document.createElement("div");
  katman.className = "ajan-katman";
  katman.setAttribute("aria-hidden", "true");
  const tuval = document.createElement("canvas");
  tuval.className = "ajan-tuval";
  katman.append(tuval);
  const ctx = tuval.getContext("2d");
  document.body.append(katman);

  function tuvalBoyut() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    tuval.width = innerWidth * dpr;
    tuval.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  tuvalBoyut();
  addEventListener("resize", tuvalBoyut);

  const EK = CFG.ekipler;
  const OK = '<svg class="ajan-ok" viewBox="0 0 16 16" width="16" height="16"><path d="M1 1l13 5-6 2-2 6z" fill="currentColor" stroke="#050505" stroke-width="1"/></svg>';
  // Arbedede imleç çöp adama dönüşür (kollar/bacaklar CSS ile sallanır)
  const COP = '<svg class="ajan-cop" viewBox="0 0 26 36" width="26" height="36"><g fill="none" stroke-linecap="round" stroke-linejoin="round">'
    + '<g stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="6" r="4.3"/><path d="M11 10.5v11.5"/>'
    + '<path class="cop-kol-on" d="M11 13.5l7 2.5 6-1.5"/><path class="cop-kol-arka" d="M11 13.5l-5 4-1.5 4.5"/>'
    + '<path class="cop-bacak-on" d="M11 22l5 6 .5 6"/><path class="cop-bacak-arka" d="M11 22l-4.5 6-3 5"/></g></g></svg>';
  const ARTI = '<svg class="ajan-arti" viewBox="0 0 17 17" width="17" height="17"><path d="M8.5 1v15M1 8.5h15" stroke="#050505" stroke-width="3.2"/><path d="M8.5 1v15M1 8.5h15" stroke="currentColor" stroke-width="1.4"/></svg>';
  const ajanlar = CFG.liste.map((t, i) => {
    const el = document.createElement("div");
    el.className = "ajan yok";
    // ekip tek ("yazar") ya da birden çok (["muhendis", "yazar"]) olabilir; ilki ana ekip
    const ekipler = (Array.isArray(t.ekip) ? t.ekip : [t.ekip]).filter((e) => EK[e]);
    if (!ekipler.length) ekipler.push(Object.keys(EK)[0]);
    const ekip = ekipler[0];
    const no = (t.ad.match(/\d+$/) || [""])[0];
    el.style.setProperty("--c", EK[ekip].renk);
    if (ekipler.length > 1) el.classList.add("cok-ekip");
    el.innerHTML = `${OK}${ARTI}${COP}<span class="ajan-ad"></span><span class="balon"></span>`;
    katman.append(el);
    const hizli = Math.random() < 0.25;   // her ajanın kendi karakteri: kimi çevik, kimi ağır
    const a = {
      // ad: uzun isim (konuşurken / iş yaparken), kisa: imleç yanındaki küçük etiket.
      // content.js'te kisa yazılmazsa ekip kısaltması + numara (TS1) ya da adın ilk 2 harfi.
      i, ad: t.ad, kisa: t.kisa || (no && EK[ekip].kisa ? EK[ekip].kisa + no : t.ad.slice(0, 2).toLocaleUpperCase("tr")), ekip,
      renk: EK[ekip].renk, ekipler, anaEkip: ekip,
      el, adEl: el.querySelector(".ajan-ad"), balonEl: el.querySelector(".balon"),
      x: -40, y: innerHeight / 2, vx: 0, vy: 0, hx: 0, hy: 0, hiz: 600,
      durum: "yok", gorev: null, kontrol: false, lider: false, fx: .5, fy: .5, salla: 0, bitis: 0,
      acik: null, balonBitis: 0, yeniHedef: 0, toplanti: null, ofs: 0, bosSure: 0,
      suru: false, elle: false,
      // sürü karakteri
      cevik: hizli ? rnd(600, 900) : rnd(180, 450),
      kuvvet: hizli ? rnd(2100, 3600) : rnd(420, 1100),
      donus: hizli ? rnd(2.2, 3.4) : rnd(0.8, 1.8),
      kivrim: rnd(-1, 1),
      yorunge: rnd(-28, 28)
    };
    adGoster(a, false);
    return a;
  });
  const N = ajanlar.length;

  function adGoster(a, acik) {
    if (a.acik === acik) return;
    a.acik = acik;
    a.adEl.textContent = acik ? a.ad : a.kisa;
    a.el.classList.toggle("acik", acik);
  }
  function konus(a, metin, ms = 1600) {
    a.balonEl.textContent = metin;
    a.el.classList.add("konusuyor");
    a.balonBitis = performance.now() + ms;
    adGoster(a, true);
  }
  // Çok ekipli ajan göreve göre ekip (ve renk) değiştirir
  function ekipDegis(a, e, soyle = true) {
    if (!e || a.ekip === e || !a.ekipler.includes(e)) return;
    a.ekip = e;
    a.renk = EK[e].renk;
    a.el.style.setProperty("--c", a.renk);
    a.el.classList.remove("renk-dondu"); void a.el.offsetWidth; a.el.classList.add("renk-dondu");
    if (soyle && !a.balonBitis) konus(a, sec(SOZ("ekipDegis", ["{ekip} modundayım"])).replace(/\{ekip\}/g, EK[e].ad), 1500);
  }
  function durumYap(a, d) {
    a.durum = d;
    a.el.classList.toggle("yok", d === "yok");
    a.el.classList.toggle("cikiyor", d === "cikiyor");
  }

  /* ---------- Ses: her biten parça bir nota (pentatonik, cam piyano gibi) ---------- */
  const ses = { ctx: null, acik: oku("ajanSes") === "1", son: 0 };
  const PENTA = [0, 2, 4, 7, 9];
  function sesHazirla() {
    try {
      if (!ses.ctx) ses.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ses.ctx.state === "suspended") ses.ctx.resume();
    } catch { ses.ctx = null; }
  }
  function nota(yukseklik = Math.random()) {
    if (!ses.acik || !ses.ctx) return;
    const simdi = performance.now();
    if (simdi - ses.son < 75) return;
    ses.son = simdi;
    try {
      const c = ses.ctx, t = c.currentTime;
      const m = 64 + PENTA[(Math.random() * 5) | 0] + 12 * Math.floor(sinir(yukseklik, 0, .99) * 2);
      const f = 440 * Math.pow(2, (m - 69) / 12);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      g.connect(c.destination);
      for (const [kat, ses2] of [[1, 1], [2, 0.25]]) {
        const o = c.createOscillator();
        const og = c.createGain();
        o.type = "sine";
        o.frequency.value = f * kat;
        og.gain.value = ses2;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + 1.15);
      }
    } catch {}
  }

  /* ---------- Panel ---------- */
  const SES_IKON = (acik) => `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z" fill="currentColor"/>${acik ? '<path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.6a6 6 0 0 1 0 8.8"/>' : '<path d="M11 6l3.5 4M14.5 6L11 10"/>'}</svg>`;
  const hud = document.createElement("div");
  hud.className = "ajan-hud";
  hud.innerHTML = `
    <ol class="ajan-kayit"></ol>
    <div class="ajan-hud-bar">
      <span class="hud-sayi"><b data-k="ajan">0</b> ajan</span>
      <span class="hud-ayrac"></span>
      <span class="hud-sayi hud-parca"><b data-k="biten">0</b><span class="hud-sol">/ <span data-k="toplam">0</span> parça</span></span>
      <span class="hud-ayrac hud-parca"></span>
      <span class="hud-durum"></span>
      <span class="hud-cubuk"><i></i></span>
      <button type="button" data-act="tur" title="Ajanlar kurarken sayfayı kendiliğinden kaydır (T)">Tur</button>
      <button type="button" data-act="hiz" title="Yapım hızı">1×</button>
      <button type="button" data-act="atla" title="Hepsini bitir (Esc)">Atla</button>
      <button type="button" data-act="ses" class="hud-ikon" title="Ses (M)"></button>
      <button type="button" data-act="gizle" class="hud-ikon" title="Ajanları gizle">✕</button>
      <button type="button" data-act="kur" data-ajan-kur title="Siteyi ajanlarla baştan kur">↻ Ajanlarla kur</button>
      <button type="button" data-act="goster">Ajanları göster</button>
    </div>`;
  document.body.append(hud);
  const kayitListe = hud.querySelector(".ajan-kayit");
  const $k = (k) => hud.querySelector(`[data-k="${k}"]`);
  const hudAjan = $k("ajan"), hudBiten = $k("biten"), hudToplam = $k("toplam");
  const hudDurum = hud.querySelector(".hud-durum");
  const hudCubuk = hud.querySelector(".hud-cubuk i");
  const btnTur = hud.querySelector('[data-act="tur"]');
  const btnHiz = hud.querySelector('[data-act="hiz"]');
  const btnSes = hud.querySelector('[data-act="ses"]');

  function kayit(a, mesaj) {
    const li = document.createElement("li");
    li.innerHTML = a
      ? `<b style="color:${a.renk}">${a.ad.toLocaleLowerCase("tr")}</b> ${mesaj}`
      : `<b>sistem</b> ${mesaj}`;
    kayitListe.append(li);
    while (kayitListe.children.length > 3) kayitListe.firstElementChild.remove();
  }
  function hudMod(mod) {
    hud.dataset.mod = mod;   // yapim | planlama | gizli
    if (mod === "planlama") { hudDurum.textContent = "planlama · fareyi gezdir"; hudDurum.className = "hud-durum"; }
  }
  function durumYazi(metin, cls = "") {
    if (hudDurum.textContent !== metin) hudDurum.textContent = metin;
    hudDurum.className = "hud-durum" + (cls ? " " + cls : "");
  }
  function sesButon() {
    btnSes.innerHTML = SES_IKON(ses.acik);
    btnSes.classList.toggle("on", ses.acik);
  }
  sesButon();
  btnHiz.textContent = K + "×";

  /* ---------- Yazı efektleri ----------
     Tek satırlık yazı: rastgele harflerle taranır, soldan sağa doğru harf bulunur.
     Paragraf (birden çok satır): daktilo gibi harf harf yazılır.
     Metin düğümleri yerinde değişir, içerideki HTML (kalın, link) bozulmaz.
     Daktiloda yazılmamış kısım şeffaf durur, sayfa zıplamaz. */
  const HARF = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ0123456789#%&*+<>/";
  const YAZI_DISI = "#termBody, svg, script, style";
  let yazilar = [];

  const karistir = (s) => s.replace(/\S/g, (c) => {
    const r = HARF[(Math.random() * HARF.length) | 0];
    return c !== c.toLocaleUpperCase("tr") ? r.toLocaleLowerCase("tr") : r;
  });
  function blokBul(n, kok) {
    for (let el = n.parentElement; el && el !== kok; el = el.parentElement)
      if (getComputedStyle(el).display !== "inline") return el;
    return kok;
  }
  function satirSay(dugumler) {
    const ys = [];
    for (const n of dugumler) {
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const k of r.getClientRects()) if (k.height) ys.push(k.top + k.height / 2);
    }
    ys.sort((a, b) => a - b);
    let satir = ys.length ? 1 : 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > 6) satir++;
    return satir;
  }
  // Efekti başlatır, toplam süreyi (ms) döndürür
  function yaziBaslat(kok, now) {
    yaziBitir(kok);
    const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT);
    const gruplar = new Map();
    for (let n; (n = w.nextNode());) {
      if (!n.nodeValue.trim() || n.parentElement.closest(YAZI_DISI)) continue;
      const b = blokBul(n, kok);
      if (!gruplar.has(b)) gruplar.set(b, []);
      gruplar.get(b).push(n);
    }
    // Önce hepsini ölç, sonra dokun (ölçerken düzen bozulmasın)
    const olcum = [...gruplar.values()].map((d) => [d, satirSay(d)]);
    let son = 0, sira = 0;
    for (const [dugumler, satir] of olcum) {
      const mod = satir > 1 ? "daktilo" : "tarama";
      const imlec = document.createElement("span");
      imlec.className = "yz-imlec";
      let len = 0;
      const parca = dugumler.map((n) => {
        const tam = n.nodeValue;
        len += tam.length;
        const sar = document.createElement("span");
        sar.className = "yz";
        const gor = document.createTextNode(mod === "tarama" ? karistir(tam) : "");
        const gizli = document.createElement("span");
        gizli.className = "yz-gizli";
        if (mod === "daktilo") gizli.textContent = tam;
        sar.append(gor, gizli);
        n.replaceWith(sar);
        return { n, tam, sar, gor, gizli };
      });
      const sure = (mod === "tarama"
        ? Math.min(750, Math.max(260, len * 22))
        : Math.min(1500, Math.max(380, len * 8))) / K;
      const bas = now + (Math.min(sira++, 8) * 120) / K;
      son = Math.max(son, bas - now + sure);
      yazilar.push({ kok, mod, parca, imlec, len, bas, sure, n: -1, sonKar: 0, aktif: null });
    }
    return son;
  }
  function yaziKapat(y) {
    for (const p of y.parca) { p.n.nodeValue = p.tam; if (p.sar.isConnected) p.sar.replaceWith(p.n); }
  }
  function yaziBitir(kok) {
    yazilar = yazilar.filter((y) => {
      if (kok && y.kok !== kok) return true;
      yaziKapat(y);
      return false;
    });
  }
  function yaziAdim(now) {
    if (!yazilar.length) return;
    yazilar = yazilar.filter((y) => {
      const t = (now - y.bas) / y.sure;
      if (t >= 1 || !y.kok.isConnected) { yaziKapat(y); return false; }
      const n = Math.max(0, Math.floor(t * y.len));
      if (y.mod === "daktilo") {
        if (n === y.n) return true;
        y.n = n;
        let kalan = n, aktif = null;
        for (const p of y.parca) {
          const k = Math.max(0, Math.min(p.tam.length, kalan));
          p.gor.nodeValue = p.tam.slice(0, k);
          p.gizli.textContent = p.tam.slice(k);
          if (!aktif && k < p.tam.length) aktif = p;
          kalan -= p.tam.length;
        }
        if (aktif && y.aktif !== aktif) { aktif.sar.insertBefore(y.imlec, aktif.gizli); y.aktif = aktif; }
      } else {
        if (now - y.sonKar < 45 && n === y.n) return true;
        y.sonKar = now; y.n = n;
        let kalan = n;
        for (const p of y.parca) {
          const k = Math.max(0, Math.min(p.tam.length, kalan));
          p.gor.nodeValue = p.tam.slice(0, k) + karistir(p.tam.slice(k));
          kalan -= p.tam.length;
        }
      }
      return true;
    });
  }

  /* ---------- Parçalar ---------- */
  let parcalar = [];
  let kontrolKuyrugu = [];
  let secimler = [];      // seçim kutusu çizilen parçalar

  function topla() {
    const set = new Set(), liste = [];
    for (const [s, ekip, label, daktilo] of HEDEF) {
      for (const el of document.querySelectorAll(s)) {
        if (set.has(el) || el.closest(".reader")) continue;
        set.add(el);
        liste.push({ el, ekip, label, daktilo: !!daktilo });
      }
    }
    // İç içe olanlardan sadece dıştakini al
    return liste
      .filter((p) => { for (let x = p.el.parentElement; x; x = x.parentElement) if (set.has(x)) return false; return true; })
      .sort((a, b) => (a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .map((p) => Object.assign(p, { durum: "bitti", ekipteki: [], gerek: 1, sec: null }));
  }

  function taslakYap(p) {
    p.durum = "taslak";
    p.ekipteki = [];
    p.sec = null;
    yaziBitir(p.el);
    p.el.classList.remove("insa", "yapildi", "checked");
    p.el.classList.add("taslak");
  }
  // Yapım sırasında aynı parçadaki iki ajan arada kısa bir ağız dalaşı yapar
  let sonraSoz = [];
  function agizDalasi(p, now) {
    const ekip = p.ekipteki.filter((a) => a.durum !== "yok" && a.durum !== "cikiyor");
    if (ekip.length < 2 || Math.random() > 0.15) return;
    const x = ekip[0], y = ekip.find((a) => a.ekip !== x.ekip) || ekip[1];
    const soz = sec(SOZ("tartisma", [["bence böyle", "bence değil"]]));
    sonraSoz.push({ t: now + 250, a: y, m: soz[0] }, { t: now + 1150 / K, a: x, m: soz[1] });
    kayit(y, `↔ ${x.ad.toLocaleLowerCase("tr")} · fikir ayrılığı`);
  }
  function insaBasla(p, now) {
    agizDalasi(p, now);
    p.durum = "insa";
    p.bas = now;
    const r = p.el.getBoundingClientRect();
    if (p.daktilo) {
      // Yazı parçaları: ajan başındayken yazı taranır / yazılır
      p.el.classList.remove("taslak");
      p.sure = Math.max(450 / K, yaziBaslat(p.el, now));
    } else {
      p.sure = (380 + Math.min(620, (r.width * r.height) / 550)) / K;
    }
    p.el.classList.add("insa");
  }
  function bitir(p, efekt = true) {
    const ilk = p.durum !== "insa" || !p.daktilo;
    p.durum = "bitti";
    p.el.classList.remove("taslak", "insa");
    if (p.sec && !p.sec.bitti) p.sec.bitti = performance.now();
    // Kart vb. kurulunca içindeki yazılar da kendiliğinden taranır / yazılır (ekrandaysa)
    const r = p.el.getBoundingClientRect();
    if (efekt && ilk && r.bottom > 0 && r.top < innerHeight) yaziBaslat(p.el, performance.now());
    if (efekt) nota(1 - (r.top + r.height / 2) / innerHeight);
    p.el.classList.add("yapildi");
    setTimeout(() => p.el.classList.remove("yapildi"), 700);
  }
  function hepsiniBitir() {
    for (const p of parcalar) if (p.durum !== "bitti") bitir(p, false);
    yaziBitir();
    kontrolKuyrugu = [];
  }
  function serbest(a) {
    if (a.durum !== "yok" && a.durum !== "cikiyor") durumYap(a, "bos");
    a.gorev = null;
    a.kontrol = false;
    a.lider = false;
    a.elle = false;
    a.bosSure = 0;
    a.el.classList.remove("sec");
    if (!a.balonBitis) adGoster(a, false);
  }

  /* ---------- Fare ---------- */
  let fx = innerWidth * 0.5, fy = innerHeight * 0.5, fareVar = false;
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { fx = e.clientX; fy = e.clientY; fareVar = true; } }, { passive: true });
  addEventListener("pointerdown", (e) => { fx = e.clientX; fy = e.clientY; fareVar = true; }, { passive: true });
  document.addEventListener("mouseleave", () => { fareVar = false; });
  let sonHareket = 0;
  addEventListener("pointermove", () => { sonHareket = performance.now(); }, { passive: true });
  addEventListener("scroll", () => { sonHareket = Math.min(sonHareket, performance.now() - 1300); }, { passive: true });

  /* ---------- Okuma: ajanlar yazıların üstünden kaçınır ----------
     Ekrandaki yazı bloklarının kutuları toplanır. Fare ~1 sn durunca (ya da fare
     hiç yoksa, telefonda) ziyaretçi okuyor sayılır: sürü en yakın yazısız boşluğa
     çekilir, dolaşan/toplantı yapan ajanlar yazıların üstünde durmaz, itilir.
     Kuran ajanlar (işi olanlar) bundan muaf, onlar zaten parçanın üstünde çalışır. */
  const METIN = "p, h1, h2, h3, h4, li, blockquote, pre, figcaption, td, .lead, .sec-lead, .sec-title, .contact-title, .hero-name, #name, #hello, #role";
  let metinler = [], metinZamani = -1e9, okumaNoktasi = null, okumaZamani = 0;
  function metinKutulari() {
    const now = performance.now();
    if (now - metinZamani < 400) return metinler;
    metinZamani = now;
    const W = innerWidth, H = innerHeight, liste = [];
    for (const el of document.querySelectorAll(METIN)) {
      if (el.closest(".ajan-katman, .ajan-hud, .side, .reader, .editor")) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H || r.width < 4 || r.height < 4) continue;
      if (r.width * r.height > W * H * 0.55) continue;   // sayfayı kaplayan sarmalayıcıyı sayma
      liste.push({ l: r.left - 10, t: r.top - 10, r: r.right + 10, b: r.bottom + 10 });
    }
    return (metinler = liste);
  }
  const metinde = (x, y) => metinler.some((k) => x > k.l && x < k.r && y > k.t && y < k.b);
  const okuyor = () => !fareVar || performance.now() - sonHareket > 1100;
  // Bir çemberin kaç yazı kutusuna değdiği
  function cakisma(x, y, r) {
    let n = 0;
    for (const k of metinler) {
      const cx = sinir(x, k.l, k.r), cy = sinir(y, k.t, k.b);
      if (Math.hypot(x - cx, y - cy) < r) n++;
    }
    return n;
  }
  // p'ye en yakın, yazıya en az değen nokta
  function enYakinBos(p, r) {
    metinKutulari();
    const W = innerWidth, H = innerHeight;
    let iyi = { x: sinir(p.x, 40, W - 40), y: sinir(p.y, 80, H - 90) }, iyiPuan = Infinity;
    for (let d = 0; d <= Math.max(W, H); d += 55) {
      const adim = d ? 14 : 1;
      for (let k = 0; k < adim; k++) {
        const aci = (k / adim) * Math.PI * 2;
        const x = p.x + Math.cos(aci) * d, y = p.y + Math.sin(aci) * d;
        if (x < 40 || x > W - 40 || y < 80 || y > H - 90) continue;
        const puan = cakisma(x, y, r) * 1000 + d;
        if (puan < iyiPuan) { iyiPuan = puan; iyi = { x, y }; }
      }
      if (iyiPuan < 1000) break;   // yazıya hiç değmeyen en yakın halkayı bulduk
    }
    return iyi;
  }
  // Yazının üstündeki ajanı en yakın kenara doğru iten kuvvet
  function metinItme(a) {
    for (const k of metinler) {
      if (a.x <= k.l || a.x >= k.r || a.y <= k.t || a.y >= k.b) continue;
      const sol = a.x - k.l, sag = k.r - a.x, ust = a.y - k.t, alt = k.b - a.y;
      const m = Math.min(sol, sag, ust, alt);
      if (m === sol) return [-260, 0];
      if (m === sag) return [260, 0];
      if (m === ust) return [0, -260];
      return [0, 260];
    }
    return null;
  }

  /* ---------- Sürü: farenin etrafında canlı yörünge ----------
     Sabit bir çember değil: her ajan merkezden kendi yarıçapını ister
     (yarıçap zamanla nefes alır, açıya göre dalgalanır), teğet yönde döner
     (dönüş yönü ara sıra tersine çevrilir), uzaktayken kıvrılarak yaklaşır
     ve yakınındaki ajanların hızına kısmen uyar. */
  let zaman = 0;
  function suruMerkezi() {
    const ham = fareVar ? { x: fx, y: fy }
      : { x: innerWidth * (0.5 + 0.28 * Math.sin(zaman * 0.37)), y: innerHeight * (0.5 + 0.22 * Math.sin(zaman * 0.53 + 1)) };
    if (!okuyor()) { okumaNoktasi = null; return ham; }
    // Okurken sürü yazının üstünde dönmesin: en yakın boşluğa çekilsin
    const now = performance.now();
    if (!okumaNoktasi || now - okumaZamani > 1600) {
      okumaNoktasi = enYakinBos(ham, (innerWidth < 600 ? 62 : 92) * 1.15);
      okumaZamani = now;
    }
    return okumaNoktasi;
  }
  function suruAdim(dt, liste, o, olcek = 1) {
    if (!liste.length) return;
    const itmeAcik = okuyor();
    if (itmeAcik) metinKutulari();
    const R = (innerWidth < 600 ? 62 : 92) * olcek * (1 + 0.18 * Math.sin(zaman * 0.55));
    const yon = Math.tanh(Math.cos(zaman * 0.11) * 3);
    const ist = liste.map((a) => {
      const vx = a.x - o.x, vy = a.y - o.y;
      const d = Math.hypot(vx, vy) || 0.01;
      const nx = vx / d, ny = vy / d;
      const aci = Math.atan2(vy, vx);
      const rr = R * (1 + 0.3 * Math.sin(3 * aci + zaman * 0.7)) + a.yorunge * olcek;
      const teget = 170 * (0.7 + a.donus * 0.2) * yon;
      const radyal = sinir((rr - d) * 4, -2600, 1400);
      const uzakta = sinir((d - rr) / 600, 0, 1);
      return [-ny * teget + nx * radyal - ny * a.kivrim * 400 * uzakta,
               nx * teget + ny * radyal + nx * a.kivrim * 400 * uzakta, d];
    });
    liste.forEach((a, i) => {
      let ax = 0, ay = 0, ws = 0, sx = 0, sy = 0;
      for (const b of liste) {
        if (b === a) continue;
        const ex = a.x - b.x, ey = a.y - b.y, e = Math.hypot(ex, ey);
        if (e > 90) continue;
        const w = 1 - e / 90;
        ax += b.vx * w; ay += b.vy * w; ws += w;
        if (e > 0 && e < 20) { sx += (ex / e) * (20 - e) * 14; sy += (ey / e) * (20 - e) * 14; }
      }
      let [hx, hy, d] = ist[i];
      if (ws > 0) { hx = hx * 0.7 + (ax / ws) * 0.3; hy = hy * 0.7 + (ay / ws) * 0.3; }
      hx += sx; hy += sy;
      if (itmeAcik) { const it = metinItme(a); if (it) { hx += it[0]; hy += it[1]; } }
      const fark = Math.max(0, d - 180 * olcek);
      const maxV = a.cevik * (1.3 + Math.min(3.2, fark / 90));
      const L = Math.hypot(hx, hy);
      if (L > maxV) { hx *= maxV / L; hy *= maxV / L; }
      let gx = (hx - a.vx) * 6, gy = (hy - a.vy) * 6;
      const maxF = a.kuvvet * (1.4 + Math.min(5, fark / 50));
      const G = Math.hypot(gx, gy);
      if (G > maxF) { gx *= maxF / G; gy *= maxF / G; }
      a.vx += gx * dt; a.vy += gy * dt;
      a.x += a.vx * dt; a.y += a.vy * dt;
      a.suru = true;
    });
  }

  /* =====================================================================
     FAZ 1: YAPIM
     ===================================================================== */
  let faz = 0;           // 0 kapalı · 1 yapım · 2 planlama
  let sonAtama = 0, sonSayac = 0;
  let tur = false, turV = 0, turBirikim = 0, birikim = 0, geride = 0, aktifSayi = 0, cepheDoc = Infinity;
  /* Ekran üç bölge: üst %35 bitmiş · orta %55 ajanlar kuruyor · alt %10 henüz başlanmamış.
     Ajanlar sadece ALT_SINIR'ın üstündeki parçaları alır; tur da "cephe"yi (en üstteki
     bitmemiş parça) ekranın %35'inde tutacak hızda kayar. */
  const UST_BITMIS = 0.35, ALT_SINIR = 0.90;
  // Ziyaretçi turu durdurup ajanları bekletince: "hadi hadi" teşviki
  let bekliyor = false, beklemeBas = 0, sonrakiTesvik = 0;

  const aktif = (a) => a.durum !== "yok" && a.durum !== "cikiyor";

  // Görevi verir; ekranda değilse en yakın kenardan içeri sokar
  function gorevVer(a, p, kontrol, hx, hy) {
    if (a.durum === "yok" || a.durum === "cikiyor") {
      if (a.durum === "yok") {
        const sol = hx < innerWidth / 2;
        a.x = sol ? -30 : innerWidth + 30;
        a.y = sinir(hy + rnd(-140, 140), 30, innerHeight - 40);
        a.vx = sol ? 300 : -300; a.vy = 0;
      }
      a.el.classList.remove("yok", "cikiyor");
    }
    a.durum = "gidiyor";
    a.gorev = p;
    a.kontrol = kontrol;
    ekipDegis(a, kontrol ? "testci" : p.ekip);
    a.bosSure = 0;
    a.lider = !kontrol && p.ekipteki.length === 0;
    a.fx = rnd(.15, .85); a.fy = rnd(.2, .8);
    if (!kontrol) p.ekipteki.push(a);
    if (a.lider) a.el.classList.add("sec");
    adGoster(a, true);
  }

  function gorevAta() {
    const bos = ajanlar.filter((a) => a.durum === "bos" || a.durum === "cikiyor" || a.durum === "yok");
    if (!bos.length) return;
    const W = innerWidth, H = innerHeight;
    let girisHakki = 4;   // her turda en fazla 4 ajan kenardan girer (akış hissi)
    const en = (x, y, ekip) => {
      let iyi = null, d = Infinity;
      for (const a of bos) {
        if (a.durum === "yok" && girisHakki <= 0) continue;
        const k = (a.durum === "yok" ? Math.min(x, W - x) + 260 : Math.hypot(a.x - x, a.y - y))
          - (ekip && a.ekipler.includes(ekip) ? 400 : 0);
        if (k < d) { d = k; iyi = a; }
      }
      if (iyi) { bos.splice(bos.indexOf(iyi), 1); if (iyi.durum === "yok") girisHakki--; }
      return iyi;
    };

    // Önce kontrol işleri (testçiler tercih edilir)
    while (kontrolKuyrugu.length && bos.length) {
      const p = kontrolKuyrugu[0];
      if (!p.el.isConnected) { kontrolKuyrugu.shift(); continue; }
      const r = p.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > H) { kontrolKuyrugu.shift(); continue; }   // ekrandan çıktıysa kontrolü atla
      const a = en(r.left + r.width / 2, r.top + r.height / 2, "testci");
      if (!a) break;
      kontrolKuyrugu.shift();
      gorevVer(a, p, true, r.left + r.width / 2, r.top + r.height / 2);
    }

    // Sonra kurulacak parçalar: önce ekranda görünenler, sonra yukarıda kalıp atlananlar
    const adaylar = [];
    for (const p of parcalar) {
      if (p.durum === "bitti") continue;
      if (!p.el.isConnected) { p.durum = "bitti"; continue; }
      const r = p.el.getBoundingClientRect();
      // Kaydırmalı alanda (karusel) yandaki, görünmeyen slaytlara ajan gitmez: hemen kurulu sayılır
      if (p.durum === "taslak" && (r.right <= 0 || r.left >= innerWidth)) { bitir(p, false); continue; }
      const ekranda = r.bottom > 0 && r.top < H * ALT_SINIR;
      const yukarida = r.bottom <= 0;
      if (!ekranda && !yukarida) continue;
      p.gerek = r.width * r.height > 220000 ? 3 : r.width * r.height > 70000 ? 2 : 1;
      if (p.ekipteki.length >= p.gerek) continue;
      adaylar.push({ p, r, sira: ekranda ? r.top : 1e6 - r.top });
    }
    adaylar.sort((a, b) => a.sira - b.sira);
    for (const { p, r } of adaylar) {
      while (p.ekipteki.length < p.gerek && bos.length) {
        const a = en(r.left + r.width / 2, r.top + r.height / 2, p.ekip);
        if (!a) break;
        gorevVer(a, p, false, r.left + r.width / 2, r.top + r.height / 2);
      }
      if (!bos.length) break;
    }
  }

  function yapimAdim(now, dt) {
    if (!hizliMod && now - sonAtama > 120 / K) { sonAtama = now; gorevAta(); }
    const W = innerWidth, H = innerHeight;
    const hizCarpan = 1 + (K - 1) * 0.5;

    // Boştakiler: azınlık farenin etrafında dolaşır, fazlası en yakın kenardan çıkıp gider
    aktifSayi = ajanlar.filter(aktif).length;
    const dolasan = [];
    for (const a of ajanlar) {
      if (a.durum === "bos") {
        a.bosSure += dt * K;
        if (aktifSayi > MIN_AJAN() && a.bosSure > 2.2) {
          durumYap(a, "cikiyor");
          aktifSayi--;
          if (!a.balonBitis) adGoster(a, false);
        } else dolasan.push(a);
      }
      if (a.durum === "cikiyor") {
        const sag = a.x > W / 2;
        a.hx = sag ? W + 70 : -70;
        a.hy = a.y + a.vy * 0.05;
        a.hiz = 600 * hizCarpan;
        if (a.x < -36 || a.x > W + 36) { durumYap(a, "yok"); a.vx = a.vy = 0; }
      }
    }
    // Ziyaretçi bekletiyorsa boştakiler ekranın altına toplanıp "hadi hadi" der
    const sabirsiz = bekliyor && now - beklemeBas > 2500;
    const merkez = sabirsiz
      ? { x: W * (0.5 + 0.18 * Math.sin(zaman * 0.9)), y: H - (W < 760 ? 170 : 150) + Math.abs(Math.sin(zaman * 4)) * -14 }
      : suruMerkezi();
    suruAdim(dt, dolasan, merkez, sabirsiz ? 0.6 : 0.8);
    if (bekliyor && now - beklemeBas > 1200 && now > sonrakiTesvik && dolasan.length) {
      const sessiz = dolasan.filter((a) => !a.balonBitis);
      const a = sessiz.length ? sec(sessiz) : null;
      if (a) {
        const uzun = now - beklemeBas > 7000 && Math.random() < 0.35;
        konus(a, sec(SOZ(uzun ? "tesvikTur" : "tesvik", ["hadi hadi!"])), 1500);
      }
      sonrakiTesvik = now + rnd(1300, 2300);
    }

    for (const a of ajanlar) {
      if (a.durum === "bos" || a.durum === "cikiyor" || a.durum === "yok") continue;
      const p = a.gorev;
      if (!p || !p.el.isConnected) { serbest(a); continue; }
      const r = p.el.getBoundingClientRect();
      a.hiz = 950 * hizCarpan;

      // Lider: önce sol üst köşeye gider, sonra seçim kutusunu sağ alta sürükler
      if (a.lider && a.durum === "gidiyor") {
        a.hx = sinir(r.left, 6, W - 14);
        a.hy = sinir(r.top, 6, H - 30);
        if (Math.hypot(a.hx - a.x, a.hy - a.y) < 18) {
          a.durum = "seciyor";
          p.sec = { a, bas: now, sure: (260 + Math.min(340, Math.sqrt(r.width * r.height) / 3)) / K, bitti: 0 };
          secimler.push(p);
        }
        continue;
      }
      if (a.durum === "seciyor") {
        const k = yumusak(Math.min(1, (now - p.sec.bas) / p.sec.sure));
        a.x = sinir(r.left + r.width * k, 6, W - 14);
        a.y = sinir(r.top + r.height * k, 6, H - 30);
        a.vx = a.vy = 0;
        a.elle = true;
        if (now - p.sec.bas >= p.sec.sure) {
          a.elle = false;
          a.durum = "calisiyor";
          a.el.classList.remove("sec");
          if (p.durum === "taslak") insaBasla(p, now);
        }
        continue;
      }

      a.hx = r.left + r.width * a.fx;
      a.hy = r.top + Math.min(r.height * a.fy, r.height - 6);

      if (a.durum === "gidiyor" && Math.hypot(a.hx - a.x, a.hy - a.y) < 22) {
        a.durum = "calisiyor";
        if (a.kontrol) {
          a.bitis = now + 450 / K;
          p.el.classList.add("checked");
        }
      }
      if (a.durum === "calisiyor") {
        if (now > a.salla) { a.fx = rnd(.08, .92); a.fy = rnd(.15, .85); a.salla = now + rnd(160, 360) / K; }
        if (a.kontrol && now > a.bitis) {
          p.el.classList.remove("checked");
          kayit(a, `✓ ${p.label} kontrol edildi`);
          nota(0.9);
          serbest(a);
        }
      }
    }

    // İnşaatı süren parçalar
    for (const p of parcalar) {
      if (p.durum !== "insa") continue;
      if ((now - p.bas) / p.sure >= 1) {
        const ekip = p.ekipteki;
        bitir(p);
        if (ekip[0]) kayit(ekip[0], `→ ${p.label}${ekip.length > 1 ? ` (+${ekip.length - 1})` : ""}`);
        for (const a of ekip) if (a.gorev === p) serbest(a);
        p.ekipteki = [];
        if (p.el.matches(KONTROL)) kontrolKuyrugu.push(p);
      }
    }

    if (now - sonSayac > 200) {
      sonSayac = now;
      const biten = parcalar.filter((p) => p.durum === "bitti").length;
      // Ekranda / yukarıda bekleyen iş miktarı (tur hızı buna göre ayarlanır)
      birikim = 0; geride = 0; cepheDoc = Infinity;
      let asagida = false;
      for (const p of parcalar) {
        if (p.durum === "bitti") continue;
        const r = p.el.getBoundingClientRect();
        // Cephe: en üstteki bitmemiş parçanın üst kenarı (sayfa koordinatında)
        cepheDoc = Math.min(cepheDoc, r.top + scrollY);
        if (r.bottom <= 0) geride++;
        else if (r.top < H * ALT_SINIR) birikim++;
        else asagida = true;
      }
      hudAjan.textContent = aktifSayi;
      hudBiten.textContent = biten;
      hudToplam.textContent = parcalar.length;
      hudCubuk.style.transform = `scaleX(${parcalar.length ? biten / parcalar.length : 1})`;
      const calisan = ajanlar.some((a) => a.gorev);
      if (tur) durumYazi(scrollY >= root.scrollHeight - innerHeight - 2 ? "tur: sonuna gelindi" : "tur: sayfa kayıyor", "tur");
      else if (!calisan && asagida && !birikim) durumYazi("kaydır, kurulmaya devam etsin ↓", "ipucu");
      else durumYazi("kaydır, kurulmaya devam etsin");
      const simdiBekliyor = !tur && !calisan && asagida && !birikim;
      if (simdiBekliyor && !bekliyor) { beklemeBas = now; sonrakiTesvik = now + 1200; }
      bekliyor = simdiBekliyor;
      if (biten === parcalar.length && !kontrolKuyrugu.length && !calisan) {
        kayit(null, "yapım bitti · planlama başlıyor");
        planlamaBasla();
      }
    }
  }

  /* ---------- Tur: ajanlar yetiştikçe sayfayı kendiliğinden kaydırır ---------- */
  function turAdim(dt) {
    if (!tur || faz !== 1) return;
    const maxY = root.scrollHeight - innerHeight;
    if (scrollY >= maxY - 1) { turV = 0; return; }
    // Cephe ekranın %35'inin altındaysa aradaki fark kadar hızlı kay (uzaksa hızlı,
    // yaklaştıkça yavaş); cephe %35'e geldiyse ya da yukarıda kaldıysa dur, ajanlar yetişsin.
    // Hiçbir parça kurulmadan ekranın üstünden çıkmaz.
    const H = innerHeight;
    const fark = cepheDoc === Infinity ? H : cepheDoc - scrollY - H * UST_BITMIS;
    const hedef = fark <= 0 ? 0 : Math.min(420, 25 + fark * 1.6) * (1 + (K - 1) * 0.5);
    turV += (hedef - turV) * Math.min(1, dt * (hedef < turV ? 5 : 2.5));
    turBirikim += turV * dt;
    if (turBirikim >= 1) {
      const d = Math.floor(turBirikim);
      turBirikim -= d;
      scrollBy({ top: d, behavior: "instant" });
    }
  }
  function turAyarla(acik) {
    tur = acik && faz === 1;
    turV = 0; turBirikim = 0;
    btnTur.classList.toggle("on", tur);
    btnTur.textContent = tur ? "Turda" : "Tur";
  }

  /* =====================================================================
     FAZ 2: PLANLAMA (sürü + toplantılar + teslim)
     ===================================================================== */
  let cember = [], gezgin = [], toplantilar = [], teslim = null, sonFlas = null;
  let sonrakiToplanti = 0, sonrakiTeslim = 0, sonrakiKavga = 0;
  // Kavga efektleri: toz bulutu, kıvılcımlar, ayrılınca çıkan halka
  let toz = [], kivilcim = [], halkalar = [];
  // Anlaşmazlık sözleri. content.js → ajanlar içine aynı adla (tartisma, kavga…) yazarsan onlar kullanılır.
  // Bütün sözler js/ajan-sozleri.js'te (window.AJAN_SOZ). content.js → ajanlar içine aynı adla
  // bir liste yazılırsa o öncelikli olur. Liste boşsa/yoksa çağrıdaki tek yedek cümle kullanılır.
  const VARSAYILAN = window.AJAN_SOZ || {};
  const SOZ = (k, yedek) => (Array.isArray(CFG[k]) && CFG[k].length ? CFG[k]
    : Array.isArray(VARSAYILAN[k]) && VARSAYILAN[k].length ? VARSAYILAN[k] : yedek);
  const R = () => (innerWidth < 600 ? 62 : 92);

  function planlamaBasla() {
    faz = 2;
    turAyarla(false);
    hudMod("planlama");
    const az = telefon();
    hudAjan.textContent = az ? Math.min(N, TELEFON_AJAN) : N;
    cember = []; gezgin = []; toplantilar = []; teslim = null;
    toz = []; kivilcim = []; halkalar = [];
    // Ekipler karışık dağılsın: çift sıradakiler sürüye, tekler gezmeye
    ajanlar.forEach((a, i) => {
      if (a.durum === "yok") {
        // Ekranda olmayanlar kenarlardan içeri akar
        const sol = Math.random() < 0.5;
        a.x = sol ? -30 - rnd(0, 160) : innerWidth + 30 + rnd(0, 160);
        a.y = rnd(0.1, 0.9) * innerHeight;
        a.vx = a.vy = 0;
      }
      a.el.classList.remove("yok", "cikiyor", "sec", "sinirli", "arbede");
      a.gorev = null; a.kontrol = false; a.lider = false; a.elle = false; a.toplanti = null; a.yeniHedef = 0; a.seyirciT = null; a.rehber = null;
      if (!a.balonBitis) adGoster(a, false);
      // Telefonda 17 ajan ekranı kaplıyor: sadece TELEFON_AJAN kadarı kalır, gerisi çekilir
      if (az && (i % 2 === 1 || i / 2 >= TELEFON_AJAN)) { durumYap(a, "yok"); return; }
      const j = az ? i / 2 : i;
      if (j % 2 === 0) { a.durum = "cember"; cember.push(a); }
      else { a.durum = "gez"; gezgin.push(a); }
    });
    const now = performance.now();
    sonrakiToplanti = now + 1200;
    sonrakiTeslim = now + 4500;
    sonrakiKavga = now + rnd(14000, 22000);   // ilk kavga hemen çıkmasın
  }

  // Dolaşma / toplantı için boş yer: sürüden uzak ve (mümkünse) yazının üstünde değil
  function bosNokta() {
    const W = innerWidth, H = innerHeight;
    const m = suruMerkezi();
    metinKutulari();
    let yedek = null;
    for (let k = 0; k < 24; k++) {
      const p = { x: rnd(50, W - 50), y: rnd(90, H - 90) };
      if (Math.hypot(p.x - m.x, p.y - m.y) < R() + 110) continue;
      if (!yedek) yedek = p;
      if (cakisma(p.x, p.y, 34) === 0) return p;
    }
    return yedek || { x: rnd(50, W - 50), y: rnd(90, H - 90) };
  }

  function toplantiBitir(t) {
    t.bitti = true;
    for (const a of t.uyeler) {
      a.el.classList.remove("sinirli", "arbede");
      a.elle = false;
      if (a.toplanti === t || a.durum === "kacis") { a.durum = "gez"; a.toplanti = null; a.yeniHedef = 0; }
    }
  }

  /* ---------- Arbede: iki ajan birbirine girer ----------
     Toz bulutu kalkar, kıvılcımlar uçuşur, etraftakiler toplanıp izler.
     En yakındaki boş ajan (tercihen testçi ya da editör) koşup araya girer
     ve ikisini iki yana savurur. Kimse gelmezse bir süre sonra yorulup ayrılırlar. */
  function arbedeBasla(t, now) {
    const [A, B] = t.uyeler;
    t.evre = "arbede";
    t.arbedeBas = now;
    t.bagir = now;
    t.kivilcimSon = 0;
    t.aci = rnd(0, Math.PI * 2);
    t.cx = (A.x + B.x) / 2;
    t.cy = (A.y + B.y) / 2;
    t.sonraki = Infinity;
    // Soldaki sağa, sağdaki sola bakar
    const [S, G] = A.x <= B.x ? [A, B] : [B, A];
    t.sol = S; t.sag = G;
    S.el.style.setProperty("--yon", "1");
    G.el.style.setProperty("--yon", "-1");
    for (const a of [A, B]) { a.elle = true; a.el.classList.add("sinirli", "arbede"); adGoster(a, true); }
    // Toplantıdaki üçüncü kişi ve yakındaki 1-2 gezgin seyirci olur
    const c = { x: t.cx, y: t.cy };
    const yakin = gezgin.filter((a) => a.durum === "gez").sort((a, b) => uzak(a, c) - uzak(b, c)).slice(0, 2);
    t.seyirci = [...t.uyeler.slice(2), ...yakin];
    t.seyirci.forEach((a, j) => {
      a.durum = "seyirci"; a.seyirciT = t;
      a.ofs = -Math.PI / 2 + (j - (t.seyirci.length - 1) / 2) * 1.1 + rnd(-.2, .2);
      if (j === 0) konus(a, sec(SOZ("seyirci", ["👀"])), 1300);
    });
    halkalar.push({ x: t.cx, y: t.cy, t: now, renk: "239,68,68", r: 34 });
    nota(0.02);
  }

  function arbedeAdim(t, now, dt) {
    const [A, B] = t.uyeler;
    const W = innerWidth, H = innerHeight;
    // Çöp adamlar karşı karşıya: biri hamle yapınca öteki geri seker, arada zıplarlar.
    // Bulut yavaşça sürüklenir.
    t.aci += dt * 11;
    t.cx = sinir(t.cx + Math.sin(now / 700) * 22 * dt, 60, W - 60);
    t.cy = sinir(t.cy + Math.cos(now / 900) * 16 * dt, 90, H - 90);
    const S = t.sol || A, G = t.sag || B;
    const hamle = Math.sin(now / 85);
    const sv = Math.max(0, hamle), gv = Math.max(0, -hamle);
    S.x = t.cx - 17 + sv * 7 - gv * 4 + rnd(-1.5, 1.5);
    G.x = t.cx + 17 - gv * 7 + sv * 4 + rnd(-1.5, 1.5);
    S.y = t.cy - Math.abs(Math.sin(now / 115)) * 5;
    G.y = t.cy - Math.abs(Math.cos(now / 125)) * 5;
    A.vx = A.vy = B.vx = B.vy = 0;

    if (toz.length < 140) for (let k = 0; k < 2; k++)
      toz.push({ x: t.cx + rnd(-22, 22), y: t.cy + rnd(-8, 6), vx: rnd(-70, 70), vy: rnd(-60, 10), r: rnd(4, 9), t: now, omur: rnd(500, 950) });
    if (now - t.kivilcimSon > 130) {
      t.kivilcimSon = now;
      kivilcim.push({ x: t.cx + rnd(-26, 26), y: t.cy + rnd(-44, -8), m: sec(["✶", "✸", "!", "#", "%", "⚡", "💢", "@"]),
        renk: sec(["#facc15", "#ef4444", "#ffffff", "#fb923c"]), t: now, boy: rnd(11, 17) });
    }
    if (now > t.bagir) {
      konus(Math.random() < 0.5 ? A : B, sec(SOZ("arbede", ["#@%&!"])), 650);
      t.bagir = now + rnd(380, 650);
    }

    // Arabulucu: biraz sonra en uygun boş ajan koşar
    if (!t.arabulucu && now - t.arbedeBas > 700) {
      const c = { x: t.cx, y: t.cy };
      const puan = (a) => uzak(a, c) - (a.ekipler.includes("testci") ? 260 : a.ekipler.includes("editor") ? 130 : 0);
      const aday = gezgin.filter((a) => a.durum === "gez").sort((a, b) => puan(a) - puan(b))[0];
      if (aday) {
        t.arabulucu = aday;
        aday.durum = "arabulucu"; aday.seyirciT = t;
        konus(aday, sec(SOZ("arabulucu", ["ayrılın!"])), 1300);
      }
    }
    const vardi = t.arabulucu && Math.hypot(t.arabulucu.x - t.cx, t.arabulucu.y - t.cy) < 30;
    if ((vardi && now - t.arbedeBas > 2400) || now - t.arbedeBas > 5200) ayir(t, now);
  }

  function ayir(t, now) {
    const [A, B] = t.uyeler;
    const W = innerWidth, H = innerHeight;
    [t.sol || A, t.sag || B].forEach((a, j) => {
      // Yana doğru savrulurlar (biraz da yukarı/aşağı)
      const yon = (j ? 0 : Math.PI) + rnd(-0.6, 0.6);
      a.elle = false;
      a.vx = Math.cos(yon) * 950; a.vy = Math.sin(yon) * 950;
      a.durum = "kacis";
      a.hx = sinir(t.cx + Math.cos(yon) * 120, 40, W - 40);
      a.hy = sinir(t.cy + Math.sin(yon) * 100, 70, H - 80);
      a.el.classList.remove("arbede");
    });
    if (t.arabulucu) konus(t.arabulucu, sec(SOZ("arabulucu", ["sakin olun!"])), 1400);
    else konus(A, sec(SOZ("yorgun", ["yoruldum…"])), 1200);
    for (const a of [...(t.seyirci || []), t.arabulucu].filter(Boolean)) {
      a.durum = "gez"; a.seyirciT = null; a.yeniHedef = 0; a.toplanti = null;
    }
    halkalar.push({ x: t.cx, y: t.cy, t: now, renk: "250,250,250", r: 70 });
    nota(0.5);
    t.evre = "ayrildi";
    t.sonraki = now + 900;
  }

  /* ---------- Ziyaretçiyle etkileşim: ajana tıkla ----------
     Tıklanan ajan selam verir. Planlamada boştaysa ekrandaki ilginç bir
     parçaya koşar, onu kendi renginde çerçeveler ve "buraya baktınız mı?" der.
     Kurarken "iş başındayım", toplantıdaysa "birazdan", kavgadaysa "şimdi değil!". */
  const SELAM = SOZ("selam", ["selam!"]);
  const MESGUL = SOZ("mesgul", ["iş başındayım"]);
  const REHBER = SOZ("rehber", [[".about", ["Kayra'yı tanıyın"]]]);
  function rehberSec() {
    const H = innerHeight, aday = [];
    for (const [s, sozler] of REHBER) for (const el of document.querySelectorAll(s)) {
      if (el.closest(".reader, .editor, .side")) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom > 90 && r.top < H - 110 && r.width > 20) aday.push({ el, sozler });
    }
    return aday.length ? sec(aday) : null;
  }
  function ajanTiklandi(a) {
    const now = performance.now();
    adGoster(a, true);
    if (faz === 1 && a.gorev) return konus(a, sec(MESGUL), 1700);
    if (a.durum === "toplanti") {
      const t = a.toplanti;
      return konus(a, sec(t && t.evre === "arbede" ? SOZ("kavgada", ["şimdi değil!!"]) : SOZ("toplantida", ["birazdan 🙃"])), 1500);
    }
    if (faz !== 2 || (a.durum !== "cember" && a.durum !== "gez")) return konus(a, sec(SELAM), 1600);
    konus(a, sec(SELAM), 1300);
    const h = rehberSec();
    if (!h) { sonraSoz.push({ t: now + 1300, a, m: sec(SOZ("rehberYok", ["aşağıda daha çok şey var ↓"])) }); return; }
    a.rehber = { el: h.el, metin: sec(h.sozler), bas: now + 900, geldi: 0, once: a.durum };
    a.durum = "rehber";
  }
  function rehberBitir(a) {
    const g = a.rehber;
    if (g && g.el) g.el.classList.remove("ajan-isaret");
    a.durum = g ? g.once : "gez";
    a.rehber = null; a.yeniHedef = 0;
    if (!a.balonBitis) adGoster(a, false);
  }
  function rehberAdim(now) {
    for (const a of ajanlar) {
      if (a.durum !== "rehber" || !a.rehber) continue;
      const g = a.rehber;
      if (!g.el.isConnected) { rehberBitir(a); continue; }
      if (now < g.bas) { a.hx = a.x; a.hy = a.y; a.hiz = 150; continue; }   // önce yerinde selam verir
      const r = g.el.getBoundingClientRect();
      a.hx = sinir(r.left + Math.min(36, r.width * 0.3), 8, innerWidth - 40);
      a.hy = sinir(r.top + Math.min(24, r.height * 0.3), 60, innerHeight - 60);
      a.hiz = 620;
      if (!g.geldi && Math.hypot(a.hx - a.x, a.hy - a.y) < 24) {
        g.geldi = now;
        konus(a, g.metin, 2600);
        g.el.style.setProperty("--isaret", a.renk);
        g.el.classList.add("ajan-isaret");
      }
      if (g.geldi && now - g.geldi > 2800) rehberBitir(a);
      else if (!g.geldi && now - g.bas > 5000) rehberBitir(a);
    }
  }

  function planlamaAdim(now, dt) {
    const m = suruMerkezi();
    suruAdim(dt, cember.filter((a) => a.durum === "cember"), m, 1);
    rehberAdim(now);

    // Yeni toplantı
    if (now > sonrakiToplanti) {
      sonrakiToplanti = now + rnd(1800, 3400);
      const serbestler = gezgin.filter((a) => a.durum === "gez");
      if (serbestler.length >= 2) {
        const lider = sec(serbestler);
        const kac = Math.random() < 0.5 ? 1 : 2;
        const uyeler = [lider, ...serbestler.filter((a) => a !== lider).sort((a, b) => uzak(a, lider) - uzak(b, lider)).slice(0, kac)];
        let x = uyeler.reduce((s, a) => s + a.x, 0) / uyeler.length;
        let y = uyeler.reduce((s, a) => s + a.y, 0) / uyeler.length;
        metinKutulari();
        if (Math.hypot(x - m.x, y - m.y) < R() + 110 || cakisma(x, y, 40)) ({ x, y } = bosNokta());
        // Toplantıların bir kısmı tartışmaya, bir kısmı kavgaya döner
        // Kavga seyrek: iki kavga arasında en az ~25 sn geçer
        const zar = Math.random();
        let tur = zar < 0.62 ? "normal" : zar < 0.9 || now < sonrakiKavga ? "tartisma" : "kavga";
        if (tur === "tartisma" && Math.random() < 0.3) tur = "normal";
        if (tur === "kavga") sonrakiKavga = now + rnd(25000, 40000);
        // Kavga seyircileriyle geniş yer kaplar: kenarlardan içeride olsun
        const pay = tur === "kavga" ? Math.min(150, innerWidth * 0.2) : 60;
        x = sinir(x, pay, innerWidth - pay);
        y = sinir(y, tur === "kavga" ? 150 : 90, innerHeight - (tur === "kavga" ? 160 : 100));
        const t = { uyeler, x, y, olustu: now, basladi: 0, sira: 0, sonraki: 0, tur, evre: "konusma",
          soz: sec(SOZ("tartisma", [["bence böyle", "bence değil", "kesin böyle", "asla"]])) };
        uyeler.forEach((a, j) => { a.durum = "toplanti"; a.toplanti = t; a.ofs = (j * Math.PI * 2) / uyeler.length + rnd(0, .5); });
        // Çok ekipli ajan toplantıya bazen öbür şapkasıyla girer
        uyeler.forEach((a) => { if (a.ekipler.length > 1 && Math.random() < 0.5) ekipDegis(a, sec(a.ekipler), false); });
        toplantilar.push(t);
      }
    }

    // Yeni teslim: dolaşan bir ajan sürüdekine görev verir, yer değiştirirler
    if (!teslim && now > sonrakiTeslim) {
      sonrakiTeslim = now + rnd(5000, 9000);
      const w = sec(gezgin.filter((a) => a.durum === "gez"));
      const sürüde = cember.filter((a) => a.durum === "cember");
      if (w && sürüde.length) {
        const o = sürüde.reduce((iyi, a) => (uzak(a, w) < uzak(iyi, w) ? a : iyi), sürüde[0]);
        teslim = { w, o, bas: now };
        w.durum = "teslim";
        konus(w, sec(SOZ("teslim", ["yeni görev →"])), 1800);
      }
    }

    // Gezginlerin hedefleri
    for (const a of gezgin) {
      if (a.durum === "gez") {
        if (now > a.yeniHedef || Math.hypot(a.hx - a.x, a.hy - a.y) < 14) {
          const p = bosNokta();
          a.hx = p.x; a.hy = p.y;
          a.yeniHedef = now + rnd(3000, 6000);
        }
        a.hiz = 80;
      } else if (a.durum === "toplanti") {
        const t = a.toplanti;
        // Kızışınca birbirlerine yaklaşıp burun buruna gelirler
        const yakin = t.evre === "kizisma" ? 15 : t.kizgin ? 22 : 28;
        a.hx = t.x + Math.cos(a.ofs) * yakin;
        a.hy = t.y + Math.sin(a.ofs) * yakin * 0.8;
        a.hiz = t.evre === "kizisma" ? 300 : 220;
      } else if (a.durum === "seyirci" && a.seyirciT) {
        const t = a.seyirciT;
        a.hx = t.cx + Math.cos(a.ofs) * 74;
        a.hy = t.cy + Math.sin(a.ofs) * 58;
        a.hiz = 240;
        if (!a.balonBitis && Math.random() < dt * 0.5) konus(a, sec(SOZ("seyirci", ["👀"])), 1200);
      } else if (a.durum === "arabulucu" && a.seyirciT) {
        a.hx = a.seyirciT.cx; a.hy = a.seyirciT.cy;
        a.hiz = 560;
      } else if (a.durum === "kacis") {
        a.hiz = 370;
      } else if (a.durum === "teslim" && teslim) {
        a.hx = teslim.o.x; a.hy = teslim.o.y;
        a.hiz = 370;
      }
    }

    // Toplantıları yürüt
    for (const t of toplantilar) {
      const geldi = t.uyeler.every((a) => Math.hypot(a.hx - a.x, a.hy - a.y) < 30);
      if (!t.basladi && (geldi || now - t.olustu > 4500)) { t.basladi = now; t.sonraki = now; }
      if (t.evre === "arbede") arbedeAdim(t, now, dt);
      if (!t.basladi || now < t.sonraki) continue;
      const [A, B] = t.uyeler;

      if (t.tur === "normal") {
        if (t.sira < 2 + t.uyeler.length) {
          konus(t.uyeler[t.sira % t.uyeler.length], sec(SOZ("planlama", ["tamam, plan bu"])), 1500);
          t.sira++;
          t.sonraki = now + 1150;
        } else toplantiBitir(t);

      } else if (t.evre === "konusma") {
        // Fikir ayrılığı: ilk iki üye sırayla karşı görüş söyler
        if (t.sira < t.soz.length) {
          konus(t.uyeler[t.sira % 2], t.soz[t.sira], 1500);
          t.sira++;
          t.sonraki = now + 1050;
          if (t.sira >= 3) t.kizgin = true;
          if (t.tur === "kavga" && t.sira >= 2) { A.el.classList.add("sinirli"); B.el.classList.add("sinirli"); }
        } else if (t.tur === "tartisma") {
          // Biri geri adım atar (ya da küser)
          konus(Math.random() < 0.5 ? A : B, sec(SOZ("baris", ["peki"])), 1600);
          t.evre = "son"; t.sonraki = now + 1500;
        } else {
          t.evre = "kizisma"; t.sira = 0; t.sonraki = now + 250;
        }

      } else if (t.evre === "kizisma") {
        // Sesler yükselir, kısa ve sert
        if (t.sira < 4) {
          konus(t.uyeler[t.sira % 2], sec(SOZ("kavga", ["yeter!"])), 800);
          t.sira++;
          t.sonraki = now + 620;
        } else arbedeBasla(t, now);

      } else if (t.evre === "ayrildi") {
        const s2 = SOZ("sonrasi", ["hıh."]);
        const s1 = sec(s2);
        konus(A, s1, 1600);
        konus(B, sec(s2.filter((x) => x !== s1).length ? s2.filter((x) => x !== s1) : s2), 1600);
        A.el.classList.remove("sinirli"); B.el.classList.remove("sinirli");
        t.evre = "son"; t.sonraki = now + 1700;

      } else if (t.evre === "son") toplantiBitir(t);
    }
    toplantilar = toplantilar.filter((t) => !t.bitti);

    // Teslimi yürüt
    if (teslim) {
      const { w, o } = teslim;
      if (uzak(w, o) < 26 || now - teslim.bas > 5000) {
        konus(o, sec(SOZ("cevap", ["aldım ✓"])), 1500);
        const k = cember.indexOf(o);
        if (k > -1) cember[k] = w;
        gezgin[gezgin.indexOf(w)] = o;
        w.durum = "cember";
        o.durum = "gez"; o.yeniHedef = 0;
        sonFlas = { x1: w.x, y1: w.y, x2: o.x, y2: o.y, t: now };
        teslim = null;
        nota(0.8);
      }
    }
  }

  /* ---------- Çizim ---------- */
  const yuvarlak = (x, y, w, h, r) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  };
  // Seçim kutusu: kenar çizgisi, 4 köşe tutamacı ve "G × Y" ölçü rozeti
  function secimCiz(now) {
    if (!secimler.length) return;
    const H = innerHeight;
    for (const p of secimler) {
      const s = p.sec;
      if (!s || !p.el.isConnected) { if (s) s.sil = true; continue; }
      let alfa = 1;
      if (s.bitti) {
        alfa = 1 - (now - s.bitti) / 450;
        if (alfa <= 0) { s.sil = true; continue; }
      }
      const r = p.el.getBoundingClientRect();
      if (r.bottom < -10 || r.top > H + 10) continue;
      const k = yumusak(Math.min(1, (now - s.bas) / s.sure));
      const x = Math.round(r.left) + .5, y = Math.round(r.top) + .5;
      const w = r.width * k, h = r.height * k;
      const renk = s.a.renk;
      ctx.globalAlpha = alfa * 0.07;
      ctx.fillStyle = renk;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = alfa;
      ctx.strokeStyle = renk;
      ctx.lineWidth = 1.25;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "#fff";
      for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
        ctx.fillRect(hx - 3.5, hy - 3.5, 7, 7);
        ctx.strokeRect(hx - 3.5, hy - 3.5, 7, 7);
      }
      const yazi = `${Math.round(w)} × ${Math.round(h)}`;
      ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace";
      const tw = ctx.measureText(yazi).width + 12;
      const bx = sinir(x + w / 2 - tw / 2, 4, innerWidth - tw - 4);
      const by = sinir(y + h + 8, 6, H - 26);
      ctx.fillStyle = renk;
      yuvarlak(bx, by, tw, 17, 4);
      ctx.fill();
      ctx.fillStyle = "#050505";
      ctx.textBaseline = "middle";
      ctx.fillText(yazi, bx + 6, by + 9);
      ctx.globalAlpha = 1;
    }
    secimler = secimler.filter((p) => {
      if (p.sec && !p.sec.sil) return true;
      if (p.sec && p.sec.sil) p.sec = null;
      return false;
    });
  }

  function zikzak(A, B, now) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1;
    const nx = -dy / d, ny = dx / d;
    const n = Math.max(3, Math.round(d / 7));
    ctx.strokeStyle = "rgba(239,68,68,.95)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(A.x, A.y);
    for (let i = 1; i < n; i++) {
      const k = i / n, o = (i % 2 ? 1 : -1) * (3 + Math.sin(now / 50 + i) * 2.5);
      ctx.lineTo(A.x + dx * k + nx * o, A.y + dy * k + ny * o);
    }
    ctx.lineTo(B.x, B.y);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function efektCiz(now) {
    const dt = 1 / 60;
    // Toz bulutu
    toz = toz.filter((p) => now - p.t < p.omur);
    for (const p of toz) {
      const k = (now - p.t) / p.omur;
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96;
      ctx.fillStyle = `rgba(190,190,190,${(0.22 * (1 - k)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 1.4), 0, Math.PI * 2); ctx.fill();
    }
    // Kıvılcımlar
    kivilcim = kivilcim.filter((p) => now - p.t < 420);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const p of kivilcim) {
      const k = (now - p.t) / 420;
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = p.renk;
      ctx.font = `700 ${Math.round(p.boy * (1 + k * 0.5))}px 'JetBrains Mono', ui-monospace, monospace`;
      ctx.fillText(p.m, p.x, p.y - k * 10);
    }
    ctx.globalAlpha = 1; ctx.textAlign = "start";
    // Halkalar (arbede başlarken / ayrılırken)
    halkalar = halkalar.filter((h) => now - h.t < 450);
    for (const h of halkalar) {
      const k = (now - h.t) / 450;
      ctx.strokeStyle = `rgba(${h.renk},${(0.8 * (1 - k)).toFixed(3)})`;
      ctx.lineWidth = 2 * (1 - k) + 0.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, 10 + h.r * k, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  function ciz(now) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    secimCiz(now);
    if (faz !== 2) return;
    ctx.lineWidth = 1;
    for (const t of toplantilar) {
      if (!t.basladi || t.evre === "arbede" || t.evre === "ayrildi") continue;
      const [A, B] = t.uyeler;
      if (t.evre === "kizisma") {
        // Kızışma: ikisinin arasında titreyen kırmızı zikzak
        zikzak(A, B, now);
        continue;
      }
      if (t.tur === "normal" || t.evre === "son") {
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = "rgba(251,191,36,.45)";
        ctx.beginPath();
        t.uyeler.forEach((a, j) => { const b = t.uyeler[(j + 1) % t.uyeler.length]; ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); });
        ctx.stroke();
      } else {
        // Fikir ayrılığı: karşı karşıya iki uç, ısındıkça kırmızılaşır
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -now / 40;
        ctx.strokeStyle = t.kizgin ? "rgba(239,68,68,.75)" : "rgba(251,146,60,.6)";
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        ctx.lineDashOffset = 0;
      }
    }
    ctx.setLineDash([]);
    efektCiz(now);
    if (teslim) {
      ctx.strokeStyle = "rgba(239,68,68,.75)";
      ctx.beginPath(); ctx.moveTo(teslim.w.x, teslim.w.y); ctx.lineTo(teslim.o.x, teslim.o.y); ctx.stroke();
    }
    if (sonFlas) {
      const k = 1 - (now - sonFlas.t) / 700;
      if (k <= 0) sonFlas = null;
      else {
        ctx.strokeStyle = `rgba(74,222,128,${k})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sonFlas.x1, sonFlas.y1); ctx.lineTo(sonFlas.x2, sonFlas.y2); ctx.stroke();
      }
    }
  }

  /* ---------- Hareket: herkes hedefine yumuşakça gider, birbirine çarpmaz ---------- */
  function hareket(dt) {
    const itme = okuyor();
    if (itme) metinKutulari();
    for (const a of ajanlar) {
      if (a.durum === "yok") continue;
      if (!a.suru && !a.elle) {
        const dx = a.hx - a.x, dy = a.hy - a.y, d = Math.hypot(dx, dy) || 1;
        const v = Math.min(a.hiz, d * 6);
        let tx = (dx / d) * v, ty = (dy / d) * v;
        if (itme && !a.gorev && a.durum !== "cikiyor" && a.durum !== "rehber") { const it = metinItme(a); if (it) { tx += it[0] * 0.6; ty += it[1] * 0.6; } }
        for (const b of ajanlar) {
          if (b === a || b.durum === "yok") continue;
          const ex = a.x - b.x, ey = a.y - b.y, e = Math.hypot(ex, ey);
          if (e > 0 && e < 22) { tx += (ex / e) * (22 - e) * 9; ty += (ey / e) * (22 - e) * 9; }
        }
        const k = Math.min(1, dt * 8);
        a.vx += (tx - a.vx) * k;
        a.vy += (ty - a.vy) * k;
        a.x += a.vx * dt;
        a.y += a.vy * dt;
      }
      a.suru = false;
      a.el.style.transform = `translate(${a.x.toFixed(1)}px,${a.y.toFixed(1)}px)`;
    }
  }

  /* =====================================================================
     MNK dev: Kayra'nın kendisi
     Diğer 15 ajandan bağımsızdır: ✕ ile ajanlar gizlense, sunum atlansa da
     ekranda kalır ve siteyi hep birisi düzenliyormuş gibi gezer: bölümleri
     inceler, parçaları seçim kutusuyla seçer, yazıların başında "yazar",
     arada kendi kendine konuşur. Boyu 202 cm, imleci de diğerlerinden büyük.
     Sadece "hareketi azalt" açıksa görünmez. Sayfayı asla kaydırmaz, tıklamaz.
     ===================================================================== */
  const mnkKatman = document.createElement("div");
  mnkKatman.className = "mnk-katman";
  mnkKatman.setAttribute("aria-hidden", "true");
  mnkKatman.innerHTML = `
    <div class="mnk-sec"><i></i><i></i><i></i><i></i><b class="mnk-olcu"></b></div>
    <div class="mnk">
      <svg class="mnk-ok" viewBox="0 0 16 16" width="30" height="30"><path d="M1 1l13 5-6 2-2 6z" fill="#ef4444" stroke="#fff" stroke-width="1.1" stroke-linejoin="round"/></svg>
      <svg class="mnk-ibeam" viewBox="0 0 16 22" width="18" height="26"><path d="M4 1.5h8M4 20.5h8M8 1.5v19" fill="none" stroke="#050505" stroke-width="3.6" stroke-linecap="round"/><path d="M4 1.5h8M4 20.5h8M8 1.5v19" fill="none" stroke="#ef4444" stroke-width="1.6" stroke-linecap="round"/></svg>
      <span class="mnk-ad">MNK dev</span><span class="mnk-balon"></span>
    </div>`;
  document.body.append(mnkKatman);
  const mnkEl = mnkKatman.querySelector(".mnk");
  const mnkBalon = mnkKatman.querySelector(".mnk-balon");
  const mnkSecEl = mnkKatman.querySelector(".mnk-sec");
  const mnkOlcu = mnkKatman.querySelector(".mnk-olcu");
  const MNK_SOZ = SOZ("mnk", ["⌘S"]);
  const MNK_HEDEF = "h1, h2, h3, .sec-title, .eyebrow, .post, .proj, .about, .featured, .flagship, .media, .btn, " +
    ".filters button, #portrait, #stats > *, .contact-title, .gh-strip, .lead, .sec-lead, .foot";
  const mnk = {
    x: innerWidth * 0.72, y: innerHeight * 0.38,
    adimlar: [], adim: null, bas: 0,
    yol: null, balonBitis: 0, sec: null, jx: 0, jy: 0
  };
  mnkEl.style.transform = `translate(${mnk.x}px,${mnk.y}px)`;

  function mnkHedefBul() {
    const H = innerHeight, W = innerWidth;
    const aday = [];
    for (const el of document.querySelectorAll(MNK_HEDEF)) {
      if (el.closest(".reader, .editor, .side, .ajan-hud")) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 24 || r.height < 12) continue;
      if (r.top < 70 || r.bottom > H - 70 || r.left < 0 || r.right > W) continue;
      aday.push({ el, r });
    }
    return aday.length ? sec(aday) : null;
  }
  // İnsan eli gibi: hafif kavisli yol, yavaşça hızlanıp yavaşlayan hareket
  function mnkGit(x, y, hizli) {
    const d = Math.hypot(x - mnk.x, y - mnk.y);
    const sure = Math.min(1400, 260 + d * (hizli ? 0.9 : 1.6)) * rnd(0.85, 1.15);
    const kavis = rnd(-0.25, 0.25) * d;
    const mx = (mnk.x + x) / 2, my = (mnk.y + y) / 2;
    const nx = -(y - mnk.y) / (d || 1), ny = (x - mnk.x) / (d || 1);
    mnk.yol = { x0: mnk.x, y0: mnk.y, x1: x, y1: y, cx: mx + nx * kavis, cy: my + ny * kavis, bas: performance.now(), sure };
  }
  function mnkKonus(metin, ms = 2000) {
    mnkBalon.textContent = metin;
    mnkEl.classList.add("konusuyor");
    mnk.balonBitis = performance.now() + ms;
  }
  /* ----- Yazılarla gerçek etkileşim -----
     Ekrandaki bir yazıdan gerçek bir kelime seçer (kırmızı seçim), sonra:
     - yazım: sonunu silip yeniden yazar, araya bir yazım hatası karışır, fark edip düzeltir
     - vurgu: altını kırmızı fosforlu kalemle çizer
     - kalın: kalın + kırmızı yapar, beğenmez, ⌘Z ile geri alır
     Kelime her durumda eski hâline döner, içerik kalıcı değişmez. */
  const MNK_METIN = "h2, h3, .sec-title, .sec-lead, .lead, .about p, .post h3, .post p, .proj h3, .proj p, .contact-title, .featured h3, .featured p, .flagship p";
  const HARF_RE = /[A-Za-zÇĞİÖŞÜçğıöşü]{4,}/g;
  function mnkKelimeBirak(k) {
    if (!k || !k.span.isConnected) return;
    const ust = k.span.parentNode;
    k.span.replaceWith(document.createTextNode(k.orig));
    ust.normalize();
  }
  function mnkKelimeBul() {
    const H = innerHeight, W = innerWidth;
    const eller = [...document.querySelectorAll(MNK_METIN)].filter((el) => {
      if (el.closest(".reader, .editor, .side, .taslak, .insa, .ajan-hud")) return false;
      if (el.querySelector(".yz, .mnk-kelime, .taslak")) return false;
      const r = el.getBoundingClientRect();
      return r.top > 80 && r.bottom < H - 90 && r.width > 40;
    });
    while (eller.length) {
      const el = eller.splice((Math.random() * eller.length) | 0, 1)[0];
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), adaylar = [];
      for (let n; (n = w.nextNode());) {
        if (n.parentElement.closest("svg, script, style, .yz")) continue;
        HARF_RE.lastIndex = 0;
        for (let m; (m = HARF_RE.exec(n.nodeValue));) adaylar.push({ n, i: m.index, s: m[0] });
      }
      while (adaylar.length) {
        const c = adaylar.splice((Math.random() * adaylar.length) | 0, 1)[0];
        if (!c.n.isConnected) continue;
        const kelime = c.n.splitText(c.i);
        kelime.splitText(c.s.length);
        const span = document.createElement("span");
        span.className = "mnk-kelime";
        kelime.replaceWith(span);
        span.textContent = c.s;
        const k = { span, orig: c.s };
        const r = span.getBoundingClientRect();
        if (r.top > 70 && r.bottom < H - 70 && r.left > 4 && r.right < W - 30) return k;
        mnkKelimeBirak(k);
        break;
      }
    }
    return null;
  }
  // Yazım: sondan birkaç harf sil, hatalı yaz, fark et, sil, doğrusunu yaz
  function yazimDurumlari(orig) {
    const L = orig.length, k = Math.max(2, Math.min(L - 1, Math.round(rnd(2, 5))));
    const kok = orig.slice(0, L - k), son = orig.slice(L - k);
    let yanlis = son.length >= 2 ? son[1] + son[0] + son.slice(2) : son + "x";
    if (yanlis === son) yanlis = son + son.slice(-1);
    const out = [];
    for (let j = 1; j <= k; j++) out.push({ s: orig.slice(0, L - j) });
    for (let j = 1; j <= yanlis.length; j++) out.push({ s: kok + yanlis.slice(0, j) });
    out.push({ s: kok + yanlis, soz: sec(["ups", "hata!", "dur bi'", "yanlış yazdım 🙈"]), bekle: 650 });
    for (let j = yanlis.length - 1; j >= 0; j--) out.push({ s: kok + yanlis.slice(0, j), hizli: true });
    for (let j = 1; j <= son.length; j++) out.push({ s: kok + son.slice(0, j) });
    out.push({ s: orig, soz: sec(["tamam ✓", "şimdi oldu", "⌘S", "düzelttim"]), bekle: 500 });
    return out;
  }
  function mnkMetinPlani() {
    const k = mnkKelimeBul();
    if (!k) return false;
    const adimlar = [{ t: "kelimeGit", k }, { t: "kelimeSec", k, ms: rnd(350, 600) }];
    const zar = Math.random();
    if (zar < 0.5) adimlar.push({ t: "tuslar", k, liste: yazimDurumlari(k.orig) });
    else if (zar < 0.75) adimlar.push({ t: "sinif", k, cls: "vurgu", soz: sec(["önemli 👆", "bunun altını çizeyim", "burası güzel"]), ms: 2600 });
    else adimlar.push({ t: "sinif", k, cls: "kalin", soz: "kalın olsun", ms: 1800 }, { t: "soz2", metin: "yok, eskisi iyiydi ⌘Z" });
    adimlar.push({ t: "kelimeBitir", k });
    mnk.adimlar = adimlar;
    mnk.adim = null;
    return true;
  }
  const MNK_MERHABA = SOZ("mnkMerhaba", ["selam, ben Kayra 👋"]);
  function mnkTiklandi() {
    mnkKonus(sec(MNK_MERHABA), 2400);
    // Yazı düzenlemiyorsa bir an durup ziyaretçiye döner
    if (!mnk.adim || !mnk.adim.k) { mnk.adimlar.unshift({ t: "bekle", ms: 1600 }); mnk.adim = null; mnkEl.classList.remove("yaziyor"); }
  }

  // Bir sonraki işi seç: yazıyla oyna / incele / seç / yaz / dolaş
  function mnkPlan() {
    const W = innerWidth, H = innerHeight;
    if (telefon()) return mnkTelefonPlan(W, H);
    if (Math.random() < 0.4 && mnkMetinPlani()) return;
    const h = mnkHedefBul();
    const zar = Math.random();
    if (!h || zar < 0.12) {
      mnk.adimlar = [{ t: "git", x: rnd(80, W - 140), y: rnd(110, H - 140) }, { t: "bekle", ms: rnd(500, 1200) }];
    } else if (zar < 0.45) {
      // İncele: kartın içinde bir noktaya gidip okur gibi durur
      mnk.adimlar = [
        { t: "git", x: h.r.left + h.r.width * rnd(.2, .8), y: h.r.top + h.r.height * rnd(.25, .75) },
        { t: "bekle", ms: rnd(900, 2200), oku: true }
      ];
    } else if (zar < 0.75) {
      // Seç: sol üst köşeye git, sağ alta sürükle, ölçüye bak, bırak
      mnk.adimlar = [
        { t: "git", x: h.r.left, y: h.r.top, el: h.el, hizli: true },
        { t: "sec", el: h.el, ms: rnd(550, 900) },
        { t: "bekle", ms: rnd(700, 1300) },
        { t: "secBirak" }
      ];
    } else {
      // Yaz: yazının başına gider, imleç I-beam olur, harf harf ilerler, bir şey söyler
      mnk.adimlar = [
        { t: "git", x: h.r.left + 6, y: h.r.top + Math.min(h.r.height / 2, 18) },
        { t: "yaz", ms: rnd(1400, 2600), genislik: Math.min(h.r.width - 12, 220) }
      ];
    }
    if (Math.random() < 0.35 && !mnk.balonBitis) mnk.adimlar.splice(1, 0, { t: "soz" });
    mnk.adim = null;
  }

  // Telefonda ziyaretçi hep okuyor sayılır: MNK yazıya değmeyen boşluklarda (çoğunlukla
  // sağ kenarda) bekler, arada bir kartı seçim kutusuyla seçip bırakır, kelimelere dokunmaz.
  function mnkTelefonPlan(W, H) {
    const bos = () => enYakinBos({ x: rnd(W * 0.6, W - 30), y: rnd(130, H - 170) }, 30);
    const h = Math.random() < 0.3 ? mnkHedefBul() : null;
    if (h && !h.el.matches("h1, h2, h3, .lead, .sec-lead, .contact-title")) {
      const p = bos();
      mnk.adimlar = [
        { t: "git", x: h.r.left, y: h.r.top, el: h.el, hizli: true },
        { t: "sec", el: h.el, ms: rnd(500, 800) },
        { t: "bekle", ms: rnd(500, 900) },
        { t: "secBirak" },
        { t: "git", x: p.x, y: p.y, hizli: true }
      ];
    } else {
      const p = bos();
      mnk.adimlar = [{ t: "git", x: p.x, y: p.y }, { t: "bekle", ms: rnd(2500, 5000), oku: true }];
    }
    if (Math.random() < 0.25 && !mnk.balonBitis) mnk.adimlar.splice(mnk.adimlar.length - 1, 0, { t: "soz" });
    mnk.adim = null;
  }

  function mnkAdim(now, dt) {
    if (reduce || mnkKatman.hidden) return;
    if (!mnk.adim) {
      if (!mnk.adimlar.length) mnkPlan();
      mnk.adim = mnk.adimlar.shift();
      mnk.bas = now;
      const a = mnk.adim;
      // Kelime yerinden kalktıysa (parça yeniden kuruldu vb.) bu adımı geç
      if (a.k && !a.k.span.isConnected && a.t !== "kelimeBitir") a.iptal = true;
      if (a.t === "kelimeGit" && !a.iptal) {
        const r = a.k.span.getBoundingClientRect();
        a.t = "git"; a.x = r.left - 2; a.y = r.top + r.height / 2;
      }
      if (a.t === "kelimeSec" && !a.iptal) { mnkEl.classList.add("yaziyor"); a.k.span.classList.add("secili"); }
      if (a.t === "tuslar" && !a.iptal) { a.i = 0; a.sonraki = now; a.k.span.classList.remove("secili"); }
      if (a.t === "sinif" && !a.iptal) {
        a.k.span.classList.remove("secili");
        a.k.span.classList.add(a.cls);
        mnkEl.classList.remove("yaziyor");
        if (a.soz) mnkKonus(a.soz, a.ms);
      }
      if (a.t === "soz2") { mnkKonus(a.metin, 1700); a.t = "bekle"; a.ms = 1300; }
      if (a.t === "kelimeBitir") {
        if (a.k.span.isConnected) a.k.span.classList.remove("secili", "vurgu", "kalin");
        mnkKelimeBirak(a.k);
        mnkEl.classList.remove("yaziyor");
      }
      if (a.t === "git" && !a.iptal) {
        // Seçilecek parça yerinden kaydıysa güncel köşesine git
        if (a.el && a.el.isConnected) { const r = a.el.getBoundingClientRect(); a.x = r.left; a.y = r.top; }
        mnkGit(sinir(a.x, 6, innerWidth - 40), sinir(a.y, 60, innerHeight - 50), a.hizli);
      }
      if (a.t === "sec") { mnk.sec = { el: a.el, bas: now, sure: a.ms, bitti: 0 }; mnkSecEl.classList.add("acik"); mnkEl.classList.add("basiyor"); }
      if (a.t === "secBirak") { if (mnk.sec) mnk.sec.bitti = now; mnkSecEl.classList.remove("acik"); mnkEl.classList.remove("basiyor"); }
      if (a.t === "yaz") { mnkEl.classList.add("yaziyor"); a.x0 = mnk.x; }
      if (a.t === "soz") mnkKonus(sec(MNK_SOZ), 2200);
    }
    const a = mnk.adim;
    let bitti = false;
    if (a.iptal) {
      bitti = true;
    } else if (a.t === "kelimeSec") {
      const r = a.k.span.getBoundingClientRect();
      const k = yumusak(Math.min(1, (now - mnk.bas) / a.ms));
      a.k.span.style.setProperty("--k", (k * 100).toFixed(0) + "%");
      mnk.x = r.left + r.width * k;
      mnk.y = r.top + r.height / 2;
      bitti = k >= 1;
    } else if (a.t === "tuslar") {
      if (now >= a.sonraki) {
        if (a.i >= a.liste.length) bitti = true;
        else {
          const d = a.liste[a.i++];
          a.k.span.textContent = d.s;
          if (d.soz) mnkKonus(d.soz, 1400);
          a.sonraki = now + (d.bekle || (d.hizli ? rnd(45, 80) : rnd(85, 170)));
        }
      }
      const r = a.k.span.getBoundingClientRect();
      mnk.x = r.right + 1;
      mnk.y = r.top + r.height / 2;
    } else if (a.t === "sinif") {
      bitti = now - mnk.bas >= a.ms;
    } else if (a.t === "git") {
      const y = mnk.yol;
      const k = Math.min(1, (now - y.bas) / y.sure), e = yumusak(k), u = 1 - e;
      mnk.x = u * u * y.x0 + 2 * u * e * y.cx + e * e * y.x1;
      mnk.y = u * u * y.y0 + 2 * u * e * y.cy + e * e * y.y1;
      bitti = k >= 1;
    } else if (a.t === "sec") {
      const s = mnk.sec;
      if (!s.el.isConnected) bitti = true;
      else {
        const r = s.el.getBoundingClientRect();
        const k = yumusak(Math.min(1, (now - s.bas) / s.sure));
        const w = r.width * k, h = r.height * k;
        mnkSecEl.style.transform = `translate(${r.left}px,${r.top}px)`;
        mnkSecEl.style.width = w + "px";
        mnkSecEl.style.height = h + "px";
        mnkOlcu.textContent = `${Math.round(w)} × ${Math.round(h)}`;
        mnk.x = sinir(r.left + w, 6, innerWidth - 40);
        mnk.y = sinir(r.top + h, 60, innerHeight - 50);
        bitti = now - s.bas >= s.sure;
      }
    } else if (a.t === "bekle") {
      // Okurken hafifçe kıpırdar
      if (a.oku) { mnk.jx = Math.sin(now / 700) * 6; mnk.jy = Math.sin(now / 1100) * 3; }
      bitti = now - mnk.bas >= a.ms;
    } else if (a.t === "yaz") {
      // Harf harf sağa ilerler (küçük sıçramalarla)
      const k = Math.min(1, (now - mnk.bas) / a.ms);
      mnk.x = a.x0 + Math.floor(k * a.genislik / 7) * 7;
      bitti = k >= 1;
      if (bitti) mnkEl.classList.remove("yaziyor");
    } else bitti = true;
    if (a.t !== "bekle") { mnk.jx *= 0.9; mnk.jy *= 0.9; }

    // Seçim bırakılınca kutu ekranda kaldığı yerde söner, parçayı takip etmeye devam etsin
    if (mnk.sec && mnk.sec.bitti) {
      if (now - mnk.sec.bitti > 400) mnk.sec = null;
      else if (mnk.sec.el.isConnected) {
        const r = mnk.sec.el.getBoundingClientRect();
        mnkSecEl.style.transform = `translate(${r.left}px,${r.top}px)`;
      }
    } else if (mnk.sec && a.t !== "sec" && mnk.sec.el.isConnected) {
      const r = mnk.sec.el.getBoundingClientRect();
      mnkSecEl.style.transform = `translate(${r.left}px,${r.top}px)`;
    }
    if (mnk.balonBitis && now > mnk.balonBitis) { mnk.balonBitis = 0; mnkEl.classList.remove("konusuyor"); }
    mnkEl.style.transform = `translate(${(mnk.x + mnk.jx).toFixed(1)}px,${(mnk.y + mnk.jy).toFixed(1)}px)`;
    // Sağ kenara yakınken etiket ve balon sola açılsın, ekrandan taşmasın
    const sagda = mnk.x > innerWidth - 230;
    if (sagda !== mnk.sagda) { mnk.sagda = sagda; mnkEl.classList.toggle("sagda", sagda); }
    if (bitti) mnk.adim = null;
  }

  /* ---------- Ana döngü ---------- */
  let onceki = performance.now();
  function dongu(now) {
    const dt = Math.min(0.05, (now - onceki) / 1000);
    onceki = now;
    zaman += dt;
    mnkAdim(now, dt);
    yaziAdim(now);
    if (sonraSoz.length) sonraSoz = sonraSoz.filter((s) => {
      if (now < s.t) return true;
      if (faz && s.a.durum !== "yok" && s.a.durum !== "cikiyor") konus(s.a, s.m, 1300);
      return false;
    });
    if (faz) {
      if (faz === 1) { yapimAdim(now, dt); turAdim(dt); }
      else planlamaAdim(now, dt);
      for (const a of ajanlar) {
        if (a.balonBitis && now > a.balonBitis) {
          a.balonBitis = 0;
          a.el.classList.remove("konusuyor");
          if (["bos", "gez", "cember", "cikiyor", "yok"].includes(a.durum)) adGoster(a, false);
        }
      }
      hareket(dt);
      ciz(now);
    }
    requestAnimationFrame(dongu);
  }

  /* ---------- Başlatma, atlama, gizleme, yeniden kurma ---------- */
  function goster(acik) {
    katman.hidden = !acik;
  }
  function yapimBasla() {
    hizliIptal();
    parcalar = topla();
    kontrolKuyrugu = [];
    secimler = [];
    sonraSoz = [];
    parcalar.forEach(taslakYap);
    ajanlar.forEach((a) => {
      Object.assign(a, { gorev: null, kontrol: false, lider: false, elle: false, toplanti: null, vx: 0, vy: 0, bosSure: 0 });
      a.el.classList.remove("sec");
      durumYap(a, "yok");
      adGoster(a, false);
    });
    kayitListe.innerHTML = "";
    kayit(null, `${N} ajan · ${parcalar.length} parça taslakta`);
    faz = 1;
    hudMod("yapim");
    bekliyor = false;
    // Sunum kendiliğinden başlar: tur açık gelir, ziyaretçi müdahale edince durur
    turAyarla(true);
    goster(true);
  }
  /* Atla: kalan parçalar bir anda değil, nerede kaldıysa oradan sırayla, en fazla ~3 sn'de
     hızlıca kurulur (her biri kısa bir inşa parıltısı + kurulma efekti). Sonra planlama. */
  let hizliMod = false, hizliZaman = [];
  function atla() {
    if (faz !== 1 || hizliMod) return;
    const kalan = parcalar.filter((p) => p.durum !== "bitti");
    turAyarla(false);
    ajanlar.forEach(serbest);
    kontrolKuyrugu = [];
    if (!kalan.length) { kayit(null, "atlandı · planlama başlıyor"); planlamaBasla(); return; }
    hizliMod = true;
    kayit(null, `atla · kalan ${kalan.length} parça hızlı kuruluyor`);
    durumYazi("hızlı kurulum", "tur");
    const aralik = Math.min(140, 2500 / kalan.length);
    kalan.forEach((p, i) => {
      hizliZaman.push(setTimeout(() => {
        if (p.durum === "bitti") return;
        yaziBitir(p.el);
        p.el.classList.remove("taslak");
        p.el.classList.add("insa");
        hizliZaman.push(setTimeout(() => { if (p.durum !== "bitti") { bitir(p, false); if (ses.acik) nota(Math.random()); } }, 220));
      }, i * aralik));
    });
    hizliZaman.push(setTimeout(() => {
      hizliMod = false; hizliZaman = [];
      if (faz !== 1) return;
      hepsiniBitir();
      kayit(null, "yapım bitti · planlama başlıyor");
      planlamaBasla();
    }, kalan.length * aralik + 450));
  }
  function hizliIptal() {
    hizliZaman.forEach(clearTimeout);
    hizliZaman = []; hizliMod = false;
  }
  function gizle() {
    hizliIptal();
    if (faz === 1) hepsiniBitir();
    yaziBitir();
    faz = 0;
    turAyarla(false);
    teslim = null; toplantilar = []; secimler = []; sonraSoz = [];
    toz = []; kivilcim = []; halkalar = [];
    document.querySelectorAll(".ajan-isaret").forEach((el) => el.classList.remove("ajan-isaret"));
    goster(false);
    hudMod("gizli");
    yaz("ajanlarKapali", "1");
  }
  function gosterTekrar() {
    yaz("ajanlarKapali", null);
    ajanlar.forEach((a) => durumYap(a, "yok"));
    goster(true);
    planlamaBasla();
  }
  function sesDegistir() {
    ses.acik = !ses.acik;
    yaz("ajanSes", ses.acik ? "1" : null);
    if (ses.acik) { sesHazirla(); ses.son = 0; nota(0.5); }
    sesButon();
  }

  const ajanBul = (el) => {
    const d = el && el.closest && el.closest(".ajan");
    return d ? ajanlar.find((a) => a.el === d) : null;
  };
  katman.addEventListener("click", (e) => {
    const a = ajanBul(e.target);
    if (a) { e.stopPropagation(); ajanTiklandi(a); }
  });
  katman.addEventListener("pointerover", (e) => {
    const a = ajanBul(e.target);
    if (a) { a.el.classList.add("uzerinde"); adGoster(a, true); }
  });
  katman.addEventListener("pointerout", (e) => {
    const a = ajanBul(e.target);
    if (!a || a.el.contains(e.relatedTarget)) return;
    a.el.classList.remove("uzerinde");
    if (!a.balonBitis && ["bos", "gez", "cember"].includes(a.durum)) adGoster(a, false);
  });
  mnkEl.addEventListener("click", (e) => { e.stopPropagation(); mnkTiklandi(); });

  hud.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const act = b.dataset.act;
    if (act === "atla") atla();
    if (act === "gizle") gizle();
    if (act === "goster") gosterTekrar();
    if (act === "tur") { turAyarla(!tur); if (tur) kayit(null, "tur açıldı · sayfa kendiliğinden kayıyor"); }
    if (act === "hiz") {
      hizNo = (hizNo + 1) % HIZLAR.length;
      K = HIZLAR[hizNo];
      b.textContent = K + "×";
      yaz("ajanHiz", K > 1 ? String(K) : null);
    }
    if (act === "ses") sesDegistir();
  });
  addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape" && faz === 1) atla();
    if ((e.key === "m" || e.key === "M") && faz) sesDegistir();
    if ((e.key === "t" || e.key === "T") && faz === 1) turAyarla(!tur);
  });
  // Ziyaretçi kendisi kaydırır / tıklar / dokunursa tur durur, kontrol ondadır
  function mudahale(e) {
    if (!tur || faz !== 1) return;
    if (e && e.target && e.target.closest && e.target.closest(".ajan-hud")) return;
    turAyarla(false);
    kayit(null, "ziyaretçi devraldı · tur durdu");
  }
  addEventListener("wheel", mudahale, { passive: true });
  // Telefonda dokunuş (ajana/MNK'ye dokunmak, yanlışlıkla değmek) turu durdurmaz;
  // ziyaretçi parmağıyla gerçekten kaydırırsa (12 px'ten fazla) durur.
  let dokunY = null;
  addEventListener("touchstart", (e) => { dokunY = e.touches[0] ? e.touches[0].clientY : null; }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (dokunY === null || !e.touches[0]) return;
    if (Math.abs(e.touches[0].clientY - dokunY) > 12) { dokunY = null; mudahale(e); }
  }, { passive: true });
  addEventListener("touchend", () => { dokunY = null; }, { passive: true });
  addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" || e.pointerType === "pen") mudahale(e); }, { passive: true });
  addEventListener("keydown", (e) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(e.key)) mudahale(e);
  });

  // Tarayıcı ses için kullanıcı etkileşimi ister: ses açıksa ilk tıklamada hazırla
  addEventListener("pointerdown", () => { if (ses.acik) sesHazirla(); }, { once: true, passive: true });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-ajan-kur]")) return;
    yaz("ajanlarKapali", null);
    scrollTo({ top: 0, behavior: "instant" });
    yapimBasla();
  });

  // Hep görünür olsunlar diye "kayarak belirme" efektini kapat
  document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));

  const canli = sessionStorage.getItem("canliYenile");
  sessionStorage.removeItem("canliYenile");
  const derinLink = location.hash && location.hash !== "#top";

  if (reduce) {
    // Hareket azaltma açıksa ajan yok, sayfa direkt hazır
    goster(false);
    hud.hidden = true;
    mnkKatman.hidden = true;
  } else if (oku("ajanlarKapali") === "1") {
    parcalar = topla();
    goster(false);
    hudMod("gizli");
  } else if (canli || derinLink) {
    // Canlı yenilemede ya da yazı linkinden gelince yapımı atla, direkt planlama
    parcalar = topla();
    goster(true);
    planlamaBasla();
  } else {
    yapimBasla();
  }
  root.classList.remove("boot");
  requestAnimationFrame(dongu);
})();
