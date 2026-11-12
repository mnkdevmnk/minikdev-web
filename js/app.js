/* İçeriği (js/content.js → window.SITE) sayfaya basar ve etkileşimleri kurar. */
(() => {
  const S = window.SITE;
  const $ = (s) => document.querySelector(s);
  const pad = (n) => String(n).padStart(2, "0");
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const tarih = (iso) => { const d = new Date(iso + "T00:00:00"); return `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}`; };
  const draftBadge = (o) => (o.draft ? '<span class="draft">TASLAK</span>' : "");

  /* ---------- HERO ---------- */
  $("#backdrop").textContent = S.backdrop;
  $("#hello").textContent = S.hero.hello;
  $("#name").textContent = S.hero.name;
  $("#role").textContent = S.hero.role;
  $("#lead").innerHTML = S.hero.lead;
  $("#photoBadge").textContent = S.hero.photoBadge;
  $("#navStatus").textContent = S.hero.status;

  // Fotoğraf varsa göster, yoksa yer tutucu kalsın
  if (S.hero.photo) {
    const img = new Image();
    img.alt = "Kayra";
    img.onload = () => {
      $("#portrait").prepend(img);
      // Giriş animasyonu için tarama çizgisi (style.css → .portrait .scan)
      img.insertAdjacentHTML("afterend", '<i class="scan" aria-hidden="true"></i>');
      $("#portrait").classList.add("has-img");
    };
    img.src = S.hero.photo;
  }

  /* ---------- GITHUB VERİSİ ----------
     Kaynak 1: js/github-data.js (tools/github-sync.py) → public repolar + private dahil commit toplamı.
     Kaynak 2: canlı GitHub API (sadece public, 30 dk önbellek) → yeni public repolar betik beklemeden gelir. */
  const G = S.github || {};
  const GH = window.GITHUB || { totals: null, repos: [] };
  let ghRepos = GH.repos.slice();

  function drawStats() {
    const commits = GH.totals ? GH.totals.commits : 0;
    $("#stats").innerHTML = [
      [S.posts.filter((p) => !p.draft).length, "Yazı"],   // taslaklar sayılmaz
      [allProjects().length + 1, "Proje"],
      commits ? [commits, "Commit"] : [S.media.length, "Platform"]
    ].map(([n, l]) => `<div><b>${n}</b>${l}</div>`).join("");
  }

  $("#now").innerHTML = S.now.map((n, i) => `
    <li class="rv"><span class="no">${pad(i + 1)}.</span><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p><span class="tag">${esc(n.tag)}</span></li>`).join("");

  $("#stack").innerHTML = S.stack.map((s) => `<li>${esc(s)}</li>`).join("");

  /* ---------- HAKKIMDA ---------- */
  $("#aboutEyebrow").textContent = S.about.eyebrow;
  $("#aboutTitle").textContent = S.about.title;
  $("#aboutText").innerHTML = S.about.paragraphs.map((p) => `<p>${p}</p>`).join("") +
    (S.about.quote ? `<blockquote>“${esc(S.about.quote)}”</blockquote>` : "");
  $("#principles").innerHTML = S.about.principles.map((p, i) => `
    <li><span class="no">${pad(i + 1)}</span><div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div></li>`).join("");

  /* ---------- FİLTRE YARDIMCISI ---------- */
  function filters(box, cats, items, getCat, onPick) {
    const all = ["Tümü", ...cats];
    box.innerHTML = all.map((c, i) => {
      const n = i === 0 ? items.length : items.filter((x) => getCat(x) === c).length;
      return `<button role="tab" aria-selected="${i === 0}" data-c="${esc(c)}">${esc(c)}<small>${n}</small></button>`;
    }).join("");
    // onclick (addEventListener değil): filtreler yeniden çizilince dinleyici birikmesin
    box.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", x === b));
      onPick(b.dataset.c === "Tümü" ? null : b.dataset.c);
    };
  }

  /* ---------- KAYDIRMALI ALAN (karusel) ----------
     Yazılar ve projeler yan yana slayt: parmakla / trackpad'le sağa-sola kaydırılır,
     altta ← → okları ve noktalar. Tek slayt varsa oklar gizli. */
  function kaydirKur(kok) {
    const iz = kok.querySelector(".kaydir-iz"), alt = kok.querySelector(".kaydir-alt"), nokta = kok.querySelector(".kaydir-nokta");
    const slaytlar = () => [...iz.children];
    const aktif = () => {
      const x = iz.scrollLeft;
      let iyi = 0, fark = Infinity;
      slaytlar().forEach((el, i) => { const d = Math.abs(el.offsetLeft - iz.offsetLeft - x); if (d < fark) { fark = d; iyi = i; } });
      return iyi;
    };
    const git = (i) => {
      const el = slaytlar()[Math.max(0, Math.min(slaytlar().length - 1, i))];
      if (el) iz.scrollTo({ left: el.offsetLeft - iz.offsetLeft, behavior: "smooth" });
    };
    function isaretle() {
      const i = aktif(), n = slaytlar().length;
      nokta.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", j === i));
      alt.querySelector('[data-yon="-1"]').disabled = i === 0;
      alt.querySelector('[data-yon="1"]').disabled = i === n - 1;
      slaytlar().forEach((el, j) => el.toggleAttribute("inert", j !== i && n > 1 && kok.dataset.inert === "1"));
    }
    function guncelle() {
      const n = slaytlar().length;
      alt.hidden = n < 2;
      kok.classList.toggle("tek", n < 2);
      nokta.innerHTML = slaytlar().map((_, i) => `<button type="button" aria-label="${i + 1}. slayt" data-i="${i}"></button>`).join("");
      isaretle();
    }
    let zaman = 0;
    iz.addEventListener("scroll", () => { cancelAnimationFrame(zaman); zaman = requestAnimationFrame(isaretle); }, { passive: true });
    alt.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.yon) git(aktif() + +b.dataset.yon);
      else git(+b.dataset.i);
    });
    kok.addEventListener("keydown", (e) => {
      if (e.target.closest('[role="tablist"], input, textarea')) return;
      if (e.key === "ArrowRight") { git(aktif() + 1); e.preventDefault(); }
      if (e.key === "ArrowLeft") { git(aktif() - 1); e.preventDefault(); }
    });
    addEventListener("resize", () => git(aktif()));
    return guncelle;
  }

  /* ---------- YAZILAR ---------- */
  // ESP32-S3-DevKitC-1 çizimi: kapak resmi olmayan "Donanım" yazısının kapağında görünür.
  // Solda 2 USB-C + BOOT/RST, ortada RGB LED, sağda WROOM modülü ve anten. LED ve sinyal hareketli (style.css → .esp).
  const ESP32_SVG = (() => {
    const pin = (y) => Array.from({ length: 22 }, (_, i) =>
      `<rect class="esp-pin" style="--i:${i}" x="${34 + i * 16.4}" y="${y}" width="8" height="8" rx="1.5"/>`).join("");
    return `
    <svg class="esp" viewBox="0 0 440 190" aria-hidden="true">
      <defs><filter id="espGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter></defs>
      <rect class="esp-pcb" x="14" y="24" width="398" height="142" rx="7"/>
      <g>${pin(32)}${pin(150)}</g>
      <path class="esp-trace" d="M60 70 H150 L170 90 H246"/>
      <path class="esp-trace" d="M60 122 H140 L160 104 H246"/>
      <path class="esp-trace" d="M128 95 H246"/>
      <path class="esp-sig" d="M60 70 H150 L170 90 H246"/>
      <path class="esp-sig b" d="M60 122 H140 L160 104 H246"/>
      <rect class="esp-usb" x="4" y="56" width="30" height="24" rx="6"/><rect class="esp-usb-in" x="9" y="63" width="20" height="10" rx="4"/>
      <rect class="esp-usb" x="4" y="110" width="30" height="24" rx="6"/><rect class="esp-usb-in" x="9" y="117" width="20" height="10" rx="4"/>
      <rect class="esp-btn" x="52" y="48" width="18" height="18" rx="2"/><circle class="esp-btn-c" cx="61" cy="57" r="5"/>
      <rect class="esp-btn" x="52" y="124" width="18" height="18" rx="2"/><circle class="esp-btn-c" cx="61" cy="133" r="5"/>
      <text class="esp-lbl" x="76" y="61">BOOT</text><text class="esp-lbl" x="76" y="137">RST</text>
      <rect class="esp-ic" x="92" y="84" width="22" height="22" rx="2"/>
      <circle class="esp-led-glow" cx="128" cy="95" r="10" filter="url(#espGlow)"/>
      <rect class="esp-led" x="122" y="89" width="12" height="12" rx="2"/>
      <circle class="esp-pwr" cx="196" cy="58" r="3"/>
      <rect class="esp-mod" x="246" y="50" width="158" height="90" rx="4"/>
      <rect class="esp-shield" x="252" y="56" width="112" height="78" rx="3"/>
      <text class="esp-chip" x="308" y="90">ESP32-S3</text>
      <text class="esp-lbl c" x="308" y="106">WROOM-1</text>
      <path class="esp-ant" d="M372 60 h24 v10 h-20 v10 h20 v10 h-20 v10 h20 v10 h-20 v10 h20 v10 h-24"/>
    </svg>`;
  })();

  /* ---------- SON COMMIT ÇİZİMLERİ ----------
     Öne çıkan yazının kapağı (kendi kapak resmi yoksa) en son commit atılan projenin
     ESP32 tarzındaki çizimini gösterir. Veri: github-data.js → son (tools/github-sync.py).
     Yeni repo eklemek: SON_PROJE'ye satır + gerekirse yeni çizim, betikte SON_COMMIT_TANINAN. */
  const CIZIM = {
    esp: () => ESP32_SVG,
    // Kişisel site: tarayıcı penceresi, kırmızı isim bloğu, taslak satırlar, gezen ajan imleçleri
    web: () => `
    <svg class="esp il" viewBox="0 0 440 190" aria-hidden="true">
      <rect class="esp-pcb" x="18" y="10" width="404" height="170" rx="10"/>
      <path class="esp-trace" d="M18 38 H422"/>
      <circle cx="36" cy="24" r="4" fill="#EF233C"/><circle cx="50" cy="24" r="4" fill="#fbbf24"/><circle class="esp-pwr" cx="64" cy="24" r="4"/>
      <rect class="esp-ic" x="96" y="17" width="210" height="14" rx="7"/><text class="esp-lbl" x="108" y="27">localhost:8643</text>
      <text class="esp-lbl" x="34" y="58">// 00.00 SEC_GIRIS</text>
      <rect x="34" y="66" width="168" height="34" fill="#EF233C"/><text class="il-ad" x="42" y="94">KAYRA.</text>
      <rect class="il-satir" x="34" y="110" width="210" height="6" rx="3"/><rect class="il-satir" x="34" y="122" width="176" height="6" rx="3"/>
      <rect class="il-satir" x="34" y="134" width="196" height="6" rx="3"/>
      <rect class="esp-mod" x="272" y="54" width="132" height="110" rx="4"/>
      <rect class="il-satir k" x="282" y="64" width="112" height="56" rx="2"/>
      <path class="esp-sig" d="M34 156 H404"/><path class="esp-trace" d="M34 156 H404"/>
      <rect class="il-satir" x="282" y="130" width="90" height="6" rx="3"/><rect class="il-satir" x="282" y="142" width="64" height="6" rx="3"/>
      <g class="il-imlec a"><path d="M0 0l11 4-5 2-2 5z" fill="#f472b6" stroke="#111217"/><rect x="9" y="9" width="22" height="9" rx="2" fill="#f472b6"/></g>
      <g class="il-imlec b"><path d="M0 0l11 4-5 2-2 5z" fill="#60a5fa" stroke="#111217"/><rect x="9" y="9" width="22" height="9" rx="2" fill="#60a5fa"/></g>
      <g class="il-imlec c"><path d="M0 0l11 4-5 2-2 5z" fill="#fbbf24" stroke="#111217"/><rect x="9" y="9" width="22" height="9" rx="2" fill="#fbbf24"/></g>
    </svg>`,
    // VSCodePad: iPad'de editör, renkli kod satırları, yanıp sönen imleç; USB-C'den karta sinyal
    ipad: () => `
    <svg class="esp il" viewBox="0 0 440 190" aria-hidden="true">
      <rect class="esp-shield" x="40" y="6" width="290" height="178" rx="16"/>
      <rect class="esp-pcb" x="52" y="18" width="266" height="154" rx="6"/>
      <rect class="esp-ic" x="52" y="18" width="62" height="154" rx="0"/>
      <rect class="il-satir" x="60" y="30" width="44" height="5" rx="2"/><rect class="il-satir k" x="66" y="42" width="38" height="5" rx="2"/>
      <rect class="il-satir" x="66" y="54" width="30" height="5" rx="2"/><rect class="il-satir" x="60" y="66" width="40" height="5" rx="2"/>
      <rect class="esp-mod" x="114" y="18" width="70" height="16" rx="0"/><text class="esp-lbl" x="122" y="29">main.cpp</text>
      <path class="esp-trace" d="M114 34 H318"/>
      <text class="esp-lbl" x="122" y="52">1</text><rect class="il-satir k" x="136" y="46" width="70" height="6" rx="2"/><rect class="il-satir" x="212" y="46" width="44" height="6" rx="2"/>
      <text class="esp-lbl" x="122" y="68">2</text><rect class="il-satir" x="148" y="62" width="96" height="6" rx="2"/>
      <text class="esp-lbl" x="122" y="84">3</text><rect class="il-satir y" x="148" y="78" width="60" height="6" rx="2"/><rect class="il-satir" x="214" y="78" width="70" height="6" rx="2"/>
      <text class="esp-lbl" x="122" y="100">4</text><rect class="il-satir" x="136" y="94" width="40" height="6" rx="2"/>
      <rect class="il-caret" x="180" y="92" width="2" height="10"/>
      <rect class="esp-mod" x="114" y="130" width="204" height="42" rx="0"/>
      <text class="esp-lbl" x="122" y="146">$ derle → esp32-s3</text><text class="esp-lbl" x="122" y="162" fill="#4ade80" style="fill:#4ade80">✓ yüklendi</text>
      <rect class="esp-usb" x="326" y="84" width="14" height="22" rx="4"/>
      <path class="esp-trace" d="M340 95 H372 V120 H392"/><path class="esp-sig" d="M340 95 H372 V120 H392"/>
      <rect class="esp-mod" x="392" y="100" width="40" height="40" rx="4"/><text class="esp-lbl c" x="412" y="124">S3</text>
      <circle class="esp-led-glow" cx="412" cy="108" r="5"/>
    </svg>`,
    // Rıhtım: Mac ekranı, genişleyip daralan çentik adası, menü çubuğu modülleri, zıplayan Dock simgesi
    mac: () => `
    <svg class="esp il" viewBox="0 0 440 190" aria-hidden="true">
      <rect class="esp-shield" x="36" y="4" width="368" height="166" rx="10"/>
      <rect class="esp-pcb" x="44" y="12" width="352" height="150" rx="4"/>
      <path class="esp-trace" d="M44 28 H396"/>
      <rect class="il-centik" x="185" y="12" width="70" height="14" rx="7"/>
      <text class="esp-lbl" x="54" y="23">Rıhtım</text>
      <rect class="il-satir k" x="318" y="17" width="20" height="6" rx="2"/><rect class="il-satir" x="344" y="17" width="16" height="6" rx="2"/><rect class="il-satir y" x="366" y="17" width="20" height="6" rx="2"/>
      <rect class="esp-mod" x="70" y="46" width="150" height="70" rx="5"/><rect class="il-satir" x="80" y="58" width="90" height="5" rx="2"/><rect class="il-satir" x="80" y="70" width="120" height="5" rx="2"/>
      <rect class="esp-mod" x="236" y="60" width="130" height="62" rx="5"/><rect class="il-satir k" x="246" y="72" width="70" height="5" rx="2"/>
      <path class="esp-trace" d="M80 104 L110 92 L140 98 L170 84 L200 90"/><path class="esp-sig" d="M80 104 L110 92 L140 98 L170 84 L200 90"/>
      <rect class="esp-ic" x="110" y="132" width="220" height="26" rx="9"/>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect class="il-dock${i === 3 ? " z" : ""}" x="${120 + i * 34}" y="137" width="22" height="17" rx="5"/>`).join("")}
      <path d="M190 170 h60 l8 14 h-76z" class="esp-shield"/>
    </svg>`,
    // claude-goz: film şeridi → kareler + transkript satırları
    goz: () => {
      const delik = (y) => Array.from({ length: 14 }, (_, i) =>
        `<rect class="esp-pin" style="--i:${i}" x="${30 + i * 17}" y="${y}" width="9" height="7" rx="1.5"/>`).join("");
      return `
    <svg class="esp il" viewBox="0 0 440 190" aria-hidden="true">
      <rect class="esp-pcb" x="20" y="22" width="254" height="146" rx="6"/>
      ${delik(30)}${delik(153)}
      ${[0, 1, 2].map((i) => `<rect class="esp-mod" x="${32 + i * 80}" y="48" width="70" height="94" rx="3"/>`).join("")}
      <path d="M58 82 l22 13 -22 13z" fill="#EF233C"/>
      <rect class="il-satir k" x="122" y="64" width="50" height="40" rx="2"/><rect class="il-satir" x="202" y="70" width="50" height="34" rx="2"/>
      <text class="esp-lbl" x="40" y="136">00:12</text><text class="esp-lbl" x="120" y="136">00:24</text><text class="esp-lbl" x="200" y="136">00:36</text>
      <path class="esp-trace" d="M274 95 H312"/><path class="esp-sig" d="M274 95 H312"/>
      <rect class="esp-shield" x="312" y="34" width="112" height="124" rx="5"/>
      <text class="esp-lbl" x="322" y="50">transkript.md</text>
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect class="il-satir${i === 2 ? " k" : ""}" x="322" y="${62 + i * 14}" width="${[88, 70, 80, 60, 84, 50][i]}" height="5" rx="2"/>`).join("")}
    </svg>`;
    }
  };
  const SON_PROJE = {
    "web-portfolio": ["web", "Bu site", "SİTE"],
    "VS_iPad": ["ipad", "VSCodePad", "VSCODEPAD"], "vs-ipad": ["ipad", "VSCodePad", "VSCODEPAD"],
    "rihtim": ["mac", "Rıhtım", "RIHTIM"], "rihtim-macos": ["mac", "Rıhtım", "RIHTIM"],
    "claude-goz": ["goz", "claude-goz", "GÖZ"],
    "esp32-projeler": ["esp", "esp32-projeler", "ESP32"]
  };
  const once = (iso) => {
    const dk = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000));
    if (dk < 2) return "az önce";
    if (dk < 60) return dk + " dk önce";
    if (dk < 60 * 24) return Math.round(dk / 60) + " sa önce";
    const g = Math.round(dk / 1440);
    return g === 1 ? "dün" : g + " gün önce";
  };
  // Rozetteki küçük ikonlar (çizimlerin minik hâli)
  const MINI = {
    web: '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M1.5 5.5h13"/>',
    ipad: '<rect x="3" y="1.5" width="10" height="13" rx="1.8"/><path d="M7 12.5h2"/>',
    mac: '<rect x="2" y="2.5" width="12" height="8" rx="1"/><path d="M1 13.5h14M6.5 2.5h3"/>',
    goz: '<rect x="1.5" y="3" width="13" height="10" rx="1"/><path d="M4 3v10M12 3v10M7 6.2l2.6 1.8L7 9.8z"/>',
    esp: '<rect x="4" y="4" width="8" height="8" rx="1"/><path d="M6 1.5v2.5M10 1.5v2.5M6 12v2.5M10 12v2.5M1.5 6h2.5M1.5 10h2.5M12 6h2.5M12 10h2.5"/>'
  };
  const SON = GH.son && SON_PROJE[GH.son.repo] ? { p: SON_PROJE[GH.son.repo], t: GH.son.pushedAt } : null;
  // Son commit rozeti: yazının kapağı yazının konusunu gösterir, son commit sadece bu küçük rozette
  const sonCommitRozet = () => SON ? `<b class="son-commit" title="GitHub'da en son commit attığım proje">` +
    `<svg viewBox="0 0 16 16" aria-hidden="true">${MINI[SON.p[0]]}</svg>SON COMMIT · ${esc(SON.p[1])} · ${once(SON.t)}</b>` : "";
  // Fotoğraftaki "şu an" rozeti de GitHub'da en son commit atılan projeyi gösterir
  if (SON) $("#photoBadge").textContent = `ŞU AN ÜSTÜNE ÇALIŞTIĞIM: ${SON.p[1].toLocaleUpperCase("tr")}`;

  // Taslaklar (draft: true) sadece kendi bilgisayarında görünür; yayında listede de okuyucuda da yoklar.
  const YEREL = ["localhost", "127.0.0.1", ""].includes(location.hostname);
  const posts = S.posts.filter((p) => YEREL || !p.draft).sort((a, b) => b.date.localeCompare(a.date));
  const featured = posts.find((p) => p.featured) || posts[0];
  const rest = posts.filter((p) => p !== featured);

  const meta = (p) => `<div class="post-meta"><span>${tarih(p.date)}</span><span>${p.read} dk okuma</span>${draftBadge(p)}</div>`;

  // Öne çıkan yazı ilk slayt, diğerleri tarih sırasıyla yanında; sağa-sola kaydırılarak gezilir
  const yaziSlayt = (p, i) => `
    <article class="featured card" tabindex="0" data-slug="${esc(p.slug)}"${i === 0 ? ' id="featuredPost"' : ""}>
      <div class="cover">${(() => {
        if (p.cover) return `<img src="${esc(p.cover)}" alt="" loading="lazy"><span>${esc(p.category)}</span>`;
        // Kapak çizimi yazının konusuna göre: content.js → cizim ("esp", "ipad", "mac", "web", "goz"); Donanım → ESP32
        const c = CIZIM[p.cizim] || (p.category === "Donanım" ? CIZIM.esp : null);
        return `${c ? c() : ""}${i === 0 ? sonCommitRozet() : ""}<span>${esc(p.category)}</span>`;
      })()}</div>
      <div class="featured-body">
        <span class="pill">${p === featured ? "ÖNE ÇIKAN · " : ""}${esc(p.category.toUpperCase())}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.excerpt)}</p>
        ${meta(p)}
        <span class="read-more">OKU →</span>
      </div>
    </article>`;
  if (featured) {
    $("#postKaydir .kaydir-iz").innerHTML = [featured, ...rest].map(yaziSlayt).join("");
    kaydirKur($("#postKaydir"))();
  } else $("#postKaydir").hidden = true;

  const usedCats = S.categories.filter((c) => rest.some((p) => p.category === c));
  function drawPosts(cat) {
    const list = cat ? rest.filter((p) => p.category === cat) : rest;
    $("#postGrid").innerHTML = list.length ? list.map((p) => `
      <article class="post card" tabindex="0" data-slug="${p.slug}">
        <span class="code">#${esc(p.category.toUpperCase())}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.excerpt)}</p>
        ${meta(p)}
      </article>`).join("") : `<div class="empty">Bu kategoride henüz yazı yok.</div>`;
  }
  // Bütün yazılar yukarıdaki kaydırmalı alanda. Izgara + filtre sadece yazı çoğalınca (8+) altta da çıkar.
  if (posts.length >= 8) {
    filters($("#postFilters"), usedCats, rest, (p) => p.category, drawPosts);
    drawPosts(null);
  } else {
    $("#postFilters").hidden = true;
    $("#postGrid").hidden = true;
  }

  /* ---------- OKUYUCU (#yazi/slug) ---------- */
  const reader = $("#reader");
  let lastFocus = null;
  const ANA_BASLIK = document.title;
  // Okuma ilerleme çubuğu (okuyucunun en üstünde, kırmızı)
  reader.insertAdjacentHTML("afterbegin", '<div class="reader-bar" aria-hidden="true"><i></i></div>');
  const bar = reader.querySelector(".reader-bar i");
  reader.addEventListener("scroll", () => {
    const max = reader.scrollHeight - reader.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? reader.scrollTop / max : 1})`;   // tek ekranlık yazı: dolu
  }, { passive: true });

  // Paylaşılacak link: yayınlanmış yazının kendi sayfası (önizleme kartı orada), taslaksa bu sayfanın adresi
  const kaliciLink = (p) => p.draft ? location.href : `${location.origin}/yazi/${p.slug}/`;

  function openPost(slug) {
    const i = posts.findIndex((x) => x.slug === slug);
    const p = posts[i];
    if (!p) return closePost();
    if (reader.hidden) lastFocus = document.activeElement;
    const sonraki = posts[i + 1] || null;   // liste yeniden eskiye: sonraki = bir önceki tarihli yazı
    $("#readerBody").innerHTML = `
      <span class="pill">${esc(p.category.toUpperCase())}</span>
      <h1 id="readerTitle">${esc(p.title)}</h1>
      ${meta(p)}
      <p class="lede">${esc(p.excerpt)}</p>
      <div class="body">${p.body}</div>
      <footer class="reader-end">
        ${sonraki ? `<a class="next card" href="#yazi/${esc(sonraki.slug)}">
          <span class="eyebrow">SONRAKİ YAZI →</span><b>${esc(sonraki.title)}</b><small>${esc(sonraki.excerpt)}</small></a>` : ""}
        <div class="reader-actions">
          <button class="btn" type="button" data-tum>← TÜM YAZILAR</button>
          <button class="btn ghost" type="button" data-link>LİNKİ KOPYALA</button>
        </div>
      </footer>`;
    $("#readerBody [data-tum]").onclick = () => $("#readerClose").click();
    $("#readerBody [data-link]").onclick = async () => {
      const url = kaliciLink(p);
      try { await navigator.clipboard.writeText(url); toast("Link kopyalandı"); } catch { toast(url); }
    };
    document.title = `${p.title} · ${ANA_BASLIK}`;
    reader.hidden = false;
    reader.scrollTop = 0;
    bar.style.transform = "scaleX(0)";
    document.body.style.overflow = "hidden";
    $("#readerClose").focus();
  }
  function closePost() {
    reader.hidden = true;
    document.title = ANA_BASLIK;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  function route() {
    const m = location.hash.match(/^#yazi\/(.+)$/);
    m ? openPost(decodeURIComponent(m[1])) : (!reader.hidden && closePost());
  }
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-slug]");
    if (c) location.hash = "yazi/" + c.dataset.slug;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.dataset && e.target.dataset.slug) location.hash = "yazi/" + e.target.dataset.slug;
    if (e.key === "Escape" && !reader.hidden) $("#readerClose").click();
  });
  $("#readerClose").addEventListener("click", () => {
    history.pushState("", "", location.pathname + location.search + "#yazilar");
    closePost();
  });
  window.addEventListener("hashchange", route);
  route();

  /* ---------- PROJELER ---------- */
  const F = S.projects.featured;
  $("#flagship").innerHTML = `
    <div class="flag-top"><span class="pill">${esc(F.label)}</span><span class="flag-meta">${esc(F.meta)}</span></div>
    <h3>${esc(F.title)}</h3>
    <p>${esc(F.text)}</p>
    <div class="flag-stats">${F.stats.map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join("")}</div>
    <div class="layers-head"><span>${F.layers.length} KATMANLI YAPI</span><span>İncelemek için bir katmana tıkla</span></div>
    <div class="layers">
      <div class="layer-tabs" role="tablist">${F.layers.map((l, i) =>
        `<button role="tab" aria-selected="${i === 0}" data-i="${i}">K${i + 1}: ${esc(l.name)}</button>`).join("")}</div>
      <div class="layer-panel" id="layerPanel" role="tabpanel"></div>
    </div>`;
  function drawLayer(i) {
    const l = F.layers[i];
    $("#layerPanel").innerHTML = `
      <p class="eyebrow">KATMAN ${pad(i + 1)} // ${esc(l.name.toUpperCase())}</p>
      <h4>${esc(l.title)}</h4><p>${esc(l.text)}</p>
      <div class="tags">${l.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`;
  }
  $("#flagship .layer-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $("#flagship .layer-tabs").querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", x === b));
    drawLayer(+b.dataset.i);
  });
  drawLayer(0);

  /* Manuel projeler + public GitHub repoları → tek liste.
     Manuel kartta repo: varsa birleşir (senin metnin kalır, GitHub bilgisi eklenir).
     Hiçbir manuel karta / öne çıkana bağlı olmayan public repo kendi başına kart olur. */
  const findRepo = (name) => ghRepos.find((r) => r.name.toLowerCase() === String(name || "").toLowerCase());
  const hidden = new Set((G.hide || []).map((x) => x.toLowerCase()));
  const GUN = 864e5;

  function allProjects() {
    const claimed = new Set([F.repo, ...S.projects.list.map((p) => p.repo)].filter(Boolean).map((x) => x.toLowerCase()));
    const manual = S.projects.list.map((p) => {
      const r = p.repo && findRepo(p.repo);
      if (!r) return { ...p, source: "manual" };
      const tags = [...(p.tags || [])];
      if (r.language && !tags.includes(r.language)) tags.unshift(r.language);
      return { ...p, tags, text: p.text || r.description, gh: r, source: "both" };
    });
    const auto = ghRepos
      .filter((r) => !claimed.has(r.name.toLowerCase()) && !hidden.has(r.name.toLowerCase()))
      .map((r) => ({
        title: r.name,
        cat: (G.cat || {})[r.name] || "GitHub",
        text: (G.text || {})[r.name] || r.description || "Açıklama yok.",
        tags: [r.language, ...(r.topics || [])].filter(Boolean).slice(0, 4),
        status: r.archived ? "paused" : (Date.now() - new Date(r.pushedAt) < 30 * GUN ? "active" : ""),
        gh: r,
        source: "github"
      }));
    return [...manual, ...auto];
  }

  const DURUM = { live: "ÇALIŞIYOR", wip: "YAPIM AŞAMASINDA", paused: "ASKIDA", active: "AKTİF" };
  const ghLine = (r) => r ? `
        <div class="proj-gh">
          <span>${r.commits != null ? `<b>${r.commits}</b> commit` : "GitHub"}</span>
          ${r.stars ? `<span>★ ${r.stars}</span>` : ""}
          <span>güncellendi ${tarih(r.pushedAt.slice(0, 10))}</span>
        </div>` : "";
  const ghLink = (r) => r ? `<a class="proj-link" href="${esc(r.url)}" target="_blank" rel="noopener" aria-label="${esc(r.name)} GitHub'da">KOD ↗</a>` : "";

  // Diğer projeler: öne çıkan projenin tarzında slayt (GitHub sayıları kutucuklarda)
  const projSlayt = (p) => {
    const r = p.gh;
    const stats = r ? [
      [r.commits != null ? r.commits : "—", "Commit"],
      [r.language || "—", "Dil"],
      [r.stars || 0, "Yıldız"],
      [tarih(r.pushedAt.slice(0, 10)), "Son güncelleme"]
    ] : [];
    return `
    <article class="flagship card proj-slayt">
      <div class="flag-top"><span class="pill${p.status ? " " + p.status : ""}">${DURUM[p.status] || esc(p.cat.toUpperCase())}</span>
        <span class="flag-meta">${esc(p.cat)}${r ? ` · <a href="${esc(r.url)}" target="_blank" rel="noopener">GitHub ↗</a>` : ""}</span></div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.text)}</p>
      ${stats.length ? `<div class="flag-stats">${stats.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>` : ""}
      <div class="tags">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
    </article>`;
  };
  const projKaydir = kaydirKur($("#projKaydir"));

  let projList = [], projCat = null;
  function drawProjects(cat) {
    projCat = cat;
    const list = cat ? projList.filter((p) => p.cat === cat) : projList;
    $("#projGrid").innerHTML = list.map((p) => `
      <article class="proj card">
        <div class="proj-top"><span>#PRJ-${pad(projList.indexOf(p) + 1)} · ${esc(p.cat)}</span>${ghLink(p.gh)}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.text)}</p>
        ${DURUM[p.status] ? `<span><span class="pill ${p.status}">${DURUM[p.status]}</span></span>` : ""}
        <div class="tags">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
        ${ghLine(p.gh)}
      </article>`).join("");
  }
  function drawGitHub() {
    const fr = F.repo && findRepo(F.repo);
    $("#flagship .flag-meta").innerHTML = esc(F.meta) + (fr ? ` · <a href="${esc(fr.url)}" target="_blank" rel="noopener">${fr.commits != null ? fr.commits + " commit · " : ""}GitHub ↗</a>` : "");
    const T = GH.totals;
    const user = G.user || GH.user;
    $("#ghStrip").innerHTML = user ? `
      <a href="https://github.com/${esc(user)}" target="_blank" rel="noopener">GITHUB // @${esc(user)} ↗</a>
      ${T ? `<span><b>${T.commits}</b> commit <small>(${T.publicCommits} public + ${T.privateCommits} private)</small></span>
      <span><b>${ghRepos.length}</b> public · <b>${T.privateRepos}</b> private repo</span>
      <span class="dim">senkron ${tarih(GH.generatedAt.slice(0, 10))}</span>` : `<span><b>${ghRepos.length}</b> public repo</span>`}` : "";
    $("#ghStrip").hidden = !user;
  }
  function renderProjects() {
    projList = allProjects();
    // VSCodePad'in yanına diğer projeler slayt olarak dizilir (öne çıkan slayt yerinde kalır, katmanları bozulmaz)
    const iz = $("#projKaydir .kaydir-iz");
    iz.querySelectorAll(".proj-slayt").forEach((el) => el.remove());
    iz.insertAdjacentHTML("beforeend", projList.map(projSlayt).join(""));
    projKaydir();
    // Izgara + filtre sadece proje çoğalınca (8+) altta da çıkar
    const cok = projList.length >= 8;
    $("#projFilters").hidden = $("#projGrid").hidden = !cok;
    if (cok) {
      const cats = [...new Set(projList.map((p) => p.cat))];
      filters($("#projFilters"), cats, projList, (p) => p.cat, drawProjects);
      drawProjects(null);
    }
    drawGitHub();
    drawStats();
  }
  renderProjects();

  // Canlı GitHub: yeni public repo eklendiyse ya da açıklama/yıldız değiştiyse günceller
  async function liveGitHub() {
    if (!G.live || !G.user) return;
    const KEY = "gh-canli-" + G.user;
    let data = null;
    try { const c = JSON.parse(localStorage.getItem(KEY)); if (c && Date.now() - c.t < 30 * 60e3) data = c.d; } catch {}
    if (!data) {
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(G.user)}/repos?per_page=100&sort=pushed`);
        if (!res.ok) return;
        data = (await res.json()).filter((r) => !r.fork && !r.private).map((r) => ({
          name: r.name, description: r.description || "", language: r.language || "", topics: r.topics || [],
          stars: r.stargazers_count, pushedAt: r.pushed_at, homepage: r.homepage || "", url: r.html_url, archived: r.archived
        }));
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: data })); } catch {}
      } catch { return; }
    }
    // Commit sayısı canlı API'de yok: anlık görüntüden taşınır, yeni repoda boş kalır
    const merged = data.map((r) => ({ ...r, commits: (GH.repos.find((x) => x.name === r.name) || {}).commits ?? null }));
    const imza = (l) => JSON.stringify(l.map((r) => [r.name, r.description, r.language, r.stars, r.pushedAt]).sort());
    if (imza(merged) === imza(ghRepos)) return;
    ghRepos = merged;
    renderProjects();
  }
  liveGitHub();

  /* ---------- AJAN HATTI ---------- */
  const A = S.pipeline.agents;
  $("#agents").innerHTML = A.map((a) => `
    <li data-id="${a.id}"><span class="av">${esc(a.name.slice(0, 2).toUpperCase())}</span><div><h4>${esc(a.name)}</h4><p>${esc(a.role)}</p></div></li>`).join("");
  const term = $("#termBody");
  let step = 0, timer = null;
  const saat = () => new Date().toTimeString().slice(0, 8);
  function tick() {
    const [id, msg] = S.pipeline.log[step % S.pipeline.log.length];
    const ag = A.find((a) => a.id === id);
    if (step % S.pipeline.log.length === 0 && step > 0) term.innerHTML = "";
    const li = document.createElement("li");
    li.innerHTML = `<span class="t">${saat()}</span><span class="a">${esc(ag.name.toLowerCase())}</span>${esc(msg)}`;
    term.append(li);
    while (term.children.length > 9) term.firstElementChild.remove();
    document.querySelectorAll("#agents li").forEach((x) => x.classList.toggle("on", x.dataset.id === id));
    step++;
  }
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { S.pipeline.log.forEach(() => tick()); }
  else if ("IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) { tick(); timer = setInterval(tick, 1600); }
      else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
    }).observe($("#hat"));
  } else { timer = setInterval(tick, 1600); }

  /* ---------- MEDYA ---------- */
  const ICON = {
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
    insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor"/>',
    play: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor"/>',
    x: '<path d="M4 4l16 16M20 4L4 20"/>',
    in: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-7M12 13a3 3 0 0 1 6 0v4"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ICON.code}</svg>`;
  $("#mediaGrid").innerHTML = S.media.map((m) => {
    const inner = `<span class="ic">${svg(m.icon)}</span><div><h3>${esc(m.platform)}</h3><p>${esc(m.handle)} · ${esc(m.desc)}</p></div>`;
    return m.url
      ? `<a class="media card rv" href="${esc(m.url)}" target="_blank" rel="noopener">${inner}<span class="arrow">↗</span></a>`
      : `<div class="media card todo rv">${inner}<span class="arrow">EKLENECEK</span></div>`;
  }).join("");

  /* ---------- İLETİŞİM ---------- */
  const C = S.contact;
  $("#contactEyebrow").textContent = C.eyebrow;
  $("#contactTitle").textContent = C.title;
  $("#contactText").textContent = C.text;
  const mail = $("#mail"), copy = $("#copyMail");
  if (C.email) {
    mail.innerHTML = `<a href="mailto:${esc(C.email)}">${esc(C.email)}</a>`;
    if (C.email2) mail.insertAdjacentHTML("afterend",
      `<span class="mail alt"><a href="mailto:${esc(C.email2)}">${esc(C.email2)}</a></span>`);
  } else { mail.textContent = "e-posta eklenecek"; mail.classList.add("todo"); copy.disabled = true; }
  // Doğrudan mesaj butonları (content.js → contact.dm)
  if (C.dm && C.dm.length) {
    $(".contact-row").insertAdjacentHTML("afterend", `<div class="dm-row">${C.dm.map((d) =>
      `<a class="btn ghost dm" href="${esc(d.url)}" target="_blank" rel="noopener">${svg(d.icon)}${esc(d.label)} ↗</a>`).join("")}</div>`);
  }
  copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(C.email); toast("E-posta kopyalandı"); }
    catch { toast(C.email); }
  });
  function toast(t) {
    const el = $("#toast"); el.textContent = t; el.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 1800);
  }
  $("#year").textContent = new Date().getFullYear();

  /* ---------- KAYARAK BELİRME + AKTİF MENÜ ---------- */
  document.querySelectorAll(".rv").forEach((el) => {
    if (reduce || !("IntersectionObserver" in window)) return el.classList.add("in");
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } }, { rootMargin: "0px 0px -8% 0px" });
    io.observe(el);
  });
  const links = [...document.querySelectorAll(".side ul a")];
  const secs = links.map((a) => document.querySelector(a.getAttribute("href")));
  const aktifMenu = () => {
    const y = scrollY + innerHeight * 0.35;
    let cur = -1;
    secs.forEach((s, i) => { if (s && s.offsetTop <= y) cur = i; });
    links.forEach((a, i) => a.classList.toggle("on", i === cur));
  };
  addEventListener("scroll", aktifMenu, { passive: true });
  aktifMenu();

  /* ---------- SOLDAN KAYAN MENÜ ---------- */
  const root = document.documentElement;
  const side = $("#side"), scrim = $("#sideScrim"), acBtn = $("#sideOpen");
  const acik = () => root.classList.contains("side-open");
  const menuAc = () => {
    if (acik()) return;
    root.classList.add("side-open");
    side.inert = false;
    acBtn.setAttribute("aria-expanded", "true");
    (side.querySelector("a.on") || side.querySelector("ul a")).focus({ preventScroll: true });
  };
  const menuKapa = (odak = true) => {
    if (!acik()) return;
    root.classList.remove("side-open");
    side.inert = true;
    acBtn.setAttribute("aria-expanded", "false");
    if (odak) acBtn.focus({ preventScroll: true });
  };
  acBtn.addEventListener("click", menuAc);
  $("#sideClose").addEventListener("click", () => menuKapa());
  scrim.addEventListener("click", () => menuKapa());
  // Bağlantıya basınca menü kapanır, sayfa o bölüme kayar
  side.addEventListener("click", (e) => { if (e.target.closest("a")) menuKapa(false); });
  // Esc menüyü kapatır (ajanların "Atla" kısayoluna gitmesin diye yayılımı durdur)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && acik()) { e.stopPropagation(); menuKapa(); }
  });

  // Dokunmatik: sol kenardan sağa kaydır → aç, açıkken sola kaydır → kapat. Menü parmağı izler.
  const KENAR = 24, ESIK = 0.35;
  let d = null;
  const genislik = () => side.getBoundingClientRect().width;
  addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || !$("#reader").hidden) return;
    const t = e.touches[0];
    if (acik() || t.clientX <= KENAR) d = { x0: t.clientX, y0: t.clientY, acikti: acik(), w: genislik(), yatay: null, dx: 0 };
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (!d) return;
    const t = e.touches[0];
    const dx = t.clientX - d.x0, dy = t.clientY - d.y0;
    if (d.yatay === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.yatay = Math.abs(dx) > Math.abs(dy);
      if (!d.yatay) { d = null; return; }
      side.classList.add("surukle"); scrim.classList.add("surukle");
      side.inert = false;
    }
    d.dx = dx;
    const poz = d.acikti ? Math.min(0, dx) : Math.min(0, dx - d.w); // -w (kapalı) … 0 (açık)
    side.style.transform = `translateX(${poz}px)`;
    scrim.style.opacity = String(1 + poz / d.w);
    scrim.style.pointerEvents = "auto";
  }, { passive: true });
  const birak = () => {
    if (!d) return;
    const { dx, w, acikti, yatay } = d;
    d = null;
    if (!yatay) return;
    side.classList.remove("surukle"); scrim.classList.remove("surukle");
    side.style.transform = scrim.style.opacity = scrim.style.pointerEvents = "";
    if (acikti) { dx < -w * ESIK ? menuKapa(false) : (side.inert = false); }
    else { dx > w * ESIK ? menuAc() : (side.inert = true); }
  };
  addEventListener("touchend", birak);
  addEventListener("touchcancel", birak);

  /* ---------- SEKMELER: ok tuşlarıyla gezinme ----------
     Filtreler ve proje katmanları role="tab". ← → bir sonrakine/öncekine, Home/End ilk/son sekmeye gider ve seçer. */
  document.addEventListener("keydown", (e) => {
    const t = e.target.closest && e.target.closest('[role="tab"]');
    if (!t || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const liste = [...t.parentElement.querySelectorAll('[role="tab"]')];
    const i = liste.indexOf(t);
    const j = e.key === "Home" ? 0 : e.key === "End" ? liste.length - 1
      : (i + (e.key === "ArrowRight" ? 1 : -1) + liste.length) % liste.length;
    e.preventDefault();
    liste[j].focus();
    liste[j].click();
  });

  /* ---------- İÇERİĞE GEÇ (klavyeyle gelenler menüyü atlasın) ---------- */
  document.body.insertAdjacentHTML("afterbegin", '<a class="skip" href="#hakkimda">İçeriğe geç</a>');

  /* ---------- ALT BİLGİ: bağlantılar + yukarı çık ---------- */
  const footLinks = S.media.filter((m) => m.url).map((m) =>
    `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.platform)}</a>`);
  footLinks.push('<a href="feed.xml">RSS</a>');
  $(".foot").insertAdjacentHTML("beforeend",
    `<nav class="foot-links" aria-label="Bağlantılar">${footLinks.join("")}<a href="#top" class="foot-top">YUKARI ↑</a></nav>`);
})();
