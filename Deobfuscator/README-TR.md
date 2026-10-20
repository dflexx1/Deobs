# Lua Deobfuscator — Sürükle & Bırak

Bu klasördeki 11 deobfuscator'ı tek bir `.bat` üzerinden kullanmanızı sağlar.
Bir `.lua` / `.luau` / `.txt` dosyasını **Deobfuscate.bat** üzerine sürükleyip
bırakın: dosyanın hangi obfuscator ile korunduğu otomatik tespit edilir ve
doğru araç çalıştırılır.

## Nasıl çalışıyor? (`deob.js` birleştirme değil, **dağıtıcı**)

`tools/deob.js` ~800 satırlık ince bir yönlendiricidir; deobfuscator'ların
kodu **bu dosyanın içinde değil**. Her araç kendi klasöründe durur ve
`deob.js` onları `node`/`python`/`exe` olarak **çağırır** (tıpkı elle
çalıştırıyormuş gibi, ama doğru argümanlarla):

| Araç | Çağrılan gerçek dosya | Kendi kodu |
|---|---|---|
| Prometheus | `Prometheus-Deobfuscator-main/bin/pdeobf.js` | ~16.700 satır |
| Luraph v15 | `Luraph_v15_1_Deobfuscator_Newest/deob.js` + Python `core/*.py` | ~18.400 satır |
| MoonSec | `MoonsecDeobfuscator-master` (.NET) | ~11.100 satır |
| promdeobf | `promdeobf/main.js` | ~10.800 satır |
| LuaObfuscator | `LuaObfuscator-Deobfuscator-main/index.js` | ~7.300 satır |
| Clyde | `ClydeDeobfuscator-main/cli.js` | ~6.300 satır |
| Moonveil | `moonveilvro-main/moonveil_decompile.py` | ~5.700 satır |
| Hercules | `deobfhercules_fixed/deobfhercules.py` | ~5.600 satır |
| Ironveil | `Ironveil-Deobfuscator-V1-main/deobfuscator/index.js` | ~5.000 satır |
| 77fuscator / IB2 | hazır `.exe` / `.dll` (C#) | derlenmiş |

Yani `deob.js` sadece şunları yapar: dosyayı okur → imzayı bulur →
doğru komutu `spawn` eder → çıktıyı toplar. Araç kodunun tek satırı bile
kopyalanmaz; araçlar güncellenirse `deob.js`'e dokunmak gerekmez.

Klasör adları değişse/taşınsa bile araçlar **imza dosyasından** bulunur
(`bin/pdeobf.js`, `deobfhercules.py`, `decom.lua`, …).

## Depoda hazır gelenler

Araç klasörlerinin tamamı artık depoda (açılmış hâlde). Klonladıktan sonra
`Deobfuscator.rar` çıkarmak gerekmez:

- 11 aracın kaynak kodu (`Prometheus`, `Luraph v15`, `Clyde`, `LuaObfuscator`,
  `Ironveil`, `Hercules`, `Moonsec`, `77fuscator`, `IB2`, `Moonveil`, `promdeobf`)
- Hazır çalıştırılabilirler: `77fuscator/.../deobfuscator.exe`, `bin/luau(.exe)`,
  `bin/lua5.1(.exe)` (decompiler), `LuaAnalysis.Ironbrew2.exe`
- `tools/deob.js` (dağıtıcı) ve 3 `.bat`

Sadece **Node.js** zorunlu; Python ve .NET ilgili araçlar için gerekir.
Sırlar depoya alınmadı: `ib2bot-main/.env` içindeki Discord token'ı
temizlendi ve `.env` artık `.gitignore`'da.

## Hızlı başlangıç

1. **Bir kez:** `Kurulum.bat` dosyasına çift tıklayın.
   Araç klasörlerini kontrol eder (depoda hazır), eksik bileşenleri (Node,
   Python, .NET SDK) tespit edip gerekiyorsa winget ile kurar, C# araçlarını
   derler ve durum raporu verir.
2. Sonrasında: deobfuscate etmek istediğiniz `.lua` dosyasını
   **`Deobfuscate.bat`** üzerine sürükleyip bırakın.
   (Dosyayı **`HepsiniDene.bat`** üzerine bırakırsanız tüm araçlar sırayla
   denenir ve her aracın çıktısı ayrı dosyaya yazılır.)
3. Sonuç, girdi dosyasının yanında `<dosyaadı>.deob.lua` olarak oluşur.

Birden fazla dosyayı aynı anda sürükleyebilirsiniz. Bir **klasör** de
sürükleyebilirsiniz (içindeki `.lua/.luau/.txt` dosyaları işlenir).

> `.bat` üzerine çift tıklarsanız dosya yolunu elle yazmanızı ister.

### Komut satırından

```cmd
Deobfuscate.bat C:\scripts\obf.lua
Deobfuscate.bat C:\scripts\obf.lua --tool hercules
Deobfuscate.bat C:\scripts --all --outdir C:\out
Deobfuscate.bat --doctor
Deobfuscate.bat --list
```

Doğrudan Node ile de çağırabilirsiniz:

```cmd
node tools\deob.js C:\scripts\obf.lua
```

## Seçenekler

| Seçenek | Açıklama |
|---|---|
| `--all` | Tüm araçları sırayla dener, her çıktıyı ayrı dosyaya yazar (`ad.deob.<araç>.lua`) — kısayol: `HepsiniDene.bat` |
| `--tool <id>` | Yalnızca belirtilen aracı çalıştırır (id'ler: `--list`) |
| `--outdir <klasör>` | Çıktı klasörünü değiştirir |
| `--keep-luac` | Ara `.luac` dosyalarını silmez |
| `--list` | Araçları ve hazır/yok durumlarını listeler |
| `--doctor` | Bağımlılık ve araç durumu raporu |
| `--help` | Yardım |

## Hangi dosya hangi araca gider?

| Obfuscator | Tespit imzası | Araç | Çıktı |
|---|---|---|---|
| Hercules | `Obfuscated by Hercules` | `hercules` (Python, statik) | `.lua` |
| Luraph v15 | `protected using Luraph`, `LPH_*` | `luraph` (Node + Python) | `.lua` |
| Prometheus | `Prometheus` / klasik `return(function(...)local X={"\055..."` | `prometheus` (Node) | `.lua` |
| Clyde | `clydeprotection` | `clyde` (Node) | `.lua` |
| LuaObfuscator | `luaobfuscator` | `luaobf` (Node) | `.lua` |
| Ironveil V1 | `Obfuscated using ironveil` | `ironveil` (Node) | `.lua` |
| MoonSec V3 | `moonsec` | `moonsec` (C# → `.luac` → decompile) | `.lua` |
| 77fuscator | `77fuscator`, `77FUS` | `f77` (C# → `.luac` → decompile) | `.lua` |
| IronBrew2 / IB2 | `IronBrew`, `IB2` | `ib2` (C# → `.luac` → decompile) | `.lua` |
| Moonveil | `moonveil` | `moonveil` (Python, statik/kısmi) | `.lua` |
| Luarmor | `luarmor` | — (loader; payload devirtualize edilemez) | uyarı |
| Prometheus (alternatif) | — | `promdeobf` (deneysel, `npm i luau-web`) | `.lua` |

İmza bulunamazsa hızlı ve kendi kendine tespit yapan araçlar sırayla denenir
(`prometheus → clyde → luaobf → ironveil → hercules → moonsec → f77 → ib2`).
Hiçbiri tutmazsa `--all` ile tüm araçları deneyebilirsiniz.

## Gereksinimler

| Bileşen | Ne için | Nereden |
|---|---|---|
| **Node.js 18+** | Zorunlu (dağıtıcı + 6 araç) | https://nodejs.org |
| **Python 3.10+** | Hercules, Luraph, Moonveil | https://python.org |
| **.NET 9 SDK** | MoonSec aracının derlenmesi + IB2 runtime | https://dotnet.microsoft.com/download |
| **.NET 8 runtime** | 77fuscator (paketteki hazır exe) | https://dotnet.microsoft.com/download |
| **luau** (opsiyonel) | Moonveil | PATH'e eklenmeli |

`Kurulum.bat` bunları tek tek kontrol eder; eksik olanı **winget ile
kurmayı önerir** (`E` derseniz kurar), olmazsa indirme adresini verir.
Kurulum sonunda "EKSIK BILESENLER: ..." satırı neyin eksik kaldığını söyler.

Ekran görüntüsündeki iki tipik durum:

| Ekranda görünen | Anlamı | Çözüm |
|---|---|---|
| `'node' is not recognized...` | Node.js yok (6 JS aracı + dağıtıcı çalışmaz) | `Kurulum.bat` → E, veya https://nodejs.org LTS |
| `No .NET SDKs were found` | `.NET runtime` var ama **SDK** yok → Moonsec derlenemez | `Kurulum.bat` → E (SDK 9) veya https://dotnet.microsoft.com/download/dotnet/9.0 |
| `.NET SDK 8 yok` uyarısı | 77fuscator/IB2 net8 hedefli | Gerekmez: araçlar `DOTNET_ROLL_FORWARD` ile .NET 9 üzerinde de çalışır |
| `MoonsecDeobfuscator kaynagi bulunamadi` | Araç klasörleri çıkarılmamış | `Deobfuscator.rar`'ı bu klasöre çıkarın (Kurulum otomatik de dener) |

## Çıktılar

- `obf.lua` → `obf.deob.lua`
- `--all` modunda: `obf.deob.prometheus.lua`, `obf.deob.hercules.lua`, …
- Bytecode üreten araçlarda (MoonSec, 77fuscator, IB2) `.luac` çıktısı,
  paketteki Lua 5.1 decompiler (`decom.lua`) ile `.lua` kaynağına çevrilir.
  Decompiler başarısız olursa `.luac` dosyası korunur.

## Sık karşılaşılan sorunlar

| Belirti | Çözüm |
|---|---|
| `Node.js bulunamadi` | Node.js 18+ kurun, terminali yeniden açın |
| `[X] Araç klasörleri bulunamadı` | `Deobfuscator.rar` çıkarılmamış. `Kurulum.bat` çalıştırın veya arşivi bu klasöre çıkarın |
| `[X] Su klasorler hala yok: ...` | Kurulum ekranında hangi araç klasörünün eksik olduğunu listeler | Arşivi belirtilen klasöre çıkarıp `Kurulum.bat`'ı tekrar çalıştırın |
| `moonsec ... atlandı (Kurulum.bat)` | `Kurulum.bat` çalıştırın; .NET 9 SDK gerekir |
| `f77 ... deobfuscator.exe bulunamadı` | `Kurulum.bat` (dotnet build) veya .NET 8 runtime kurun |
| `Luraph` çok yavaş / zaman aşımı | Luraph sandbox'ta çalıştırır; büyük dosyalarda uzun sürer, `--tool luraph` ile tek başına deneyin |
| `[!] Bu dosya mevcut araçlarla çözülemedi` | Bilinmeyen obfuscator olabilir; `--all` deneyin, yoksa dosya çok yeni bir sürümle korunmuştur |
| Boş/yarım çıktı | Araç sürümü dosyanın obfuscator sürümünü desteklemiyor olabilir |

## Bilinen düzeltmeler

- **Prometheus** aracının yayınlanan kopyasında `src/lua/format.js` içinde
  kullanılan `UNPRINTABLE_POINTS` sabiti tanımsızdı (araç "UNPRINTABLE_POINTS
  is not defined" hatası veriyordu). `tools/deob.js` bu sabiti eksikse otomatik
  ekler; arşivi yeniden açsanız bile düzeltme kendini yeniden uygular.
- **MoonSec / 77fuscator / IB2** bytecode üretir; paketteki `decom.lua`
  (Lua 5.1 decompiler) ile `.lua` kaynağına çevrilir.

## Windows'ta ilk çalıştırma sırası

1. Depoyu klonla / ZIP olarak indir (araçlar içinde hazır).
2. `Deobfuscator\Kurulum.bat` → `[1/6]` Node yoksa `E` ile kur, `[3/6]` .NET
   SDK yoksa `E` ile kur. Sonda **"Her sey hazir"** yazmalı.
3. Pencereyi kapat-aç (PATH güncellensin).
4. `.lua` dosyasını `Deobfuscate.bat` üzerine bırak.

## Notlar / uyarılar

- **Luraph v15** aracı ve **Moonveil**, statik çözümlemenin yanında scripti
  izole bir sandbox'ta (Luau) çalıştırır. Güvenmediğiniz dosyalarda bu iki
  aracı çalıştırmayın; `--tool` ile diğerlerini seçebilirsiniz.
- Diğer araçların tamamı statiktir, obfuscated kodu çalıştırmaz.
- Çıktı kalitesi araca göre değişir: 77fuscator/MoonSec/IB2 zincirinde
  decompiler basit olduğu için kod okunabilir ama birebir orijinal değildir;
  en iyi sonuç için `.luac` çıktısını `--keep-luac` ile saklayıp
  [unluac](https://github.com/HansWessels/unluac) gibi bir araçla açabilirsiniz.
- Bu betikler üçüncü taraf açık kaynak projeleri bir araya getirir; lisansları
  ilgili alt klasörlerdeki `LICENSE` dosyalarındadır.
