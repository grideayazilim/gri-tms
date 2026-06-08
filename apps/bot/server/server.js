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

// Progress dosyası — işlenen TC'leri saklar, sistem kapanırsa kaldığı yerden devam eder
const PROGRESS_FILE = path.join(__dirname, 'progress.json');

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
app.use(express.json());

// Multer - Excel dosyası upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') {
      cb(null, true);
    } else {
      cb(new Error('Sadece Excel dosyaları kabul edilir (.xlsx, .xls)'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ─────────────────────────────────────────────
// GLOBAL İŞLEM STATE
// ─────────────────────────────────────────────
let processState = {
  isRunning: false,
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
  };
}

function addLog(message, level = 'info') {
  const timestamp = new Date().toLocaleTimeString('tr-TR');
  const logEntry = { timestamp, message, level };
  processState.logs.push(logEntry);

  // SSE ile frontend'e gönder
  processEvents.emit('log', logEntry);
  processEvents.emit('stats', getStats());

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
    tcResults: processState.tcResults,
  };
}

// ─────────────────────────────────────────────
// SSE ENDPOINT - Gerçek zamanlı log akışı
// ─────────────────────────────────────────────
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

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

/**
 * POST /api/logs/clear - Logları temizle
 */
app.post('/api/logs/clear', (req, res) => {
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
    res.status(500).json({ success: false, message: err.message });
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
    res.status(500).json({ success: false, message: err.message });
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
  addLog('🛑 İşlem kullanıcı tarafından durduruldu — işlenmiş TC\'ler progress dosyasında saklandı, tekrar başlatınca kaldığı yerden devam eder', 'warning');
  res.json({ success: true, message: 'İşlem durduruldu' });
});

// ─────────────────────────────────────────────
// ANA İŞLEM FONKSİYONU
// ─────────────────────────────────────────────
const RELOGIN_INTERVAL_MS = 10 * 60 * 1000; // 10 dakika

/**
 * Login yardımcı fonksiyonu - tekrar kullanılabilir
 */
async function runProcess({ persons, month, year, group, username, password, programNo }) {
  addLog(`🚀 İşlem başlatıldı: ${persons.length} kişi`, 'info');

  let portalClient = null;
  let lastLoginTime = null;
  let attendanceUrl = null;
  let consecutiveSessionFailures = 0;
  const MAX_SESSION_FAILURES = 3;
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
    addLog(`🔐 İŞKUR'a login yapılıyor: ${username}`, 'info');
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

      const person = persons[i];

      // ── Zaten işlenmiş mi? ─────────────────────────────────────
      if (processedTCSet.has(person.tc)) {
        const maskedTc = `${person.tc.slice(0, 4)}****${person.tc.slice(-2)}`;
        addLog(`⏭️ Atlandı (zaten işlenmiş): ${person.adSoyad} (${maskedTc})`, 'warning');
        processState.processedTC++;
        processState.successTC++;
        processState.tcResults.push({
          tc: person.tc,
          adSoyad: person.adSoyad,
          success: true,
          message: 'Daha önce işlenmiş, atlandı'
        });
        processEvents.emit('stats', getStats());
        continue;
      }

      // ── 10 dakika geçtiyse yeniden login ──────────────────────
      const elapsed = Date.now() - lastLoginTime;
      if (elapsed >= RELOGIN_INTERVAL_MS) {
        addLog(`🔄 10 dakika geçti, yeniden login yapılıyor...`, 'warning');

        const reloginResult = await authClient.relogin(username, password, programNo);
        if (reloginResult.success) {
          lastLoginTime = Date.now();
          attendanceUrl = reloginResult.attendanceUrl || attendanceUrl;
          portalClient.setCookies(reloginResult.cookies);
          portalClient.attendanceUrl = attendanceUrl;
          addLog(`✅ Yeniden login başarılı`, 'success');
        } else {
          addLog(`⚠️ Yeniden login başarısız: ${reloginResult.message} - devam ediliyor`, 'warning');
        }
      }

      const maskedTc = `${person.tc.slice(0, 4)}****${person.tc.slice(-2)}`;
      addLog(`👤 [${i + 1}/${persons.length}] ${person.adSoyad} (${maskedTc})`, 'info');

      const result = await portalClient.updateAttendanceForPerson(
        person.tc,
        month,
        year,
        person.dayFlags,
        group
      );

      // ── Oturum sonlanmış mı? Hemen relogin yap ve kişiyi tekrar dene ──
      if (result.sessionExpired) {
        addLog(`🔒 Oturum sonlanmış tespit edildi (${person.adSoyad}) — beklenmeden yeniden giriş yapılıyor...`, 'warning');

        const reloginResult = await authClient.relogin(username, password, programNo);
        if (reloginResult.success) {
          consecutiveSessionFailures = 0;
          lastLoginTime = Date.now();
          attendanceUrl = reloginResult.attendanceUrl || attendanceUrl;
          portalClient.setCookies(reloginResult.cookies);
          portalClient.attendanceUrl = attendanceUrl;
          addLog(`✅ Yeniden giriş başarılı, ${person.adSoyad} tekrar deneniyor`, 'success');
          i--; // bu kişiyi tekrar dene
          continue;
        }

        consecutiveSessionFailures++;
        addLog(`❌ Yeniden giriş başarısız (${consecutiveSessionFailures}/${MAX_SESSION_FAILURES}): ${reloginResult.message}`, 'error');

        if (consecutiveSessionFailures >= MAX_SESSION_FAILURES) {
          addLog(`🛑 Art arda ${MAX_SESSION_FAILURES} oturum yenileme hatası — işlem durduruluyor`, 'error');
          break;
        }

        // Bu kişiyi hata say ve devam et — bir sonraki kişide tekrar denenecek
        processState.processedTC++;
        processState.errorTC++;
        addLog(`❌ Hata: ${person.adSoyad} - Oturum yenilenemedi`, 'error');
        processState.tcResults.push({ tc: person.tc, adSoyad: person.adSoyad, success: false, message: 'Oturum yenilenemedi' });
        processEvents.emit('stats', getStats());
        continue;
      }

      consecutiveSessionFailures = 0;
      processState.processedTC++;
      if (result.success) {
        processState.successTC++;
        addLog(`✅ Başarılı: ${person.adSoyad}`, 'success');
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

      processEvents.emit('stats', getStats());

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
    processEvents.emit('stats', getStats());
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─────────────────────────────────────────────
// SERVER'I BAŞLAT
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ İŞKUR Bot Backend çalışıyor: http://localhost:${PORT}`);
});

module.exports = app;