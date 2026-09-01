'use strict';

/**
 * İŞKUR E-Şube Otomasyon Backend
 * Express.js API Server
 */

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { EventEmitter } = require('events');

const { PortalClient } = require('./portalClient');
const { parseExcel, getPersonsToProcess } = require('./excelParser');
const { IskurAuthClient } = require('./authClient');
const { requireAdmin } = require('./auth');

/* Progress dosyası — işlenen TC'leri saklar, sistem kapanırsa kaldığı yerden
   devam eder. Container yeniden kurulduğunda ilerleme kaybolmasın diye kalıcı
   bir volume'e yazılır (PROGRESS_DIR). */
const PROGRESS_DIR = process.env.PROGRESS_DIR || __dirname;
const PROGRESS_FILE = path.join(PROGRESS_DIR, 'progress.json');

try {
  fs.mkdirSync(PROGRESS_DIR, { recursive: true });
} catch (e) {
  console.error('Progress dizini oluşturulamadı:', e.message);
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
      return JSON.parse(raw); // { programNo, month, year, processedTCs: ['tc1','tc2',...] }
    }
  } catch {}
  return null;
}

function saveProgress(programNo, month, year, processedTCs) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ programNo, month, year, processedTCs }, null, 2));
  } catch (e) {
    console.error('Progress kaydetme hatası:', e.message);
  }
}

function clearProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  } catch {}
}

const app = express();
const PORT = process.env.PORT || 3001;

// Gerçek istemci IP adresini alabilmek için ters vekil sunucuya (Nginx, Ngrok vb.) güven
app.set('trust proxy', 1);

// ─────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────
// Güvenlik başlıkları (X-Frame-Options, CSP, X-Content-Type-Options vb.)
app.use(helmet());

// Tüm endpoint'lere 15 dk pencerede max 300 istek — DoS koruması
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' },
});
app.use(globalLimiter);

// Wildcard yerine izin verilen origin — CORS wildcard CVE önlemi
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:80',
  credentials: true,
}));
app.use(express.json({ limit: '256kb' }));

/* Healthcheck ucu — requireAdmin'den önce tanımlanır ki Docker
   healthcheck'i 401 almasın. Hiçbir iş verisi döndürmez. */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    isRunning: processState.isRunning,
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

/* /api altındaki her şey admin oturumu ister: canlı log akışı, öğrenci
   ad-soyadları, işi durdurma ve log silme yetkisiz erişime kapalıdır. */
app.use('/api', requireAdmin);

/* Multer — Excel dosyası upload (memory storage).
   Zip bomb'a karşı: 5 MB boyut sınırı, parça/alan sınırları, MIME kontrolü ve
   parse öncesi magic byte doğrulaması (excelParser.js). */
const ALLOWED_EXCEL_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const okExt = ext === '.xlsx' || ext === '.xls';
    const okMime = ALLOWED_EXCEL_MIMES.has(file.mimetype);
    if (okExt && okMime) {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel dosyaları kabul edilir (.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024,  // 1000 satırlık dosya ≈ 300-800 KB; 5 MB fazlasıyla yeter
    files: 1,
    fields: 10,
    parts: 15,
  },
});

// ─────────────────────────────────────────────
// GLOBAL İŞLEM STATE
// ─────────────────────────────────────────────
let processState = {
  isRunning: false,
  lastProgressAt: null,
  totalTC: 0,
  processedTC: 0,
  successTC: 0,
  errorTC: 0,
  logs: [],
  tcResults: [], // { tc, adSoyad, success, message } her TC için sonuç
  startTime: null,
};

// SSE için event emitter
const processEvents = new EventEmitter();
// 11. eşzamanlı SSE istemcisinde MaxListenersExceededWarning çıkıyordu
processEvents.setMaxListeners(50);

function resetState() {
  processState = {
    isRunning: false,
    totalTC: 0,
    processedTC: 0,
    successTC: 0,
    errorTC: 0,
    logs: [],
    tcResults: [],
    startTime: null,
    lastProgressAt: null,
  };
}

