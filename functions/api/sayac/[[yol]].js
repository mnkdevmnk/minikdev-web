/* ZİYARET + TIKLAMA SAYACI (Cloudflare Pages Function: /api/sayac ve /api/sayac/)
   Veriler Upstash Redis'te durur (upstash.com, ücretsiz katman, REST API).

   POST /api/sayac/   {t:"z", id, s, r}  → ziyaret (sayfa görüntüleme)
                      {t:"t", id, h}     → tıklama
   GET  /api/sayac/   başlıkta x-anahtar → yönetici paneli için özet

   KURULUM (bir kez) — Cloudflare › Workers & Pages › proje › Settings › Variables and Secrets:
     UPSTASH_REDIS_REST_URL    Upstash konsolundaki "REST URL"
     UPSTASH_REDIS_REST_TOKEN  Upstash konsolundaki "REST TOKEN"  (Secret olarak)
     ISTATISTIK_ANAHTARI       printf 'sayac|kullanici:sifre' | shasum -a 256 çıktısının ilk kısmı (Secret)
   Sonra Deployments › en üstteki › Retry deployment.

   Kötüye kullanım: bağlantı başına dakikada DAKIKA_SINIRI istek; listeler LISTE_SINIRI kayıtla sınırlı.
   Kişisel veri saklanmaz: IP yazılmaz (istek sınırı için 60 sn'lik tek yönlü özet), ziyaretçi
   kimliği tarayıcıda üretilen rastgele bir sayı ve sadece tekil sayım (HyperLogLog) için kullanılır. */

const GUN_SN = 400 * 86400; // günlük anahtarlar ~13 ay saklanır
const DAKIKA_SINIRI = 60;
const LISTE_SINIRI = 300;
const YEREL = ["http://localhost:8643", "http://127.0.0.1:8643"];
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|embedly|curl|wget|python/i;

// Türkiye saati (UTC+3, yaz saati yok)
const gun = (geri = 0) => new Date(Date.now() + 3 * 3600e3 - geri * 86400e3).toISOString().slice(0, 10);
const temiz = (v, n) => String(v || "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, n);

async function sha256(metin) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(metin));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function esit(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let f = 0;
  for (let i = 0; i < a.length; i++) f |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return f === 0;
}

// {alan: sayı} ya da [alan, sayı, ...] → [[alan, sayı], ...] büyükten küçüğe, ilk n
function sirala(h, n = 15) {
  if (!h) return [];
  const cift = Array.isArray(h)
    ? h.reduce((a, v, i) => (i % 2 ? a[a.length - 1].push(+v) : a.push([v]), a), [])
    : Object.entries(h).map(([k, v]) => [k, +v]);
  return cift.sort((a, b) => b[1] - a[1]).slice(0, n);
}

export async function onRequest({ request, env }) {
  const URL_ = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const TOKEN = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  const ANAHTAR = env.ISTATISTIK_ANAHTARI || "";

  const baslik = { "Cache-Control": "no-store" };
  const origin = request.headers.get("Origin") || "";
  if (YEREL.includes(origin)) {
    baslik["Access-Control-Allow-Origin"] = origin;
    baslik["Access-Control-Allow-Headers"] = "x-anahtar";
    baslik["Vary"] = "Origin";
  }
  const json = (veri, durum = 200) => new Response(JSON.stringify(veri), { status: durum, headers: { ...baslik, "Content-Type": "application/json; charset=utf-8" } });
  const bos = (durum = 204) => new Response(null, { status: durum, headers: baslik });

  if (request.method === "OPTIONS") return bos(204);
  if (!URL_ || !TOKEN) return json({ hata: "kurulmadi" }, 503);

  async function redis(komutlar) {
    const r = await fetch(URL_ + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(komutlar)
    });
    if (!r.ok) throw new Error("redis " + r.status);
    return (await r.json()).map((x) => x.result);
  }

  try {
    if (request.method === "POST") {
      if (BOT.test(request.headers.get("User-Agent") || "")) return bos(204);
      let b = null;
      try { b = JSON.parse(await request.text()); } catch {}
      if (!b || typeof b !== "object") return json({ hata: "istek okunamadı" }, 400);
      const d = gun(), id = temiz(b.id, 40) || crypto.randomUUID();

      // İstek sınırı: IP yazılmaz; günlük tuzla özetlenip 60 sn'lik bir sayaç anahtarı olur.
      const ip = request.headers.get("CF-Connecting-IP") || "";
      const rl = "rl:" + (await sha256(d + "|" + ip + "|" + TOKEN)).slice(0, 20);
      const liste = b.t === "z" ? "sayfa" : "hedef";
      const alan = b.t === "z" ? (temiz(b.s, 80) || "/") : temiz(b.h, 70);
      const [adet, , boy, var_, kBoy] = await redis([["INCR", rl], ["EXPIRE", rl, 60], ["HLEN", liste], ["HEXISTS", liste, alan], ["HLEN", "kaynak"]]);
      if (+adet > DAKIKA_SINIRI) return json({ hata: "çok fazla istek" }, 429);
      const yerVar = (+boy || 0) < LISTE_SINIRI || +var_ === 1; // liste doluysa yeni kayıt açma, var olanı say

      let k;
      if (b.t === "z") {
        k = [
          ["INCR", "z:tum"], ["INCR", "z:g:" + d], ["EXPIRE", "z:g:" + d, GUN_SN],
          ["PFADD", "u:tum", id], ["PFADD", "u:g:" + d, id], ["EXPIRE", "u:g:" + d, GUN_SN]
        ];
        if (yerVar) k.push(["HINCRBY", "sayfa", alan, 1]);
        const r = temiz(b.r, 60).toLowerCase();
        if (r && /^[a-z0-9.-]+$/.test(r) && (+kBoy || 0) < LISTE_SINIRI) k.push(["HINCRBY", "kaynak", r, 1]);
      } else if (b.t === "t") {
        if (!alan) return json({ hata: "hedef yok" }, 400);
        k = [["INCR", "t:tum"], ["INCR", "t:g:" + d], ["EXPIRE", "t:g:" + d, GUN_SN]];
        if (yerVar) k.push(["HINCRBY", "hedef", alan, 1]);
      } else {
        return json({ hata: "tür yanlış" }, 400);
      }
      await redis(k);
      return bos(204);
    }

    if (request.method === "GET") {
      if (!ANAHTAR) return json({ hata: "anahtar_yok" }, 503);
      if (!esit(request.headers.get("x-anahtar") || "", ANAHTAR)) return json({ hata: "yetki yok" }, 401);
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
      return json({
        gunler: gunler.map((g, i) => ({ gun: g, z: +c[i * 3] || 0, t: +c[i * 3 + 1] || 0, u: +c[i * 3 + 2] || 0 })),
        tum: { z: +c[n] || 0, t: +c[n + 1] || 0, u: +c[n + 2] || 0 },
        u7: +c[n + 3] || 0,
        u30: +c[n + 4] || 0,
        hedef: sirala(c[n + 5]),
        sayfa: sirala(c[n + 6]),
        kaynak: sirala(c[n + 7])
      });
    }

    return json({ hata: "yöntem yok" }, 405);
  } catch (err) {
    return json({ hata: "sunucu: " + err.message }, 500);
  }
}
