#!/usr/bin/env node
/*
 * deob.js - Lua deobfuscator dispatcher
 *
 * Sürüklenen .lua/.luau/.txt dosyasını inceler, hangi obfuscator ile
 * korunduğunu tespit eder ve doğru deobfuscator'ı çalıştırır.
 *
 * Kullanım:
 *   node tools/deob.js <dosya|klasör> [daha fazla dosya...] [seçenekler]
 *
 * Seçenekler:
 *   --all             Her aracı sırayla dene (çıktılar ayrı dosyalara yazılır)
 *   --tool <id>       Belirli bir aracı zorla (bkz. --list)
 *   --outdir <klasör> Çıktı klasörü (varsayılan: girdi dosyasının klasörü)
 *   --keep-luac       Ara .luac dosyalarını silme
 *   --timeout <sn>    Araç başına zaman aşımı
 *   --list            Araçları listele
 *   --doctor          Bağımlılık / araç durumu raporu
 *   --help            Bu yardım
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const IS_WIN = process.platform === 'win32';
const EXE = IS_WIN ? '.exe' : '';

/* ------------------------------------------------------------------ */
/* yardımcılar                                                        */
/* ------------------------------------------------------------------ */

const P = (...parts) => path.join(ROOT, ...parts);

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function rm(p) {
  try { fs.unlinkSync(p); } catch {}
}

function sizeOf(p) {
  try { return fs.statSync(p).size; } catch { return 0; }
}

function pad(s, n) {
  s = String(s);
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || ROOT,
    encoding: 'buffer',
    timeout: opts.timeout || 180000,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
    env: Object.assign({}, process.env, opts.env || {}),
  });
  return {
    status: res.status,
    signal: res.signal,
    error: res.error,
    stdout: res.stdout ? res.stdout.toString('utf8') : '',
    stderr: res.stderr ? res.stderr.toString('utf8') : '',
  };
}

function stripAnsi(text) {
  // eslint-disable-next-line no-control-regex
  return String(text).replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
}

function tail(text, lines = 6) {
  if (!text) return '';
  const parts = stripAnsi(text).replace(/\r/g, '').trim().split('\n');
  return parts.slice(-lines).join('\n');
}

/* ------------------------------------------------------------------ */
/* araç yolları                                                       */
/* ------------------------------------------------------------------ */

const PATHS = {
  luraph:     P('Luraph_v15_1_Deobfuscator_Newest', 'v15_tool_attempt_source'),
  prometheus: P('Prometheus-Deobfuscator-main', 'Prometheus-Deobfuscator-main'),
  clyde:      P('ClydeDeobfuscator-main', 'ClydeDeobfuscator-main'),
  luaobf:     P('LuaObfuscator-Deobfuscator-main', 'LuaObfuscator-Deobfuscator-main'),
  ironveil:   P('Ironveil-Deobfuscator-V1-main', 'Ironveil-Deobfuscator-V1-main'),
  hercules:   P('hercules-deobfuscator-main', 'hercules-deobfuscator-main', 'hercules', 'deobfhercules_fixed'),
  moonsec:    P('MoonsecDeobfuscator-master'),
  moonbot:    P('MoonSecV3_Deobfuscator_Bot_FULLY-1', 'MoonSecV3DeobfuscatorDiscordBot-main'),
  ib2:        P('ib2-deobf', 'ib2bot-main', 'ib2deobf'),
  f77:        P('77fuscatorDeobfuscator-main', '77fuscatorDeobfuscator-main'),
  moonveil:   P('moonveilvro-main', 'moonveilvro-main'),
  promdeobf:  P('promdeobf', 'promdeobf'),
};

/* ------------------------------------------------------------------ */
/* python bulma                                                       */
/* ------------------------------------------------------------------ */

let cachedPython;

function findPython() {
  if (cachedPython !== undefined) return cachedPython;
  const candidates = IS_WIN
    ? [['python'], ['py', '-3'], ['python3']]
    : [['python3'], ['python']];
  for (const cand of candidates) {
    const r = run(cand[0], cand.slice(1).concat(['--version']), { timeout: 15000 });
    const ok = !r.error && r.status === 0 && /python\s+3/i.test(r.stdout + r.stderr);
    if (ok) {
      cachedPython = { cmd: cand[0], prefix: cand.slice(1) };
      return cachedPython;
    }
  }
  cachedPython = null;
  return null;
}