/* SSE yayın sınırları: log listesi ring buffer'da tutulur, stats saniyede en
   fazla bir kez ve tcResults dizisi olmadan yayınlanır. 1000 kişilik bir işte
   ~15.000 log üretiliyor; her birinde tüm sonuç dizisini serileştirmek istemci
   başına GB'larca trafik demekti. */
const MAX_LOGS = 500;
const STATS_THROTTLE_MS = 1000;
let lastStatsEmit = 0;

function emitStatsThrottled(force = false) {
  const now = Date.now();
  if (force || now - lastStatsEmit >= STATS_THROTTLE_MS) {
    lastStatsEmit = now;
    processEvents.emit('stats', getStats());
  }
}

/* TC maskesi: yalnızca ilk 2 + son 2 hane açık kalır. */
function maskTc(tc) {
  if (!tc || tc.length < 11) return '***********';
  return `${tc.slice(0, 2)}${'*'.repeat(tc.length - 4)}${tc.slice(-2)}`;
}

function addLog(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString('tr-TR');
  const logEntry = { timestamp, message, level };
  processState.logs.push(logEntry);
  if (processState.logs.length > MAX_LOGS) processState.logs.shift();

  // SSE ile frontend'e gönder
  processEvents.emit('log', logEntry);
  emitStatsThrottled();

  // Console'a da yaz
  console.log(`[${timestamp}] ${message}`);
}

function getStats() {
  const elapsed = processState.startTime
    ? Math.floor((Date.now() - processState.startTime) / 1000)
    : 0;

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return {
    isRunning: processState.isRunning,
    totalTC: processState.totalTC,
    processedTC: processState.processedTC,
    successTC: processState.successTC,
    errorTC: processState.errorTC,
    remainingTC: processState.totalTC - processState.processedTC,
    progress: processState.totalTC > 0
      ? Math.round((processState.processedTC / processState.totalTC) * 100)
      : 0,
    elapsedTime: `${hh}:${mm}:${ss}`,
    // Tüm sonuç dizisi yerine yalnızca sayısı — dizi /api/results'tan sayfalı alınır
    resultCount: processState.tcResults.length,
  };
}

// ─────────────────────────────────────────────
// SSE ENDPOINT - Gerçek zamanlı log akışı
// ─────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  /* Wildcard CORS başlığı bilinçli olarak yok: cookie tabanlı auth ile
     birlikte yanlış olurdu ve app.use(cors({origin})) ayarını ezerdi. */

  // Bağlantı kurulduğunda mevcut state'i gönder
  res.write(`data: ${JSON.stringify({ type: 'init', stats: getStats(), logs: processState.logs })}\n\n`);

  const onLog = (entry) => {
    res.write(`data: ${JSON.stringify({ type: 'log', entry })}\n\n`);
  };

  const onStats = (stats) => {
    res.write(`data: ${JSON.stringify({ type: 'stats', stats })}\n\n`);
  };

  processEvents.on('log', onLog);
  processEvents.on('stats', onStats);

  // Keep-alive ping
  const ping = setInterval(() => {
    res.write(':ping\n\n');
  }, 15000);

  req.on('close', () => {
    processEvents.off('log', onLog);
    processEvents.off('stats', onStats);
    clearInterval(ping);
  });
});

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

/**
 * GET /api/stats - Mevcut işlem istatistiklerini al
 */
app.get('/api/stats', (req, res) => {
  res.json({ success: true, data: getStats() });
});

/**
 * GET /api/logs - Tüm logları al
 */
app.get('/api/logs', (req, res) => {
  res.json({ success: true, data: processState.logs });
});

/** GET /api/results — işlem sonuçlarını sayfalı getirir (SSE stats'a girmez). */
app.get('/api/results', (req, res) => {
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));

  res.json({
    success: true,
    data: {
      total: processState.tcResults.length,
      items: processState.tcResults.slice(offset, offset + limit),
    },
  });
});

