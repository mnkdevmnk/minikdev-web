/* ZİYARET + TIKLAMA SAYACI (Vercel sunucusuz fonksiyonu: /api/sayac)
   Veriler Upstash Redis'te durur (Vercel › Storage › Upstash for Redis, ücretsiz katman).

   POST /api/sayac   {t:"z", id, s, r}  → ziyaret (sayfa görüntüleme)
                     {t:"t", id, h}     → tıklama
   GET  /api/sayac   başlıkta x-anahtar → yönetici paneli için özet

   KURULUM (bir kez):
   1. Vercel › proje › Storage › Upstash for Redis › Create/Connect.
      Ortam değişkenleri kendiliğinden gelir (KV_REST_API_URL + KV_REST_API_TOKEN
      ya da UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN; ikisi de olur).
   2. Terminal'de:  printf 'sayac|kullanici:sifre' | shasum -a 256
      (yönetici girişindeki kullanıcı adı ve şifre). Çıkan ilk uzun yazıyı
      Vercel › Settings › Environment Variables › ISTATISTIK_ANAHTARI olarak ekle.
   3. Redeploy. Panelde ÇIKIŞ yapıp tekrar gir, İSTATİSTİK'e bas.

   Kötüye kullanım: bağlantı başına dakikada DAKIKA_SINIRI istek; listeler LISTE_SINIRI kayıtla sınırlı.
   Kişisel veri saklanmaz: IP yazılmaz (istek sınırı için 60 sn'lik tek yönlü özet), ziyaretçi kimliği tarayıcıda üretilen
   rastgele bir sayı ve sadece tekil sayım (HyperLogLog) için kullanılır. */
const crypto = require("crypto");

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const ANAHTAR = process.env.ISTATISTIK_ANAHTARI || "";
const GUN_SN = 400 * 86400; // günlük anahtarlar ~13 ay saklanır
const YEREL = ["http://localhost:8643", "http://127.0.0.1:8643"];
const DAKIKA_SINIRI = 60;   // aynı bağlantıdan dakikada en fazla bu kadar istek (fazlası 429)
const LISTE_SINIRI = 300;   // hedef/sayfa/kaynak listelerinde en fazla bu kadar farklı kayıt
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|curl|wget|python/i;

// Türkiye saati (UTC+3, yaz saati yok)
const gun = (geri = 0) => new Date(Date.now() + 3 * 3600e3 - geri * 86400e3).toISOString().slice(0, 10);
const temiz = (v, n) => String(v || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);

async function redis(komutlar) {
  const r = await fetch(URL_ + "/pipeline", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(komutlar)
  });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).map((x) => x.result);
}

function govde(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = null; } }
  if (Buffer.isBuffer(b)) { try { b = JSON.parse(b.toString("utf8")); } catch { b = null; } }
  return b && typeof b === "object" ? b : null;
}

function esit(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// {alan: sayı, ...} → [[alan, sayı], ...] büyükten küçüğe, ilk n
function sirala(h, n = 15) {
  if (!h) return [];
  const cift = Array.isArray(h) ? h.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(+v) : a.push([v]), a), []) : Object.entries(h).map(([k, v]) => [k, +v]);
  return cift.sort((a, b) => b[1] - a[1]).slice(0, n);
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  if (YEREL.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "x-anahtar");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!URL_ || !TOKEN) return res.status(503).json({ hata: "kurulmadi" });

  try {
    if (req.method === "POST") {
      if (BOT.test(req.headers["user-agent"] || "")) return res.status(204).end();
      const b = govde(req);
      if (!b) return res.status(400).json({ hata: "istek okunamadı" });
      const d = gun(), id = temiz(b.id, 40) || crypto.randomUUID();

      // İstek sınırı: IP yazılmaz; günlük tuzla özetlenip 60 sn'lik bir sayaç anahtarı olur.
      const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
      const rl = "rl:" + crypto.createHash("sha256").update(d + "|" + ip + "|" + (TOKEN || "")).digest("hex").slice(0, 20);
      const liste = b.t === "z" ? "sayfa" : "hedef";
      const alan = b.t === "z" ? (temiz(b.s, 80) || "/") : temiz(b.h, 70);
      const [adet, , boy, var_, kBoy] = await redis([["INCR", rl], ["EXPIRE", rl, 60], ["HLEN", liste], ["HEXISTS", liste, alan], ["HLEN", "kaynak"]]);
      if (+adet > DAKIKA_SINIRI) return res.status(429).json({ hata: "çok fazla istek" });
      const yerVar = (+boy || 0) < LISTE_SINIRI || +var_ === 1; // liste doluysa yeni kayıt açma, var olanı say

      let k;
      if (b.t === "z") {
        const s = temiz(b.s, 80) || "/";
        k = [
          ["INCR", "z:tum"], ["INCR", "z:g:" + d], ["EXPIRE", "z:g:" + d, GUN_SN],
          ["PFADD", "u:tum", id], ["PFADD", "u:g:" + d, id], ["EXPIRE", "u:g:" + d, GUN_SN],
        ];
        if (yerVar) k.push(["HINCRBY", "sayfa", s, 1]);
        const r = temiz(b.r, 60).toLowerCase();
        if (r && /^[a-z0-9.-]+$/.test(r) && (+kBoy || 0) < LISTE_SINIRI) k.push(["HINCRBY", "kaynak", r, 1]);
      } else if (b.t === "t") {
        const h = temiz(b.h, 70);
        if (!h) return res.status(400).json({ hata: "hedef yok" });
        k = [["INCR", "t:tum"], ["INCR", "t:g:" + d], ["EXPIRE", "t:g:" + d, GUN_SN]];
        if (yerVar) k.push(["HINCRBY", "hedef", h, 1]);
      } else {
        return res.status(400).json({ hata: "tür yanlış" });
      }
      await redis(k);
      return res.status(204).end();
    }

    if (req.method === "GET") {
      if (!ANAHTAR) return res.status(503).json({ hata: "anahtar_yok" });
      if (!esit(req.headers["x-anahtar"] || "", ANAHTAR)) return res.status(401).json({ hata: "yetki yok" });
      const gunler = Array.from({ length: 30 }, (_, i) => gun(29 - i));
      const k = [];
      for (const g of gunler) k.push(["GET", "z:g:" + g], ["GET", "t:g:" + g], ["PFCOUNT", "u:g:" + g]);
      k.push(
        ["GET", "z:tum"], ["GET", "t:tum"], ["PFCOUNT", "u:tum"],
        ["PFCOUNT", ...gunler.slice(-7).map((g) => "u:g:" + g)],
        ["PFCOUNT", ...gunler.map((g) => "u:g:" + g)],
        ["HGETALL", "hedef"], ["HGETALL", "sayfa"], ["HGETALL", "kaynak"]
      );
      const c = await redis(k);
      const n = gunler.length * 3;
      return res.status(200).json({
        gunler: gunler.map((g, i) => ({ gun: g, z: +c[i * 3] || 0, t: +c[i * 3 + 1] || 0, u: +c[i * 3 + 2] || 0 })),
        tum: { z: +c[n] || 0, t: +c[n + 1] || 0, u: +c[n + 2] || 0 },
        u7: +c[n + 3] || 0,
        u30: +c[n + 4] || 0,
        hedef: sirala(c[n + 5]),
        sayfa: sirala(c[n + 6]),
        kaynak: sirala(c[n + 7])
      });
    }

    return res.status(405).json({ hata: "yöntem yok" });
  } catch (err) {
    return res.status(500).json({ hata: "sunucu: " + err.message });
  }
};