/* ------------------------------------------------------------------ */
/* gömülü Lua 5.1 derleyici (luac -> lua)                             */
/* ------------------------------------------------------------------ */

function decompilerBin() {
  const candidates = IS_WIN
    ? [path.join(PATHS.moonbot, 'bin', 'lua5.1.exe'), 'lua5.1']
    : [path.join(PATHS.moonbot, 'bin', 'lua5.1'), 'lua5.1'];
  for (const c of candidates) {
    if (c.includes(path.sep) || c.includes('/')) {
      if (!exists(c)) continue;
      if (!IS_WIN) { try { fs.chmodSync(c, 0o755); } catch {} }
      return c;
    }
    const r = run(c, ['-v'], { timeout: 15000 });
    if (!r.error && r.status === 0) return c;
  }
  return null;
}

function decompileLuac(luacPath, outPath) {
  const bin = decompilerBin();
  const script = path.join(PATHS.moonbot, 'decom.lua');
  if (!bin || !exists(script)) return null;
  const r = run(bin, [script, luacPath, outPath], { cwd: PATHS.moonbot, timeout: 180000 });
  if (sizeOf(outPath) > 0) return outPath;
  return null;
}

/* ------------------------------------------------------------------ */
/* tespit (fingerprint)                                               */
/* ------------------------------------------------------------------ */

const MARKERS = [
  { id: 'hercules', w: 10, rx: [/obfuscated\s+by\s+hercules/i, /hercules-obfuscator/i] },
  { id: 'luraph',   w: 10, rx: [/protected\s+using\s+luraph/i, /\bLPH_(ENCSTR|ENCFUNC|CRASH)\b/, /lura\.ph/i] },
  { id: 'ironveil', w: 10, rx: [/obfuscated\s+using\s+ironveil/i] },
  { id: 'f77',      w: 10, rx: [/77fuscator/i, /77FUS/] },
  { id: 'clyde',    w: 10, rx: [/clydeprotection/i, /clyde\s*protection/i] },
  { id: 'moonsec',  w: 8,  rx: [/moonsec/i] },
  { id: 'moonveil', w: 8,  rx: [/moonveil/i] },
  { id: 'luaobf',   w: 8,  rx: [/luaobfuscator/i] },
  { id: 'prometheus', w: 8, rx: [/prometheus/i] },
  { id: 'ib2',      w: 6,  rx: [/ironbrew/i, /\bIB2\b/] },
  { id: 'luarmor',  w: 8,  rx: [/luarmor/i] },
];