/* POST /api/process/force-reset — takılan işi sıfırlar. isRunning bir await
   içinde asılı kalırsa container'ı yeniden başlatmadan kurtarmanın yolu bu. */
app.post('/api/process/force-reset', (req, res) => {
  addLog(`🧯 Bot durumu ${req.user.username} tarafından zorla sıfırlandı`, 'warning');
  resetState();
  emitStatsThrottled(true);
  res.json({ success: true, message: 'Bot durumu sıfırlandı' });
});

/**
 * POST /api/logs/clear - Logları temizle
 */
app.post('/api/logs/clear', (req, res) => {
  console.log(`[bot] Loglar ${req.user.username} tarafından temizlendi`);
  processState.logs = [];
  processEvents.emit('log', { type: 'clear' });
  res.json({ success: true });
});

/**
 * POST /api/debug/excel - Excel dosyasını parse edip önizleme göster
 */
app.post('/api/debug/excel', upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Excel dosyası gerekli' });
    }

    const month = parseInt(req.body.month, 10);
    const year = parseInt(req.body.year, 10);

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Ay ve yıl gerekli' });
    }

    const persons = await parseExcel(req.file.buffer, month, year);
    const toProcess = getPersonsToProcess(persons);

    res.json({
      success: true,
      data: {
        totalPersons: persons.length,
        personsToProcess: toProcess.length,
        persons: persons.slice(0, 20), // İlk 20 kişi önizleme
      },
    });
  } catch (err) {
    // Ham Node/ExcelJS hata metni (dosya yolları, kütüphane sürümleri) sızmasın
    console.error('[bot] /api/debug/excel hatası:', err);
    res.status(400).json({ success: false, message: 'Dosya işlenemedi. Excel formatını kontrol edin.' });
  }
});

/**
 * POST /api/process/start - Ana işlemi başlat
 */
app.post('/api/process/start', upload.single('excel'), async (req, res) => {
  // Zaten çalışıyorsa hata
  if (processState.isRunning) {
    return res.status(409).json({ success: false, message: 'Zaten bir işlem devam ediyor' });
  }

  try {
    // Parametreleri al ve doğrula
    const {
      programNo,
      month,
      year,
      group,
      username,
      password,
    } = req.body;

    if (!req.file) return res.status(400).json({ success: false, message: 'Excel dosyası gerekli' });
    if (!programNo) return res.status(400).json({ success: false, message: 'Program numarası gerekli' });
    if (!month || !year) return res.status(400).json({ success: false, message: 'Ay ve yıl gerekli' });
    if (!username || !password) return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gerekli' });

    // Excel parse et
    const persons = await parseExcel(req.file.buffer, parseInt(month, 10), parseInt(year, 10));
    const toProcess = getPersonsToProcess(persons);

    if (!toProcess.length) {
      return res.status(400).json({ success: false, message: 'İşlenecek kişi bulunamadı (TC\'si olan ve en az 1 günü seçili)' });
    }

    // State'i resetle ve başlat
    resetState();
    processState.isRunning = true;
    processState.totalTC = toProcess.length;
    processState.startTime = Date.now();

    // Response'u hemen gönder (işlem arka planda devam edecek)
    res.json({
      success: true,
      message: `İşlem başlatıldı: ${toProcess.length} kişi işlenecek`,
      data: { totalTC: toProcess.length },
    });

    addLog(`👤 İşlemi başlatan: ${req.user.username}`, 'info');

    // Arka planda işlemi başlat (async, response beklemiyor)
    runProcess({
      persons: toProcess,
      month: parseInt(month, 10),
      year: parseInt(year, 10),
      group: group || null,
      username,
      password,
      programNo,
    }).catch((err) => {
      addLog(`❌ Kritik hata: ${err.message}`, 'error');
      processState.isRunning = false;
      processEvents.emit('stats', getStats());
    });

  } catch (err) {
    processState.isRunning = false;
    console.error('[bot] /api/process/start hatası:', err);
    res.status(400).json({ success: false, message: 'İşlem başlatılamadı. Excel dosyasını ve parametreleri kontrol edin.' });
  }
});

