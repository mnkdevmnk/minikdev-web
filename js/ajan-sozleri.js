/* =====================================================================
   AJAN SÖZLERİ: ajanların balonlarında çıkan bütün yazılar burada.
   Elle düzenle, kaydet (⌘S), sayfa kendiliğinden yenilenir.

   Kurallar:
   - Her liste "…" içinde yazılmış cümlelerden oluşur, aralarına virgül konur.
   - Bir listeden her seferinde rastgele bir cümle seçilir. İstediğin kadar ekle/sil,
     ama hiçbir listeyi tamamen boşaltma (boş kalırsa koddaki tek yedek cümle çıkar).
   - Kısa tut: balonun genişliği ~190 px, 3-4 kelimeyi geçmesin.
   - Emoji serbest. Tırnak içinde " kullanacaksan \" yaz.
   - Ajanların isimleri, ekipleri ve renkleri burada değil: js/content.js → ajanlar.
   ===================================================================== */
window.AJAN_SOZ = {

  /* ---------- Planlama (sunum bitince) ---------- */

  // Normal toplantılarda sırayla söylenenler
  planlama: [
    "yeni yazı taslağı?", "ESP32 kısmını ben alırım", "kapak görseli lazım",
    "başlık biraz uzun", "mobilde taşma var mı?", "testleri koştum ✓",
    "linkler çalışıyor ✓", "önce içerik, sonra stil", "bu kartı büyütelim",
    "kod bloğunu kartta dene", "yarın yayınlarız", "renk kontrastı tamam",
    "Rıhtım günlüğü sırada", "açıklama metni eksik", "tamam, plan bu"
  ],

  // Dolaşan ajan sürüdekine görev verirken…
  teslim: ["rapor hazır →", "yeni görev →", "taslak sende →", "şunu kontrol et →"],
  // …sürüdeki ajan da bunlardan biriyle cevap verir
  cevap: ["aldım ✓", "tamamdır", "bakıyorum", "hallederim"],

  /* ---------- Anlaşmazlıklar ---------- */

  // Fikir ayrılığı: her satır bir tartışma. İki ajan SIRAYLA söyler:
  // 1. ajan, 2. ajan, 1. ajan, 2. ajan… (satıra istediğin kadar cümle koyabilirsin)
  tartisma: [
    ["bu başlık kırmızı olmalı", "hayır, beyaz kalsın", "kırmızı daha iyi okunur", "beyaz daha sade"],
    ["önce mobil", "önce masaüstü", "ziyaretçilerin çoğu mobilde", "kaynak?"],
    ["tab mı boşluk mu?", "tabii ki boşluk", "tab, tartışmasız", "…"],
    ["bu kart fazla büyük", "bence tam kararında", "ekranı kaplıyor", "öyle olması lazım"],
    ["Swift daha temiz", "C++ daha hızlı", "okunabilirlik önemli", "performans önemli"],
    ["koyu tema yeter", "açık tema da lazım", "kimse kullanmaz", "ben kullanırım"],
    ["bu yazı çok uzun", "detay gerekli", "kimse okumaz", "Kayra okur"],
    ["animasyon fazla", "animasyon az bile", "göz yoruluyor", "göz şenleniyor"],
    ["bunu ESP32'de yaparız", "Raspberry Pi daha kolay", "Pi çok güç yer", "ESP'de RAM yok"]
  ],
  // Tartışma bitince biri geri adım atar
  baris: ["peki, haklısın", "neyse, sonra bakarız", "tamam, ortası olsun", "oylama yapalım", "hıh.", "küstüm"],

  // Kavga kızışırken (kısa ve sert)
  kavga: [
    "sen ne anlarsın!", "asıl sen!", "yeter artık!", "tekrar söyle bakalım",
    "commit'ini geri alırım!", "merge conflict senin yüzünden!", "PR'ını reddedeceğim!", "GAS URDAN!"
  ],
  // Arbede sırasında (çöp adamlarken) bağırılanlar
  arbede: ["#@%&!", "bırak!", "sen bırak!", "an@yn!", "imlecime dokunma!", "piksellerimi ezdin!"],
  // Kavgayı izlemeye gelenler
  seyirci: ["👀", "ooo", "kim haklı?", "çekirdek var mı?", "kaydediyorum 📱", "durun!","AdalatMaalesindeGAZAĞĞ"],
  // Araya giren arabulucu
  arabulucu: ["ayrılın!", "sakin olun!", "mola, mola!", "burası ofis!", "AYIRDIR OGLIUM!"],
  // Arabulucu gelmezse kavgacı yorulup bırakır
  yorgun: ["yoruldum…", "of, bitti mi?", "neyse…"],
  // Ayrıldıktan sonra kavgacılar
  sonrasi: ["o başlattı", "hıh.", "özür dilerim…", "bu iş bitmedi", "tamam tamam", "kahve molası ☕"],

  /* ---------- Yapım (sunum sırasında) ---------- */

  // Ziyaretçi turu durdurup ajanları bekletince
  tesvik: [
    "hadi hadi!", "sabırsızlanıyorum", "aşağı kaydır ↓", "işimiz var!", "bekliyoruz… ⏳",
    "biraz daha aşağı!", "devamı çok güzel, söz", "hadi ama 🥺", "↓ ↓ ↓", "parçalar bizi bekliyor"
  ],
  // Uzun süre bekletilirse
  tesvikTur: ["Tur'a bas, ben gezdiririm", "yoruldun mu? Tur'a bas 👇", "Tur'u aç, biz kurarız"],

  // İki ekipli bir ajan (ör. Alptuğ: mühendis + yazar) ekip değiştirip rengi dönerken.
  // {ekip} yerine yeni ekibin adı yazılır (Mühendis, Yazar…)
  ekipDegis: ["{ekip} şapkamı taktım", "şimdi {ekip} modundayım", "{ekip} olarak devam"],

  /* ---------- Ziyaretçi bir ajana tıklayınca ---------- */

  selam: ["merhabalar! 👋", "hoş geldiniz!", "selam!", "hoş geldin 🙌", "aa, merhaba!", "ooo, ziyaretçi!"],
  // Tıklanan ajan o sırada bir şey kuruyorsa
  mesgul: ["selam! kuruyorum, bir saniye 🛠", "merhaba! iş başındayım", "hoş geldiniz, az kaldı!", "bir dakika, şunu bitireyim"],
  // Toplantıdaysa / kavgadaysa
  toplantida: ["toplantıdayım, birazdan 🙃"],
  kavgada: ["şimdi değil!!"],

  // Selamdan sonra ekrandaki ilginç bir parçaya koşup gösterirken.
  // Soldaki: hangi parça (CSS seçicisi, dokunma). Sağdaki: o parçada söylenecekler.
  // Gösterecek ilginç parça yoksa
  rehberYok: ["aşağıda daha çok şey var ↓", "aşağıya bir bakın ↓"],
  rehber: [
    [".featured", ["bu yazıyı okudunuz mu?", "öne çıkan yazı bu 👀"]],
    [".flagship", ["VSCodePad'e baktınız mı?", "iPad'de VS Code, inanılır gibi değil"]],
    [".post", ["şu yazıya bir bakın", "bu da okunur 📖"]],
    [".proj", ["bu projeye baktınız mı?", "şuna bir göz atın"]],
    [".gh-strip", ["commit sayısına bakın 💪"]],
    ["#portrait", ["bu Kayra 👋", "patron bu 😎"]],
    [".about", ["Kayra'yı tanıyın"]],
    [".media", ["takip etmeyi unutmayın 😉"]],
    [".contact-title, .contact-row, .dm-row", ["bir merhaba yazın!", "buradan ulaşabilirsiniz ✉️"]],
    [".filters", ["yazıları buradan süzebilirsiniz"]]
  ],

  /* ---------- MNK dev (büyük kırmızı imleç, Kayra'nın kendisi) ---------- */

  // Siteyi düzenliyormuş gibi gezerken kendi kendine söyledikleri
  mnk: [
    "şu padding olmadı", "⌘S", "commit: başlık düzeltmesi", "git push 🚀", "renk biraz koyu mu?",
    "bunu mobilde de dene", "hmm…", "tamam, bu güzel", "ajanlar yine kavga mı ediyor 😅", "bir kahve ☕",
    "yeni yazı geliyor", "font 1px büyüsün", "ESP32'yi bağlayayım", "Claude, şunu düzelt", "bu kartı kim kurdu?",
    "boşluk 24 mü 28 mi…", "Safari'de de bakayım", "ekip, toplantı yeter, iş başına!"
  ],
  // Ziyaretçi MNK dev'e tıklayınca
  mnkMerhaba: [
    "selam, ben Kayra 👋", "naber =)?", "siteyi beğendin mi?",
    "bana yaz → iletişim", "şu an siteyle uğraşıyorum 🙂", "hoş geldin! bir kahve? ☕"
  ]
};