function detect(src) {
  const scores = new Map();
  const add = (id, n) => scores.set(id, (scores.get(id) || 0) + n);

  for (const m of MARKERS) {
    for (const rx of m.rx) {
      if (rx.test(src)) { add(m.id, m.w); break; }
    }
  }

  // Prometheus klasik gövde: return(function(...)local X={"\055\074..." ...
  const prologue = src.slice(0, 4000);
  if (/^\s*return\s*\(\s*function\s*\(\s*\.\.\.\s*\)\s*local\s+[\w$]{1,4}\s*=\s*\{\s*"/.test(prologue)) {
    add('prometheus', 6);
    const escapes = (src.slice(0, 200000).match(/\\\d{2,3}/g) || []).length;
    if (escapes > 50) add('prometheus', 4);
  }

  // Luraph VM gövdesi
  if (/return\s+setmetatable\(\s*\{/.test(src.slice(0, 65536)) &&
      /\[\s*\d+\s*\]\s*=\s*(bit32|buffer|string|table|math)\./.test(src.slice(0, 200000))) {
    add('luraph', 5);
  }

  return [...scores.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}

/* ------------------------------------------------------------------ */
/* araç tanımları                                                     */
/* ------------------------------------------------------------------ */

/**
 * Her araç: id, label, requires, detectOnly (kendi tespiti var mı),
 * fallbackOrder, run(ctx)
 *
 * ctx: { input, dir, base, outDir, keepLuac, all, log }
 */

function outPaths(ctx, toolId, ext) {
  const tag = ctx.all ? `.${toolId}` : '';
  const name = ctx.base + '.deob' + tag + (ext || '.lua');
  return path.join(ctx.outDir, name);
}

// --timeout (saniye) verilmişse onu, yoksa aracın varsayılanını kullan
function tmo(ctx, def) {
  return ctx.timeout ? ctx.timeout * 1000 : def;
}

const TOOLS = [
  {
    id: 'prometheus',
    label: 'Prometheus (LeakD, JS)',
    fallbackOrder: 1,
    availability() { return exists(path.join(PATHS.prometheus, 'bin', 'pdeobf.js')); },
    requires: 'Node.js',
    run(ctx) {
      const out = outPaths(ctx, 'prometheus', '.lua');
      rm(out);
      const r = run(process.execPath,
        [path.join(PATHS.prometheus, 'bin', 'pdeobf.js'), ctx.input, '-o', out],
        { cwd: PATHS.prometheus, timeout: tmo(ctx, 180000) });
      if (r.status === 3) return { ok: false, notThis: true, message: 'Prometheus değil' };
      const ok = sizeOf(out) > 0 && r.status === 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },

  {
    id: 'clyde',
    label: 'Clyde (JS)',
    fallbackOrder: 2,
    availability() { return exists(path.join(PATHS.clyde, 'cli.js')); },
    requires: 'Node.js',
    run(ctx) {
      const out = outPaths(ctx, 'clyde', '.lua');
      rm(out);
      const r = run(process.execPath,
        [path.join(PATHS.clyde, 'cli.js'), ctx.input, '-o', out],
        { cwd: PATHS.clyde, timeout: tmo(ctx, 180000) });
      const ok = sizeOf(out) > 0 && r.status === 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },

  {
    id: 'luaobf',
    label: 'LuaObfuscator / LeakD (JS)',
    fallbackOrder: 3,
    availability() { return exists(path.join(PATHS.luaobf, 'index.js')); },
    requires: 'Node.js',
    run(ctx) {
      const out = outPaths(ctx, 'luaobf', '.lua');
      rm(out);
      const r = run(process.execPath,
        [path.join(PATHS.luaobf, 'index.js'), ctx.input, '--out', out],
        { cwd: PATHS.luaobf, timeout: tmo(ctx, 180000) });
      const ok = sizeOf(out) > 0 && r.status === 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },

  {
    id: 'ironveil',
    label: 'Ironveil V1 (JS)',
    fallbackOrder: 4,
    availability() { return exists(path.join(PATHS.ironveil, 'deobfuscator', 'index.js')); },
    requires: 'Node.js',
    run(ctx) {
      const out = outPaths(ctx, 'ironveil', '.lua');
      rm(out);
      const r = run(process.execPath,
        [path.join(PATHS.ironveil, 'deobfuscator', 'index.js'), ctx.input, out],
        { cwd: PATHS.ironveil, timeout: tmo(ctx, 180000) });
      const ok = sizeOf(out) > 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },

  {
    id: 'hercules',
    label: 'Hercules (Python)',
    fallbackOrder: 5,
    availability() { return !!findPython() && exists(path.join(PATHS.hercules, 'deobfhercules.py')); },
    requires: 'Python 3.10+',
    unavailableHint: 'Python 3.10+ kurun (PATH\'e ekleyin)',
    run(ctx) {
      const py = findPython();
      if (!py) return { ok: false, message: 'Python bulunamadı' };
      const out = outPaths(ctx, 'hercules', '.lua');
      rm(out);
      const r = run(py.cmd, py.prefix.concat([
        path.join(PATHS.hercules, 'deobfhercules.py'), ctx.input, out,
      ]), { cwd: PATHS.hercules, timeout: tmo(ctx, 180000) });
      const ok = sizeOf(out) > 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },

  {
    id: 'moonsec',
    label: 'MoonSec V3 (C#, .luac + decompile)',
    fallbackOrder: 6,
    availability() { return !!findMoonExe(); },
    requires: '.NET 9 SDK (Kurulum.bat ile derlenir)',
    unavailableHint: 'Kurulum.bat çalıştırın (dotnet build -c Release)',
    run(ctx) {
      const exe = findMoonExe();
      if (!exe) return { ok: false, message: 'MoonsecDeobfuscator derlenmemiş (Kurulum.bat)' };
      const luac = outPaths(ctx, 'moonsec', '.luac');
      rm(luac);
      const args = ['-dev', '-i', ctx.input, '-o', luac];
      const r = exe.viaDotnet
        ? run('dotnet', [exe.path].concat(args), { cwd: PATHS.moonsec, timeout: tmo(ctx, 300000) })
        : run(exe.path, args, { cwd: PATHS.moonsec, timeout: tmo(ctx, 300000) });
      if (sizeOf(luac) === 0) {
        return { ok: false, message: tail(r.stderr) || tail(r.stdout) || 'çıktı üretilemedi' };
      }
      const out = outPaths(ctx, 'moonsec', '.lua');
      rm(out);
      const dec = decompileLuac(luac, out);
      if (!dec) {
        // derleyici yoksa/başarısızsa bytecode'u olduğu gibi bırak
        return { ok: true, output: luac, message: 'yalnızca bytecode (decompiler başarısız)' };
      }
      if (!ctx.keepLuac) { try { fs.unlinkSync(luac); } catch {} }
      return { ok: true, output: dec };
    },
  },

  {
    id: 'f77',
    label: '77fuscator (C#, .luac + decompile)',
    fallbackOrder: 7,
    availability() { return !!find77Exe(); },
    requires: '.NET 8 runtime (önceden derlenmiş exe pakette)',
    unavailableHint: '77fuscator bin/Debug/net8.0/deobfuscator.exe bulunamadı',
    run(ctx) {
      const exe = find77Exe();
      if (!exe) return { ok: false, message: 'deobfuscator.exe bulunamadı' };
      const luac = outPaths(ctx, 'f77', '.luac');
      rm(luac);
      const r = run(exe, [ctx.input, '-o', luac, '--strings'], { cwd: PATHS.f77, timeout: tmo(ctx, 300000) });
      if (sizeOf(luac) === 0) {
        return { ok: false, message: tail(r.stderr) || tail(r.stdout) || 'çıktı üretilemedi' };
      }
      const out = outPaths(ctx, 'f77', '.lua');
      rm(out);
      const dec = decompileLuac(luac, out);
      if (!dec) return { ok: true, output: luac, message: 'yalnızca bytecode (decompiler başarısız)' };
      if (!ctx.keepLuac) { try { fs.unlinkSync(luac); } catch {} }
      return { ok: true, output: dec };
    },
  },

  {
    id: 'ib2',
    label: 'IronBrew2 / IB2 (C#, .luac + decompile)',
    fallbackOrder: 8,
    availability() { return exists(path.join(PATHS.ib2, 'LuaAnalysis.Ironbrew2' + EXE)); },
    requires: '.NET runtime',
    unavailableHint: 'ib2deobf/LuaAnalysis.Ironbrew2.exe bulunamadı',
    run(ctx) {
      const exe = path.join(PATHS.ib2, 'LuaAnalysis.Ironbrew2' + EXE);
      if (!exists(exe)) return { ok: false, message: 'Ironbrew2 exe bulunamadı' };
      const luac = outPaths(ctx, 'ib2', '.luac');
      rm(luac);
      const r = run(exe, [ctx.input, luac], { cwd: PATHS.ib2, timeout: tmo(ctx, 300000) });
      if (sizeOf(luac) === 0) {
        return { ok: false, message: tail(r.stderr) || tail(r.stdout) || 'çıktı üretilemedi' };
      }
      const out = outPaths(ctx, 'ib2', '.lua');
      rm(out);
      const dec = decompileLuac(luac, out);
      if (!dec) return { ok: true, output: luac, message: 'yalnızca bytecode (decompiler başarısız)' };
      if (!ctx.keepLuac) { try { fs.unlinkSync(luac); } catch {} }
      return { ok: true, output: dec };
    },
  },

  {
    id: 'luraph',
    label: 'Luraph v15 (JS + Python backend)',
    fallbackOrder: 20,
    availability() { return exists(path.join(PATHS.luraph, 'deob.js')) && !!findPython(); },
    requires: 'Node.js + Python 3.10+',
    unavailableHint: 'Python 3.10+ kurun',
    run(ctx) {
      if (!findPython()) return { ok: false, message: 'Python bulunamadı' };
      const out = outPaths(ctx, 'luraph', '.lua');
      rm(out);
      const r = run(process.execPath,
        [path.join(PATHS.luraph, 'deob.js'), ctx.input, '-o', out],
        { cwd: PATHS.luraph, timeout: tmo(ctx, 600000) });
      const ok = sizeOf(out) > 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },

  {
    id: 'moonveil',
    label: 'Moonveil (Python, statik/kısmi)',
    fallbackOrder: 21,
    availability() { return !!findPython() && exists(path.join(PATHS.moonveil, 'moonveil_decompile.py')); },
    requires: 'Python 3 + luau (PATH)',
    unavailableHint: 'Python kurun; luau ayrıca PATH\'te olmalı',
    run(ctx) {
      const py = findPython();
      const out = outPaths(ctx, 'moonveil', '.lua');
      rm(out);
      const r = run(py.cmd, py.prefix.concat([
        path.join(PATHS.moonveil, 'moonveil_decompile.py'), ctx.input, out,
      ]), { cwd: PATHS.moonveil, timeout: tmo(ctx, 300000) });
      const ok = sizeOf(out) > 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },

  {
    id: 'promdeobf',
    label: 'Prometheus alternatif (promdeobf, deneysel)',
    fallbackOrder: 22,
    availability() { return exists(path.join(PATHS.promdeobf, 'main.js')) && hasNodeModule(PATHS.promdeobf, 'luau-web'); },
    requires: 'Node.js + `npm i luau-web`',
    unavailableHint: 'promdeobf klasöründe "npm install luau-web" gerekli',
    run(ctx) {
      const out = outPaths(ctx, 'promdeobf', '.lua');
      rm(out);
      const r = run(process.execPath,
        [path.join(PATHS.promdeobf, 'main.js'), ctx.input, out],
        { cwd: PATHS.promdeobf, timeout: tmo(ctx, 300000) });
      const ok = sizeOf(out) > 0;
      return { ok, output: ok ? out : null, message: ok ? '' : tail(r.stderr) || tail(r.stdout) };
    },
  },
];

function hasNodeModule(dir, name) {
  if (!exists(path.join(dir, 'node_modules'))) return false;
  return exists(path.join(dir, 'node_modules', ...name.split('/')));
}

function findMoonExe() {
  const candidates = [
    ...['Release', 'Debug'].map((cfg) => path.join(PATHS.moonsec, 'bin', cfg, 'net9.0', 'MoonsecDeobfuscator' + EXE)),
    ...['Release', 'Debug'].map((cfg) => path.join(PATHS.moonsec, 'bin', cfg, 'net9.0', 'MoonsecDeobfuscator.dll')),
  ];
  for (const c of candidates) {
    if (exists(c)) {
      if (c.endsWith('.dll')) return { path: c, viaDotnet: true };
      return { path: c, viaDotnet: false };
    }
  }
  // yayınlanmış (publish) çıktı
  const pub = path.join(PATHS.moonsec, 'publish', 'MoonsecDeobfuscator' + EXE);
  if (exists(pub)) return { path: pub, viaDotnet: false };
  return null;
}

function find77Exe() {
  const candidates = [
    path.join(PATHS.f77, 'bin', 'Release', 'net8.0', 'deobfuscator' + EXE),
    path.join(PATHS.f77, 'bin', 'Debug', 'net8.0', 'deobfuscator' + EXE),
  ];
  return candidates.find(exists) || null;
}

/* ------------------------------------------------------------------ */
/* dosya toplama                                                      */
/* ------------------------------------------------------------------ */

const INPUT_EXT = new Set(['.lua', '.luau', '.txt', '.luac']);

function looksLikeInput(file) {
  const lower = file.toLowerCase();
  if (lower.endsWith('.lua.txt')) return true;
  return INPUT_EXT.has(path.extname(lower));
}

function collectInputs(arg) {
  const out = [];
  if (isDir(arg)) {
    for (const entry of fs.readdirSync(arg)) {
      const full = path.join(arg, entry);
      if (isDir(full)) continue;
      if (looksLikeInput(full)) out.push(full);
    }
  } else if (exists(arg)) {
    out.push(arg);
  }
  return out;
}


/* ------------------------------------------------------------------ */
/* bilinen düzeltmeler                                                */
/* ------------------------------------------------------------------ */

/**
 * Prometheus aracının yayınlanan kopyasında `UNPRINTABLE_POINTS` sabiti
 * tanımlı değil (format.js onu kullanıyor). Arşiv yeniden açıldığında
 * düzeltmenin kaybolmaması için burada idempotent olarak ekliyoruz.
 */
function ensurePrometheusPatch() {
  const file = path.join(PATHS.prometheus, 'src', 'lua', 'format.js');
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch { return; }
  if (/const UNPRINTABLE_POINTS\s*=/.test(src)) return;
  const decl = [
    '// Code points that must not be emitted verbatim into Lua source',
    '// (invisible formatting characters / BOM). Restored by tools/deob.js.',
    'const UNPRINTABLE_POINTS = new Set([',
    '  0x00ad, 0x061c, 0x180e, 0x200b, 0x200c, 0x200d, 0x200e, 0x200f,',
    '  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2060, 0x2066, 0x2067,',
    '  0x2068, 0x2069, 0xfeff,',
    ']);',
    '',
  ].join('\n');
  const anchor = /const UNARY_PREC\s*=\s*11;/;
  try {
    if (anchor.test(src)) src = src.replace(anchor, decl + 'const UNARY_PREC = 11;');
    else src = src.replace(/^(?='use strict';)/, decl);
    fs.writeFileSync(file, src, 'utf8');
  } catch { /* yazılamıyorsa sessizce geç */ }
}

/* ------------------------------------------------------------------ */
/* ana akış                                                           */
/* ------------------------------------------------------------------ */

const FALLBACK_ORDER = ['prometheus', 'clyde', 'luaobf', 'ironveil', 'hercules', 'moonsec', 'f77', 'ib2'];

function toolById(id) {
  return TOOLS.find((t) => t.id === id) || null;
}

function processFile(file, opts) {
  const abs = path.resolve(file);
  const base = path.basename(abs, path.extname(abs)).replace(/\.lua$/i, '');
  const dir = opts.outdir ? path.resolve(opts.outdir) : path.dirname(abs);
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}

  console.log('');
  console.log('==================================================');
  console.log('  Dosya : ' + abs);
  console.log('  Boyut : ' + (sizeOf(abs) / 1024).toFixed(1) + ' KB');

  // Doğrudan bytecode verilmişse tek iş: decompile
  if (path.extname(abs).toLowerCase() === '.luac') {
    const out = path.join(dir, base + '.deob.lua');
    const dec = decompileLuac(abs, out);
    if (dec) {
      console.log('  [>] decompile   çalışıyor... OK');
      console.log('      -> ' + dec);
      return { ok: 1, fail: 0 };
    }
    console.log('  [!] Bytecode decompile edilemedi (lua5.1 / decom.lua bulunamadı).');
    return { ok: 0, fail: 1 };
  }

  const buf = fs.readFileSync(abs);
  const src = buf.toString('latin1');
  const families = detect(src);

  console.log('  Tespit: ' + (families.length ? families.join(', ') : 'bilinmiyor'));

  let plan;
  if (opts.tool) {
    const t = toolById(opts.tool);
    if (!t) { console.log('  [!] Bilinmeyen araç: ' + opts.tool); return { ok: 0, fail: 1 }; }
    plan = [t];
  } else if (opts.all) {
    plan = TOOLS.filter((t) => t.availability());
  } else if (families.length) {
    plan = families.map(toolById).filter(Boolean);
    if (families.includes('luarmor') && plan.length === 0) {
      console.log('  [!] Luarmor loader dosyası: payload devirtualize edilemez.');
      return { ok: 0, fail: 1 };
    }
  } else {
    plan = FALLBACK_ORDER.map(toolById).filter((t) => t && t.availability());
    console.log('  [i] Bilinen imza yok; araçlar sırayla denenecek.');
  }

  const ctx = { input: abs, dir, base, outDir: dir, keepLuac: opts.keepLuac, all: opts.all, timeout: opts.timeout };
  let ok = 0;
  let fail = 0;

  for (const tool of plan) {
    if (!tool.availability()) {
      console.log('  [~] ' + pad(tool.id, 11) + ' atlandı  (' + (tool.unavailableHint || tool.requires || 'yok') + ')');
      fail += 1;
      continue;
    }
    process.stdout.write('  [>] ' + pad(tool.id, 11) + ' çalışıyor... ');
    const t0 = Date.now();
    let res;
    try {
      res = tool.run(ctx);
    } catch (e) {
      res = { ok: false, message: (e && e.message) || String(e) };
    }
    const ms = Date.now() - t0;

    if (res.ok && res.output) {
      ok += 1;
      console.log('OK  (' + (ms / 1000).toFixed(1) + 's)');
      console.log('      -> ' + res.output +
        (res.message ? '   [' + res.message + ']' : ''));
      if (!opts.all) break;
    } else {
      fail += 1;
      console.log('başarısız  (' + (ms / 1000).toFixed(1) + 's)' +
        (res.notThis ? '  [imza uyuşmadı]' : ''));
      if (res.message) {
        const msg = String(res.message).trim().split('\n').slice(-4).join('\n        ');
        console.log('        ' + msg);
      }
      if (!opts.all && families.length === 1 && plan.length === 1) break;
    }
  }

  if (ok === 0) {
    console.log('  [!] Bu dosya mevcut araçlarla çözülemedi.');
    console.log('      Dosya bilinmeyen bir obfuscator ile korunmuş olabilir ya da');
    console.log('      ilgili araç derlenmemiş olabilir (bkz. Kurulum.bat).');
    console.log('      Tüm araçları yine de denemek için: --all');
  }

  return { ok, fail };
}

function doctor() {
  console.log('Araç durumu');
  console.log('-----------');
  const py = findPython();
  const nodeV = process.versions.node;
  console.log(pad('Node.js', 12) + ': ' + nodeV);
  console.log(pad('Python', 12) + ': ' + (py ? (py.cmd + ' ' + py.prefix.join(' ')).trim() : 'BULUNAMADI'));
  console.log(pad('lua5.1', 12) + ': ' + (decompilerBin() || 'BULUNAMADI (bytecode -> kaynak dönüşümü yok)'));
  const dotnet = run('dotnet', ['--version'], { timeout: 20000 });
  console.log(pad('dotnet', 12) + ': ' + (!dotnet.error && dotnet.status === 0 ? dotnet.stdout.trim() : 'BULUNAMADI'));
  console.log('');
  console.log(pad('ID', 12) + pad('DURUM', 12) + 'ARAÇ');
  console.log('-'.repeat(72));
  for (const t of TOOLS) {
    const av = t.availability();
    console.log(pad(t.id, 12) + pad(av ? 'HAZIR' : 'YOK', 12) + t.label +
      (av ? '' : '  <- ' + (t.unavailableHint || t.requires || '')));
  }
  console.log('');
}

function main(argv) {
  const opts = { all: false, keepLuac: false, tool: null, outdir: null, timeout: null };
  const inputs = [];

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--all') opts.all = true;
    else if (a === '--keep-luac') opts.keepLuac = true;
    else if (a === '--tool') opts.tool = argv[++i];
    else if (a === '--outdir' || a === '--out') opts.outdir = argv[++i];
    else if (a === '--timeout') opts.timeout = parseInt(argv[++i], 10);
    else if (a === '--list') { listTools(); return 0; }
    else if (a === '--doctor') { doctor(); return 0; }
    else if (a === '--help' || a === '-h' || a === '/?') { usage(); return 0; }
    else if (a.startsWith('-')) { console.log('Bilinmeyen seçenek: ' + a); usage(); return 2; }
    else inputs.push(a);
  }

  if (!inputs.length) { usage(); return 2; }

  ensurePrometheusPatch();

  let files = [];
  for (const arg of inputs) {
    const found = collectInputs(arg);
    if (!found.length) console.log('[!] Girdi bulunamadı: ' + arg);
    files = files.concat(found);
  }
  if (!files.length) { console.log('[!] İşlenecek .lua/.luau/.txt dosyası yok.'); return 1; }

  let ok = 0;
  let fail = 0;
  for (const f of files) {
    const r = processFile(f, opts);
    ok += r.ok;
    fail += r.fail;
  }

  console.log('');
  console.log('==================================================');
  console.log('  Özet: ' + files.length + ' dosya, ' + ok + ' başarılı araç çalışması, ' + fail + ' başarısız.');
  return ok > 0 ? 0 : 1;
}

function listTools() {
  console.log(pad('ID', 12) + pad('DURUM', 12) + 'ARAÇ');
  console.log('-'.repeat(72));
  for (const t of TOOLS) {
    console.log(pad(t.id, 12) + pad(t.availability() ? 'HAZIR' : 'YOK', 12) + t.label);
  }
}

function usage() {
  console.log([
    'Kullanım:',
    '  node tools/deob.js <dosya veya klasör> [seçenekler]',
    '',
    'Seçenekler:',
    '  --all              Tüm araçları dene (her biri ayrı çıktı dosyası)',
    '  --tool <id>        Yalnızca belirtilen aracı çalıştır',
    '  --outdir <klasör>  Çıktı klasörü',
    '  --keep-luac        Ara .luac dosyalarını sakla',
    '  --list             Araçları listele',
    '  --doctor           Bağımlılık raporu',
    '  --help             Yardım',
  ].join('\n'));
}

process.exitCode = main(process.argv.slice(2));