/**
 * POST /api/process/stop - İşlemi durdur
 */
app.post('/api/process/stop', (req, res) => {
  if (!processState.isRunning) {
    return res.json({ success: false, message: 'Çalışan işlem yok' });
  }
  processState.isRunning = false;
  console.log(`[bot] İşlem ${req.user.username} tarafından durduruldu`);
  addLog('🛑 İşlem kullanıcı tarafından durduruldu — işlenmiş TC\'ler progress dosyasında saklandı, tekrar başlatınca kaldığı yerden devam eder', 'warning');
  res.json({ success: true, message: 'İşlem durduruldu' });
});

// ─────────────────────────────────────────────
// ANA İŞLEM FONKSİYONU
// ─────────────────────────────────────────────
const RELOGIN_INTERVAL_MS = 10 * 60 * 1000; // 10 dakika

/* Süre sınırları. Akış bir `await` içinde asılı kalabildiği için (Playwright'ın
   page.goto'su, İŞKUR'un yanıt vermemesi) her adımın kendi üst sınırı var;
   sınırsız bekleyen bir adım `isRunning` bayrağını kalıcı olarak kilitler.

   Sahadaki hız kişi başına ~75 saniye: 300 kişilik bir yerleşke 6 saati aşıyor,
   1000 kişi 20 saatin üzerine çıkıyor. Bu yüzden genel sınır ve relogin süresi
   .env'den ayarlanabilir — İŞKUR yavaşladığında yeniden build gerekmesin. */
function envMinutes(name, fallbackMinutes) {
  const raw = Number(process.env[name]);
  if (raw === 0) return Infinity;        // 0 = sınır yok (eski davranış)
  const minutes = Number.isFinite(raw) && raw > 0 ? raw : fallbackMinutes;
  return minutes * 60 * 1000;
}

/* Sınırsız (Infinity) verilmişse Promise.race'e hiç girme — boşuna bir zamanlayıcı
   kurup event loop'u meşgul etmenin anlamı yok. */
function maybeTimeout(promise, ms, label) {
  return ms === Infinity ? promise : withTimeout(promise, ms, label);
}

/* Süre sınırlarını doğru ayarlayabilmek için gerçek hızın ölçülmesi gerekiyor:
   kişi başına kaç saniye, relogin kaç saniye. İŞKUR'un yüküne göre bu süreler
   ciddi değişiyor, bu yüzden loglara yazılıyor. */
function formatDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return `${m} dk ${rest} sn`;
  return `${Math.floor(m / 60)} sa ${m % 60} dk`;
}

