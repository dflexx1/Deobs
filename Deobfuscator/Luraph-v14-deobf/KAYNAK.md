# Luraph v14.x motoru — kaynak

Bu klasör, Luraph v14.7 / v14.8 / v14.9 ve v15 scriptlerini devirtualize eden
Python tabanlı bir araç takımıdır.

- Kaynak: https://github.com/larpcorrupt/luraph-v15-v14.x-deobfuscator
  (`Deobfuscator/deobf/` klasörü, `bin/` altındaki Lua kod tabanı revizyonu)
- Çalıştırma: `python cli.py <girdi> [--engine 14.7|14.8|14.9] -o <çıktı>`
  (normalde `tools/deob.js` bunu otomatik çağırır)
- Runtime: `bin/luau` (Linux) / `bin/luau.exe` (Windows) + `luau-ast`
  — depoda hazır gelir. Linux ikilileri Luau upstream'den bu ortamda
  derlenip strip edilmiştir (`luau-lang/luau`, make config=release).
- Bu depoya alınırken yapılan değişiklik: klasör düzeni sadeleştirildi
  (`bin/` yalnızca ikilileri tutar; Python modülleri kökte) ve `vmmap.py`
  içindeki `ROOT` çözümlemesi bu düzene göre çalışacak şekilde doğrulandı.

Araç "araştırma amaçlı" olarak yayınlanmıştır; orijinal repoda lisans dosyası
bulunmuyor. Kaynak ve atıf yukarıdaki bağlantıdadır.
