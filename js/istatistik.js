/* YÖNETİCİ › İSTATİSTİK
   Kaç kişi geldi, kaç sayfa görüntülendi, nelere tıklandı. Veri: /api/sayac (GET).
   - Canlı sitede: Vercel fonksiyonu (api/sayac.js), giriş anahtarıyla.
   - Kendi bilgisayarında (localhost:8643): YEREL = tools/sunucu.py'nin .sayac.json'u,
     CANLI = yayındaki sitenin sayacı.
   Anahtar girişte üretilir (yonetici.js › sayacAnahtar). */
(() => {
  const CANLI = "https://minikdev-web.vercel.app/api/sayac/";
  const yerel = ["localhost", "127.0.0.1"].includes(location.hostname) && location.port !== "8644";
  const btn = document.getElementById("adminStat");
  if (!btn || document.getElementById("adminBox").hidden) return;

  const ss = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const say = (n) => Number(n || 0).toLocaleString("tr-TR");
  const AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const tarih = (g) => { const [, a, d] = g.split("-"); return `${+d} ${AY[+a - 1]}`; };

  let kaynak = yerel ? "yerel" : "canli", oncekiOdak = null;

  const p = document.createElement("div");
  p.className = "editor istat";
  p.id = "istatistik";
  p.hidden = true;
  p.setAttribute("role", "dialog");
  p.setAttribute("aria-modal", "true");
  p.setAttribute("aria-label", "Site istatistikleri");
  p.innerHTML = `
    <div class="editor-bar">
      <p class="editor-title"><span>//</span> İSTATİSTİK</p>
      <span class="editor-durum" id="isDurum" aria-live="polite"></span>
      ${yerel ? `<div class="istat-kaynak" role="group" aria-label="Veri kaynağı">
        <button class="btn ghost" type="button" data-is="yerel" aria-pressed="true">YEREL</button>
        <button class="btn ghost" type="button" data-is="canli" aria-pressed="false">CANLI</button>
      </div>` : ""}
      <button class="btn ghost" type="button" data-is="yenile">YENİLE</button>
      <button class="btn ghost" type="button" data-is="kapat" aria-label="İstatistiği kapat">✕</button>
    </div>
    <div class="istat-govde" id="isGovde"></div>`;
  document.body.append(p);
  const govde = p.querySelector("#isGovde"), durum = p.querySelector("#isDurum");
  const durumYaz = (t, tur = "") => { durum.textContent = t; durum.className = "editor-durum" + (tur ? " " + tur : ""); };

  const KURULUM = `<div class="istat-bos">
    <p><b>Canlı sayaç henüz kurulmadı.</b> Bir kez yapılacak:</p>
    <ol>
      <li>Vercel › proje › <b>Storage</b> › <b>Upstash for Redis</b> › Create &amp; Connect (ücretsiz).</li>
      <li>Terminal: <code>printf 'sayac|kullanici:sifre' | shasum -a 256</code> (yönetici kullanıcı adı ve şifresiyle).</li>
      <li>Vercel › Settings › Environment Variables › <code>ISTATISTIK_ANAHTARI</code> = çıkan uzun yazı.</li>
      <li>Redeploy, sonra burada ÇIKIŞ yapıp tekrar gir.</li>
    </ol></div>`;

  function liste(baslik, satirlar, bos) {
    const enCok = Math.max(1, ...satirlar.map((s) => s[1]));
    return `<section class="istat-liste">
      <p class="istat-etiket">// ${baslik}</p>
      ${satirlar.length ? `<ol>${satirlar.map(([ad, n]) => `
        <li><span class="ad" title="${esc(ad)}">${esc(ad)}</span><b>${say(n)}</b>
        <i style="width:${(n / enCok) * 100}%" aria-hidden="true"></i></li>`).join("")}</ol>`
      : `<p class="istat-yok">${bos}</p>`}
    </section>`;
  }

  function ciz(v) {
    const g = v.gunler, bugun = g[g.length - 1], son7 = g.slice(-7);
    const top = (a, k) => a.reduce((t, x) => t + x[k], 0);
    const kutular = [
      ["BUGÜN", bugun.u, bugun.z, bugun.t],
      ["SON 7 GÜN", v.u7, top(son7, "z"), top(son7, "t")],
      ["SON 30 GÜN", v.u30, top(g, "z"), top(g, "t")],
      ["TOPLAM", v.tum.u, v.tum.z, v.tum.t]
    ];
    const enCok = Math.max(1, ...g.map((x) => x.u));
    govde.innerHTML = `
      <div class="istat-kutular">${kutular.map(([ad, u, z, t]) => `
        <div class="istat-kutu">
          <p class="istat-etiket">${ad}</p>
          <p class="istat-sayi">${say(u)}<small>kişi</small></p>
          <p class="istat-alt">${say(z)} görüntüleme · ${say(t)} tıklama</p>
        </div>`).join("")}
      </div>
      <section class="istat-grafik">
        <p class="istat-etiket">// SON 30 GÜN · GÜNLÜK KİŞİ</p>
        <div class="istat-cubuklar" role="img" aria-label="Son 30 günde günlük ziyaretçi sayısı; bugün ${say(bugun.u)} kişi">
          ${g.map((x) => `<div class="istat-cubuk" tabindex="0" data-ip="${tarih(x.gun)} · ${say(x.u)} kişi · ${say(x.z)} görüntüleme · ${say(x.t)} tıklama">
            <i style="height:${x.u ? Math.max(3, (x.u / enCok) * 100) : 0}%"></i></div>`).join("")}
        </div>
        <div class="istat-eksen"><span>${tarih(g[0].gun)}</span><span>en çok ${say(enCok)} kişi</span><span>bugün</span></div>
      </section>
      <div class="istat-listeler">
        ${liste("EN ÇOK TIKLANANLAR", v.hedef, "Henüz tıklama yok.")}
        ${liste("EN ÇOK BAKILAN SAYFALAR", v.sayfa, "Henüz ziyaret yok.")}
        ${liste("NEREDEN GELDİLER", v.kaynak, "Hepsi doğrudan geldi (ya da kaynak gizli).")}
      </div>
      <p class="istat-not">Kişi = farklı tarayıcı (aynı kişi telefondan ve bilgisayardan girerse 2 sayılır). Senin tarayıcın sayılmaz. IP ya da kişisel bilgi tutulmaz.</p>`;
  }

  async function yukle() {
    durumYaz("yükleniyor…");
    const url = kaynak === "yerel" ? "/api/sayac/" : (yerel ? CANLI : "/api/sayac/");
    const anahtar = ss("sayacAnahtar");
    if (kaynak === "canli" && !anahtar) {
      govde.innerHTML = `<div class="istat-bos"><p>Anahtar yok: <b>ÇIKIŞ</b> yapıp tekrar giriş yap.</p></div>`;
      return durumYaz("giriş yenilenmeli", "hata");
    }
    try {
      const r = await fetch(url, { cache: "no-store", headers: anahtar ? { "x-anahtar": anahtar } : {} });
      const j = await r.json().catch(() => ({}));
      if (r.status === 503 || r.status === 404) { govde.innerHTML = KURULUM; return durumYaz("sayaç kurulmadı", "degisti"); }
      if (r.status === 401) {
        govde.innerHTML = `<div class="istat-bos"><p><b>Anahtar tutmadı.</b> Vercel'deki <code>ISTATISTIK_ANAHTARI</code> ile giriş bilgisi aynı mı? Şifre değiştiyse anahtarı yeniden üret.</p></div>`;
        return durumYaz("yetki yok", "hata");
      }
      if (!r.ok) throw new Error(j.hata || "HTTP " + r.status);
      ciz(j);
      durumYaz((kaynak === "yerel" ? "yerel test verisi" : "canlı site") + " · " + new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }), "ok");
    } catch (err) {
      if (kaynak === "canli") { govde.innerHTML = KURULUM; return durumYaz("canlı sayaca ulaşılamadı", "degisti"); }
      durumYaz("okunamadı: " + err.message + " (sunucuyu yeniden başlat: python3 tools/sunucu.py)", "hata");
    }
  }

  function ac() {
    if (ss("yonetici") !== "1") return;
    if (document.documentElement.classList.contains("side-open")) document.getElementById("sideClose").click();
    oncekiOdak = document.activeElement;
    p.hidden = false;
    document.documentElement.classList.add("editor-acik");
    p.querySelector('[data-is="kapat"]').focus({ preventScroll: true });
    yukle();
  }
  function kapa() {
    if (p.hidden) return;
    p.hidden = true;
    document.documentElement.classList.remove("editor-acik");
    if (oncekiOdak && oncekiOdak.isConnected) oncekiOdak.focus({ preventScroll: true });
  }

  btn.addEventListener("click", ac);
  p.addEventListener("click", (e) => {
    const b = e.target.closest("[data-is]");
    if (!b) return;
    const is = b.dataset.is;
    if (is === "kapat") return kapa();
    if (is === "yenile") return yukle();
    kaynak = is;
    p.querySelectorAll(".istat-kaynak .btn").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.is === is)));
    yukle();
  });
  document.addEventListener("keydown", (e) => {
    if (p.hidden) return;
    if (e.key === "Escape") kapa();
    e.stopPropagation(); // ajanların kısayollarına gitmesin
  });
})();