const MAX_RUN_MS = envMinutes('BOT_MAX_RUN_MINUTES', 24 * 60);       // işin tamamı
const RELOGIN_TIMEOUT_MS = envMinutes('BOT_RELOGIN_TIMEOUT_MINUTES', 5);
const PERSON_TIMEOUT_MS = envMinutes('BOT_PERSON_TIMEOUT_MINUTES', 20);
const WATCHDOG_INTERVAL_MS = 60 * 1000;
const WATCHDOG_STALE_MS = 15 * 60 * 1000;      // uyar
const WATCHDOG_HARD_MS = envMinutes('BOT_WATCHDOG_MINUTES', 30);   // işi sonlandır
const MAX_CONSECUTIVE_TIMEOUTS = 3;

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: zaman aşımı (${ms} ms)`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/* Watchdog: ilerleme durmuşsa önce uyarır, WATCHDOG_HARD_MS sonra işi
   sonlandırır. Yalnızca log yazmak yetmez — kimse ekrana bakmıyorsa bayrak
   takılı kalır ve yeni iş başlatılamaz. */
setInterval(() => {
  if (!processState.isRunning) return;

  const since = Date.now() - (processState.lastProgressAt ?? processState.startTime ?? Date.now());

  if (since > WATCHDOG_HARD_MS) {
    addLog(
      '🧯 30 dakikadır ilerleme yok — iş otomatik olarak sonlandırıldı. '
      + 'İşlenmiş TC\'ler kayıtlı; tekrar başlatınca kaldığı yerden devam eder.',
      'error',
    );
    processState.isRunning = false;
    emitStatsThrottled(true);
    return;
  }

  if (since > WATCHDOG_STALE_MS) {
    addLog('⚠️ 15 dakikadır ilerleme yok — bot takılmış olabilir. Gerekirse "Zorla Sıfırla" kullanın.', 'warning');
    processState.lastProgressAt = Date.now();   // uyarıyı dakikada bir tekrarlama
  }
}, WATCHDOG_INTERVAL_MS).unref();

/**
 * Login yardımcı fonksiyonu - tekrar kullanılabilir
 */
async function runProcess({ persons, month, year, group, username, password, programNo }) {
  addLog(`🚀 İşlem başlatıldı: ${persons.length} kişi`, 'info');

  const deadline = Date.now() + MAX_RUN_MS;
  let consecutiveTimeouts = 0;
  const personDurations = [];

  let portalClient = null;
  let lastLoginTime = null;
  let attendanceUrl = null;
  const authClient = new IskurAuthClient((msg) => addLog(msg));

  // ── Progress: daha önce işlenmiş TC'leri yükle ────────────────
  const savedProgress = loadProgress();
  let processedTCSet = new Set();

  if (savedProgress &&
      savedProgress.programNo === programNo &&
      savedProgress.month === month &&
      savedProgress.year === year) {
    processedTCSet = new Set(savedProgress.processedTCs || []);
    if (processedTCSet.size > 0) {
      addLog(`📂 Kaldığı yerden devam: ${processedTCSet.size} TC daha önce işlenmiş, atlanıyor`, 'warning');
    }
  } else {
    // Farklı program/ay/yıl → progress'i temizle, baştan başla
    clearProgress();
    addLog(`🆕 Yeni işlem başlatıldı (önceki progress temizlendi)`, 'info');
  }

  try {
    // ── İlk login + Devam Çizelgesi aç ────────────────────────────
    // İŞKUR kurum kullanıcı adı loglara yazılmaz
    addLog(`🔐 İŞKUR'a login yapılıyor...`, 'info');
    const loginResult = await authClient.loginAndOpenCizelge(username, password, programNo);

    if (!loginResult.success) {
      addLog(`❌ Login başarısız: ${loginResult.message}`, 'error');
      await authClient.close();
      processState.isRunning = false;
      processEvents.emit('stats', getStats());
      return;
    }

    addLog(`✅ Login başarılı!`, 'success');
    addLog(`📌 Devam Çizelgesi URL: ${loginResult.attendanceUrl}`, 'info');

    attendanceUrl = loginResult.attendanceUrl;
    lastLoginTime = Date.now();

    portalClient = new PortalClient(
      'https://esube.iskur.gov.tr',
      loginResult.cookies,
      attendanceUrl,
      (msg) => addLog(msg)
    );

    // ── Her kişi için işlem ────────────────────────────────────────
    for (let i = 0; i < persons.length; i++) {

      // Durduruldu mu?
      if (!processState.isRunning) {
        addLog('🛑 İşlem durduruldu', 'warning');
        break;
      }

      // Genel süre sınırı
      if (Date.now() > deadline) {
        addLog(
          `⏱️ Maksimum çalışma süresi (${Math.round(MAX_RUN_MS / 3600000)} saat) aşıldı — işlem `
          + 'durduruluyor. İşlenmiş TC\'ler kayıtlı; tekrar başlatınca kaldığı yerden devam eder.',
          'error',
        );
        break;
      }

      const person = persons[i];

      // ── Zaten işlenmiş mi? ─────────────────────────────────────
      if (processedTCSet.has(person.tc)) {
        const maskedTc = maskTc(person.tc);
        addLog(`⏭️ Atlandı (zaten işlenmiş): ${person.adSoyad} (${maskedTc})`, 'warning');
        processState.processedTC++;
        processState.successTC++;
        processState.tcResults.push({
          tc: person.tc,
          adSoyad: person.adSoyad,
          success: true,
          message: 'Daha önce işlenmiş, atlandı'
        });
        processState.lastProgressAt = Date.now();
        emitStatsThrottled();
        continue;
      }

      // ── 10 dakika geçtiyse yeniden login ──────────────────────
      const elapsed = Date.now() - lastLoginTime;
      if (elapsed >= RELOGIN_INTERVAL_MS) {
        addLog(`🔄 10 dakika geçti, yeniden login yapılıyor...`, 'warning');

        /* withTimeout yalnızca beklemeyi bırakır, altındaki Playwright işini
           durdurmaz: arka planda tamamlanan bir relogin oturumu/çerezleri
           değiştirebilir ve portalClient eski çerezlerle İŞKUR'a yazmayı
           deneyebilir. Bu yüzden relogin zaman aşımında iş durdurulur. */
        let reloginResult;
        const reloginStart = Date.now();
        try {
          reloginResult = await maybeTimeout(
            authClient.relogin(username, password, programNo),
            RELOGIN_TIMEOUT_MS,
            'relogin',
          );
        } catch (err) {
          addLog(
            `❌ Yeniden login zaman aşımına uğradı — oturum durumu belirsiz, `
            + `işlem güvenli şekilde durduruluyor: ${err.message}`,
            'error',
          );
          processState.isRunning = false;
          break;
        }
        if (reloginResult.success) {
          lastLoginTime = Date.now();
          attendanceUrl = reloginResult.attendanceUrl || attendanceUrl;
          portalClient.setCookies(reloginResult.cookies);
          portalClient.attendanceUrl = attendanceUrl;
          addLog(`✅ Yeniden login başarılı (${formatDuration(Date.now() - reloginStart)})`, 'success');
        } else {
          addLog(`⚠️ Yeniden login başarısız: ${reloginResult.message} - devam ediliyor`, 'warning');
        }
      }

      const maskedTc = maskTc(person.tc);
      addLog(`👤 [${i + 1}/${persons.length}] ${person.adSoyad} (${maskedTc})`, 'info');

      const personStart = Date.now();
      let result;
      let timedOut = false;
      try {
        result = await maybeTimeout(
          portalClient.updateAttendanceForPerson(person.tc, month, year, person.dayFlags, group),
          PERSON_TIMEOUT_MS,
          'kişi işlemi',
        );
      } catch (err) {
        timedOut = true;
        result = { success: false, message: err.message };
      }

      /* Tek kişide zaman aşımı olabilir (o kişi hatalı sayılır), ama üst
         üste birkaç kişide olması oturumun tamamen bozulduğunu gösterir.
         Devam etmek, İŞKUR'a yazılmayan kayıtları "işlendi" saymak demektir. */
      if (timedOut) {
        consecutiveTimeouts++;
        if (consecutiveTimeouts >= MAX_CONSECUTIVE_TIMEOUTS) {
          addLog(
            `❌ Üst üste ${MAX_CONSECUTIVE_TIMEOUTS} kişide zaman aşımı — oturum bozulmuş `
            + `olabilir, işlem durduruluyor.`,
            'error',
          );
          processState.isRunning = false;
          processState.processedTC++;
          processState.errorTC++;
          break;
        }
      } else {
        consecutiveTimeouts = 0;
      }

      const personMs = Date.now() - personStart;
      personDurations.push(personMs);

      processState.processedTC++;
      processState.lastProgressAt = Date.now();
      if (result.success) {
        processState.successTC++;
        addLog(`✅ Başarılı: ${person.adSoyad} (${formatDuration(personMs)})`, 'success');
        processState.tcResults.push({ tc: person.tc, adSoyad: person.adSoyad, success: true, message: result.message });
        // Progress dosyasına kaydet (sistem kapanırsa kaldığı yerden devam etsin)
        processedTCSet.add(person.tc);
        saveProgress(programNo, month, year, [...processedTCSet]);
      } else {
        processState.errorTC++;
        addLog(`❌ Hata: ${person.adSoyad} - ${result.message}`, 'error');
        processState.tcResults.push({ tc: person.tc, adSoyad: person.adSoyad, success: false, message: result.message });
        // Hatalı TC'leri progress'e YAZMA — tekrar denensin
      }

      emitStatsThrottled();

      /* Her 25 kişide bir hız ve tahmini bitiş — hem kullanıcı ne kadar
         bekleyeceğini bilsin hem süre sınırları ölçüme göre ayarlanabilsin. */
      const remaining = persons.length - (i + 1);
      if (personDurations.length > 0 && (i + 1) % 25 === 0 && remaining > 0) {
        const avgMs = personDurations.reduce((a, b) => a + b, 0) / personDurations.length;
        addLog(
          `📊 Ortalama ${formatDuration(avgMs)}/kişi · kalan ${remaining} kişi · `
          + `tahmini bitiş ${formatDuration(avgMs * remaining)} sonra`,
          'info',
        );
      }

      // Kişiler arası kısa bekleme
      if (i < persons.length - 1) await sleep(300);
    }

  } catch (err) {
    addLog(`❌ Kritik hata: ${err.message}`, 'error');
  } finally {
    // Tarayıcıyı kapat
    await authClient.close();
    processState.isRunning = false;
    const stats = getStats();

    if (stats.processedTC === 0 && stats.successTC === 0 && stats.errorTC === 0) {
      // Login başarısız veya hiç işlem yapılmadı - zaten hata logu var
    } else {
      if (personDurations.length > 0) {
        const avgMs = personDurations.reduce((a, b) => a + b, 0) / personDurations.length;
        const slowest = Math.max(...personDurations);
        addLog(
          `📊 Hız özeti: ortalama ${formatDuration(avgMs)}/kişi, en yavaş `
          + `${formatDuration(slowest)}. Süre sınırlarını (BOT_*_MINUTES) bu değerlere göre ayarlayın.`,
          'info',
        );
      }

      addLog(
        `🏁 İşlem tamamlandı: ${stats.successTC} başarılı, ${stats.errorTC} hata`,
        stats.errorTC > 0 ? 'warning' : 'success'
      );
      // Tüm TC'ler işlendi ve hata yoksa progress'i temizle (temiz başlangıç)
      if (stats.errorTC === 0) {
        clearProgress();
        addLog('🗑️ Progress dosyası temizlendi (hata yok, temiz başlangıç hazır)', 'info');
      } else {
        addLog(`⚠️ ${stats.errorTC} hatalı TC progress'te tutulmuyor — tekrar başlatınca yeniden denenecek`, 'warning');
      }
    }
    emitStatsThrottled(true);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// HATA YÖNETİMİ
// ─────────────────────────────────────────────
/* Multer'ın fileFilter/limits hataları (yanlış uzantı, 5 MB üstü dosya) istemci
   hatasıdır; JSON gövdeli 400/413 döner. Aksi halde Express'in varsayılan
   işleyicisi HTML gövdeli 500 üretir ve istemci "Bağlantı hatası" gösterir. */
app.use((err, req, res, _next) => {
  if (res.headersSent) return;

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'Dosya çok büyük. En fazla 5 MB yükleyebilirsiniz.',
    });
  }

  if (err && typeof err.code === 'string' && err.code.startsWith('LIMIT_')) {
    return res.status(400).json({
      success: false,
      message: 'Yükleme reddedildi. Tek bir Excel dosyası gönderin.',
    });
  }

  // fileFilter'dan gelen "Sadece Excel dosyaları kabul edilir" gibi hatalar
  if (err && err.message && /Excel/i.test(err.message)) {
    return res.status(400).json({ success: false, message: err.message });
  }

  console.error('[bot] Beklenmeyen hata:', err);
  return res.status(500).json({ success: false, message: 'Sunucu hatası.' });
});

// ─────────────────────────────────────────────
// SERVER'I BAŞLAT
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ İŞKUR Bot Backend çalışıyor: http://localhost:${PORT}`);
});

module.exports = app;