/* =====================================================================
   SİTENİN BÜTÜN İÇERİĞİ BURADA.
   Sadece bu dosyayı düzenleyerek yazı, proje ve link ekleyebilirsin.
   draft: true  → yazı sadece kendi bilgisayarında (localhost) görünür, yayında yok.
   Projeler: GitHub'daki PUBLIC repolar kendiliğinden kart olur. Bir repoyu
   public yaptığında site onu kendisi ekler, buraya bir şey yazmana gerek yok.
   ===================================================================== */
window.SITE = {
  backdrop: "MINIKDEV",

  hero: {
    hello: "Merhabalar, Ben",
    name: "KAYRA a.k.a. MNKDEV.",
    role: "BILGISAYAR_MUHENDISLIGI_OGRENCISI  · DONANIM + YAZILIM",
    lead: "<b>Bilgisayar mühendisliği</b> okuyorum. <b>ESP32, iOS ve macOS, EMBEDDED (gömülü) sistemler</b> alanlarında deneyim kazanmaya çalışıyorum.",
    photo: "img/kayra.jpg",          // dosya yoksa yer tutucu görünür
    // GitHub'da en son commit attığım proje otomatik yazılır (github-data.js → son); bu sadece yedek
    photoBadge: "ŞU AN ÜSTÜNE ÇALIŞTIĞIM: VSCODEPAD",
    status: "Selçuk · Bilgisayar Müh."
  },

  // Hero altındaki numaralı kartlar: "şu an ne yapıyorum"
  now: [
    { title: "VSCodePad", text: "iPad'de offline C/C++/Python ve daha fazlasını çalıştıran VS Code klonu.", tag: "iOS · JS" },
    { title: "Rıhtım", text: "macOS Dock için Swift eklentisi.", tag: "MACOS" },
    { title: "Bu site", text: "Gözünün önünde 17 ajanın kurduğu kişisel sitem. Saf HTML, CSS ve JS.", tag: "WEB" }
  ],

  stack: ["C", "C++", "Swift", "Python", "Java", "Javascript","ESP32", "Raspberry Pi", "Web"],

  about: {
    eyebrow: "HAKKIMDA · Kim bu, neler yapıyor?",
    title: "Ben kimim, ne yazıyorum",
    paragraphs: [
      "   Selçuk Üniversitesi Bilgisayar Mühendisliği 3. yarıyıl öğrencisiyim. Donanımla yazılımın buluştuğu yer olan gömülü sistemler üzerine çalışmayı seviyorum.",
      "   Bu sitede günlüklerimi, takıldığım hataları ve çözümlerini, ders notlarımı, GitHub'da da bulunan projelerimi ve detaylarını paylaşıyorum."
    ],
    quote: "Bir şeyi gerçekten anladığımı, onu sıfırdan kurup çalıştırabildiğimde bilirim.",
    principles: [
      { title: "Önce çalışsın", text: "Önce uçtan uca çalışan en küçük sürüm, hatta yapay zekâya yaptırırım, sonra çözüp baştan tasarlarım." },
      { title: "Donanım + yazılım", text: "Kart, sensör, telefon, bilgisayar: hepsi aynı sistemin parçası." },
      { title: "Açık günlük", text: "Başarısız denemeler de yazılır. Hata kaydı en iyi ders notudur." }
    ]
  },

  categories: ["Donanım", "iOS & macOS", "Yapay Zeka", "Okul"],   // yazısı olmayan kategori filtrede görünmez

  posts: [
    {
      slug: "esp32-ipadden-derlemek",
      title: "ESP32-S3'ü iPad'den derlemek",
      category: "Donanım",
      date: "2026-11-11",
      read: 7,
      featured: true,
      draft: false,
      cizim: "esp",
      excerpt: "iPadOS uygulamalara USB-seri vermiyor. Ben de kartı USB belleğe çevirdim: TinyUF2, GitHub Actions ve bir dosya kopyalama.",
      body: `
        <p>Sınav haftasında Mac'e erişimim olmayacak. Elimde iPad Air, harici klavye ve bir ESP32-S3-DevKitC-1 kalacak. Hedefim basitti: kodu iPad'de yazayım, kabloyu takayım, kart çalışsın. Bunun için kendi editörümü yazıyorum: <b>VSCodePad</b>, iPad'de VS Code arayüzüyle çalışan, C/C++ ve Python'u internetsiz derleyen bir uygulama.</p>
        <p>C ve Python tarafı iPad'in içinde çözüldü. ESP32 ise beklediğimden çok daha inatçı çıktı.</p>

        <h3>Duvar: iPadOS'ta seri port yok</h3>
        <p>Bilgisayarda ESP32'ye kod atmak için <code>esptool</code> kartla USB-seri üzerinden konuşur. iPadOS bu kapıyı uygulamalara kapatıyor. WebSerial yok, uygulamanın kendi USB sürücüsünü getirmesi de serbest değil.</p>
        <p>Tek teknik çıkış yolu <b>DriverKit</b>: M çipli iPad'lerde uygulamanın içine gömülü bir USB sürücüsü. Denedim, Xcode imzalamayı reddetti. Ücretsiz Apple ID ile açılan kişisel takımlar DriverKit iznini alamıyor. Yıllık 99 dolarlık geliştirici hesabıyla açılıyor ama kendime koyduğum şart belliydi: <b>başka cihaz yok, ücretli hesap yok.</b></p>

        <h3>Çözüm: kartı USB belleğe çevirmek</h3>
        <p>iPadOS'un sorunsuz yaptığı bir şey var: USB belleği Dosyalar uygulamasında açmak. O zaman kartı USB bellek gibi göstermem yeterliydi.</p>
        <p>Bunu <b>TinyUF2</b> yapıyor. ESP32-S3'e kurulan küçük bir önyükleyici bu. Kart UF2 moduna girince bilgisayara (ya da iPad'e) <code>S3DKC1BOOT</code> adında bir sürücü olarak görünüyor. İçine bir <code>.uf2</code> dosyası kopyaladığında kendini o yazılımla güncelliyor. Bu durumda yükleme, kart açısından bir dosya kopyalamadan ibaret.</p>
        <div class="note"><b>Tek seferlik bedel:</b> TinyUF2'nin karta bir kez bilgisayardan yüklenmesi gerekiyor. Boş bir ESP32'nin ROM'u sadece USB-seri konuştuğu için ilk yükleme iPad'den mümkün değil. Bunu Mac'te, kartın COM (UART) portundan bir betikle yaptım, iki dakika sürdü. Sonrasında Mac'e bir daha gerek kalmıyor.</div>

        <h3>Akış</h3>
        <ol>
          <li><b>Yaz:</b> VSCodePad'de bir <code>.ino</code> dosyası aç.</li>
          <li><b>Derle:</b> Arduino derleyicisi iPad'e sığmıyor. Kod <code>esp32-projeler</code> reposuna gidiyor, orada GitHub Actions <code>arduino-cli</code> ile derliyor (esp32 core 3.0.7).</li>
          <li><b>Çevir:</b> Uygulama derlenmiş <code>.bin</code>'i indirip <code>.uf2</code>'ye çeviriyor. Bu dönüşüm ESP32-S3'ün UF2 aile kimliğiyle (<code>0xc47e5767</code>) yapılıyor.</li>
          <li><b>Yükle:</b> Kartı UF2 moduna al (RESET, mor LED, BOOT), <code>S3DKC1BOOT</code>'u seç, dosyayı yaz. Kart yeniden başlıyor ve kod çalışıyor.</li>
        </ol>
        <p>Kablo istemeyen durumlar için Wi-Fi (OTA) ve BLE ile yükleme de var. Tamamen internetsiz çalışmak istersem de CircuitPython var: kart <code>CIRCUITPY</code> olarak görünüyor ve <code>code.py</code>'yi kaydetmek yetiyor.</p>

        <h3>İlk deneme: "dosya kaydedilemedi"</h3>
        <p>İlk sürümde iPadOS, karta yazarken "dosya kaydedilemedi" dedi. Harici sürücülerde bir yazma yönteminin çalışması, ötekilerin de çalışacağı anlamına gelmiyor. Sonunda uygulama üç yolu sırayla deniyor: düz POSIX yazma, <code>FileHandle</code> ve <code>NSFileCoordinator</code>. Biri tutunca duruyor.</p>
        <p><b>11 Kasım 2026'da iPad'den kabloyla ilk yükleme başarılı oldu.</b> Mac yoktu, kartın LED'i mavi-yeşil yanıp sönüyordu.</p>

        <h3>Test çizimi</h3>
        <p>Bu kartta dahili RGB LED, belgelerde yazan GPIO38'de değil, büyük ihtimalle <b>GPIO48</b>'de. İkisini birden yakmak en garantisi. Bir de esp32 core 3.x'te <code>neopixelWrite</code> eskidi, yerine <code>rgbLedWrite</code> kullanılıyor.</p>
        <pre><code>// ESP32-S3-DevKitC-1 · renk döndüren LED
const int LEDLER[] = {48, 38};   // kart sürümüne göre biri yanar

void renk(uint8_t r, uint8_t g, uint8_t b) {
  for (int pin : LEDLER) rgbLedWrite(pin, r, g, b);
}

void setup() {
  Serial.begin(115200);
}

void loop() {
  renk(0, 40, 40);  delay(400);   // mavi-yeşil
  renk(40, 0, 20);  delay(400);   // mor
  renk(0, 0, 0);    delay(400);   // sönük
  Serial.println("merhaba iPad");
}</code></pre>

        <h3>Hâlâ açık olanlar</h3>
        <ul>
          <li>UF2 yazımından sonraki yazılımsal yeniden başlatmada USB-seri görünmüyor, RST'ye basınca geliyor. iPad'de seri kullanmadığım için şimdilik dert değil.</li>
          <li>Yaz, GitHub'da derle, USB'den yükle zincirinin tamamı daha pürüzsüz değil. Derleme başarılı oluyor ama uçtan uca akışı cilalamam gerekiyor. Bir sonraki günlükte buna bakacağım.</li>
          <li>Ücretli hesap alırsam DriverKit açılıyor. O zaman boş kartlar da (klasik ESP32 dahil) iPad'den doğrudan programlanabilir.</li>
        </ul>
        <p>Özetle: iPad bir ESP32'yi programlayamaz, ama bir dosyayı USB belleğe kopyalayabilir. Gerisi kartı USB bellek gibi davranmaya ikna etmekten ibaret.</p>`
    }
  ],

  /* GITHUB: public repolar otomatik proje kartı olur.
     Veri js/github-data.js'ten gelir (tools/github-sync.py üretir, private commit sayıları da orada).
     live: true → site açılınca GitHub'dan canlı da bakar, yeni açtığın public repo betiği beklemeden görünür. */
  github: {
    user: "mnkdevmnk",
    live: true,
    hide: [],                                   // sitede görünmesin istediğin public repolar
    cat: { "vs-ipad": "iOS", "rihtim-macos": "macOS" },  // repo → kategori (yazılmazsa "GitHub")
    text: {}                                    // repo → Türkçe açıklama (yazılmazsa GitHub açıklaması)
  },

  projects: {
    // Katman katman incelenen öne çıkan proje. repo: yazınca GitHub linki + commit sayısı eklenir.
    featured: {
      repo: "vs-ipad",
      label: "ÖNE ÇIKAN",
      meta: "iPad Air · Tamamen offline",
      title: "VSCodePad — iPad'de VS Code",
      text: "Sınav haftasında elimde sadece iPad kalacaktı ve internetsiz C/C++ derleyip çalıştırmam gerekiyordu. Oturdum, kendim yazdım. Sonra büyüdü: Python, SQL, GitHub ve sadece bir kablo ile iPad'den ESP32 / Pico yükleme.",
      stats: [
        { value: "6+", label: "Offline dil" },
        { value: "0", label: "Bulut bağımlılığı" },
        { value: "iPad", label: "Hedef cihaz" },
        { value: "ESP32", label: "Köprü" }
      ],
      layers: [
        { name: "Editör", title: "İçinde gerçek VS Code motoru", text: "VS Code'un editör motoru Monaco çalışıyor, arayüz Dark Modern düzeninin birebir kopyası.", tags: ["Monaco", "Swift"] },
        { name: "Derleyici", title: "Offline C / C++", text: "clang ve clang++ WebAssembly olarak iPad'in içinde çalışıyor, STL dahil. İnternet istemiyor.", tags: ["clang", "WASM"] },
        { name: "Python", title: "Python 3.12 ve SQL", text: "Python Pyodide ile, SQLite sql.js ile iPad'de çalışıyor. Java, C#, Rust ise şimdilik internetle.", tags: ["Python", "SQLite"] },
        { name: "ESP32", title: "Kabloyla karta yükleme", text: "iPadOS seri port vermiyor, ben de kartı USB belleğe çevirdim: kod GitHub Actions'ta derleniyor, UF2 olarak karta kopyalanıyor.", tags: ["ESP32", "UF2"] }
      ]
    },
    /* MANUEL PROJELER. Sadece public repolar. Private bir projeyi GitHub'da public yapınca
       site onu kendiliğinden kart yapar; buraya sadece Türkçe metin vermek için yaz.
       repo: "ad" yazarsan o public repoyla birleşir: senin yazdığın metin kalır,
       GitHub'dan dil, commit sayısı, son güncelleme ve link eklenir. Aynı repo ikinci kez kart olmaz. */
    list: [
      { title: "Rıhtım", repo: "rihtim-macos", cat: "macOS", text: "Çentiği, Dock'u ve menü çubuğunu tek uygulamada topladım. Dock'u bozmadan üstüne pencere önizlemesi, ⌘⇥ değiştirici, pencere yaslama ve Stats tarzı menü modülleri ekliyor.", tags: ["Swift"], status: "wip" }
    ]
  },

  // Blog yazılarının nasıl üretildiğini gösteren ajan hattı (demo animasyon)
  pipeline: {
    agents: [
      { id: "ara", name: "Araştırmacı", role: "Kaynak ve not toplar" },
      { id: "yaz", name: "Yazar", role: "Taslağı çıkarır" },
      { id: "edi", name: "Editör", role: "Kontrol eder, kısaltır" },
      { id: "yay", name: "Yayıncı", role: "Siteye koyar" }
    ],
    log: [
      ["ara", "VSCodePad notları ve hata kayıtları toplandı"],
      ["ara", "seri port duvarı not edildi: iPadOS izin vermiyor"],
      ["yaz", "yazı açıldı: \"ESP32-S3'ü iPad'den derlemek\""],
      ["yaz", "başlıklar ve kod bloğu yazıldı"],
      ["edi", "gereksiz paragraflar silindi"],
      ["edi", "kod bloğu kartta denendi ✓"],
      ["yay", "kapak ve etiket eklendi"],
      ["yay", "yayına hazır · Kayra'nın onayı bekleniyor"]
    ]
  },

  media: [
    { platform: "GitHub", handle: "@mnkdevmnk", url: "https://github.com/mnkdevmnk", desc: "Kod ve projeler", icon: "code" },
    { platform: "Instagram", handle: "@mnk.dev", url: "https://www.instagram.com/mnk.dev/", desc: "Kurulumlar, kısa videolar", icon: "insta" },
    { platform: "LinkedIn", handle: "Kayra Kurt", url: "https://www.linkedin.com/in/kayra-kurt-1159563a7/", desc: "Özgeçmiş", icon: "in" }
  ],

  contact: {
    eyebrow: "İLETİŞİM",
    title: "Birlikte bir şey kuralım.",
    text: "Proje, staj ya da sadece bir soru için yaz.",
    email: "kayrakur2007@gmail.com",  // kopyala butonu bunu kopyalar
    email2: "kayrakurt07@icloud.com", // altında ikinci adres olarak görünür
    // Doğrudan mesaj butonları. ig.me/m/<kullanıcı> Instagram'da direkt sohbeti açar.
    // LinkedIn kişiye özel mesaj linki vermiyor; profil açılır, oradaki "Mesaj" butonuna basılır.
    dm: [
      { label: "INSTAGRAM'DAN YAZ", url: "https://ig.me/m/mnk.dev", icon: "insta" },
      { label: "LINKEDIN'DEN YAZ", url: "https://www.linkedin.com/in/kayra-kurt-1159563a7/", icon: "in" }
    ]
  },

  /* ===== AJANLAR (js/ajanlar.js) =====
     Sayfa önce taslak olarak açılır; ziyaretçi kaydırdıkça ajanlar ekrandaki
     parçaları kurar. Hepsi bitince yarısı farenin etrafında döner,
     yarısı aralarında planlama toplantısı yapar.
     İsimleri ve ekipleri istediğin gibi değiştir. Ekip adı aşağıdakilerden biri olmalı. */
  ajanlar: {
    // kisa: imlecin yanındaki küçük etiket ("TS" + numara → TS1)
    ekipler: {
      tasarimci: { ad: "Tasarımcı", kisa: "TS", renk: "#f472b6", is: "görsel, kart, düzen" },
      muhendis:  { ad: "Mühendis",  kisa: "MH", renk: "#60a5fa", is: "menü, filtre, buton" },
      yazar:     { ad: "Yazar",     kisa: "YZ", renk: "#fb923c", is: "başlık ve metinler" },
      editor:    { ad: "Editör",    kisa: "ED", renk: "#facc15", is: "etiket ve düzelti" },
      testci:    { ad: "Testçi",    kisa: "QA", renk: "#4ade80", is: "kontrol" }
    },
    // ekip tek ("yazar") ya da birden çok (["muhendis", "yazar"]) olabilir; çok ekipli ajan göreve göre renk değiştirir.
    // Her ajanın iki adı olabilir: ad = uzun ad (konuşurken, iş yaparken görünür),
    // kisa = imlecin yanındaki küçük etiket. Örnek: { ad: "Ayşe Tasarımcı", kisa: "AYŞ", ekip: "tasarimci" }
    // kisa yazılmazsa ekip kısaltması + numara kullanılır (Tasarımcı 1 → TS1).
    liste: [
      // Tasarımcılar
      { ad: "Ada",      kisa: "ADA",  ekip: "tasarimci" },
      { ad: "Penny",    kisa: "PEN",  ekip: "tasarimci" },
      { ad: "Bilge",    kisa: "BLG",  ekip: "tasarimci" },
      // Mühendisler
      { ad: "Mete",     kisa: "MT",   ekip: "muhendis" },
      { ad: "Doğacan",  kisa: "DGC",  ekip: "muhendis" },
      { ad: "Tuğberk",  kisa: "TGBR", ekip: "muhendis" },
      { ad: "İbrahim",  kisa: "İBO",  ekip: "muhendis" },
      { ad: "Muzaffer", kisa: "MZO",  ekip: "muhendis" },
      // Alptuğ iki ekipte: mühendislik ve yazı işi alır, göreve göre rengi değişir (ilki ana ekip)
      { ad: "Alptuğ",   kisa: "ALP",  ekip: ["muhendis", "yazar"] },
      // Yazarlar
      { ad: "Kübra",    kisa: "KBR",  ekip: "yazar" },
      { ad: "Deniz",    kisa: "DNZ",  ekip: "yazar" },
      // Editörler
      { ad: "Selin",    kisa: "SLN",  ekip: "editor" },
      { ad: "Kerem",    kisa: "KRM",  ekip: "editor" },
      { ad: "Ece",      kisa: "ECE",  ekip: "editor" },
      // Testçiler
      { ad: "Burak",    kisa: "BRK",  ekip: "testci" },
      { ad: "Zeynep",   kisa: "ZYP",  ekip: "testci" },
      { ad: "Emre",     kisa: "EMR",  ekip: "testci" }
    ],
    // Ajanların balonlarda söylediği her şey: js/ajan-sozleri.js (elle düzenle)
  }
};
