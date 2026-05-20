import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.NODE_ENV === 'production' ? '/bot-api' : '';

const MONTHS = [
  { value: 1, label: 'Ocak' },
  { value: 2, label: 'Şubat' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Nisan' },
  { value: 5, label: 'Mayıs' },
  { value: 6, label: 'Haziran' },
  { value: 7, label: 'Temmuz' },
  { value: 8, label: 'Ağustos' },
  { value: 9, label: 'Eylül' },
  { value: 10, label: 'Ekim' },
  { value: 11, label: 'Kasım' },
  { value: 12, label: 'Aralık' },
];

const YEARS = [2024, 2025, 2026, 2027];

function App() {
  const [form, setForm] = useState({
    programNo: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    group: '1',
    username: '',
    password: '',
  });

  const [excelFile, setExcelFile] = useState(null);
  const [localElapsed, setLocalElapsed] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [stats, setStats] = useState({
    isRunning: false,
    totalTC: 0,
    processedTC: 0,
    successTC: 0,
    errorTC: 0,
    remainingTC: 0,
    progress: 0,
    elapsedTime: '00:00:00',
    tcResults: [],
  });
  const [debugTab, setDebugTab] = useState('all'); // 'all' | 'success' | 'error'
  const [logs, setLogs] = useState([]);
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  // SSE bağlantısı
  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/stream`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'init') {
        setStats(data.stats);
        setLogs(data.logs || []);
      } else if (data.type === 'log') {
        if (data.entry?.type === 'clear') {
          setLogs([]);
        } else {
          setLogs((prev) => [...prev, data.entry]);
        }
      } else if (data.type === 'stats') {
        setStats(data.stats);
      }
    };

    eventSourceRef.current = es;
    return () => es.close();
  }, []);

  // Canlı sayaç - işlem başlayınca tıklar
  useEffect(() => {
    if (stats.isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - (localElapsed * 1000);
      }
      timerRef.current = setInterval(() => {
        setLocalElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (!stats.isRunning && localElapsed > 0 && stats.processedTC === 0) {
        // Reset
        setLocalElapsed(0);
        startTimeRef.current = null;
      }
    }
    return () => clearInterval(timerRef.current);
  }, [stats.isRunning]);

  // Loglar güncellenince en alta kaydır
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const formatElapsed = (seconds) => {
    const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  };

  const handleReset = () => {
    setForm({
      programNo: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      group: '1',
      username: '',
      password: '',
    });
    setExcelFile(null);
    setLocalElapsed(0);
    startTimeRef.current = null;
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setExcelFile(e.target.files[0] || null);
  };

  const handleStart = async () => {
    if (!excelFile) return alert('Excel dosyası seçiniz');
    if (!form.programNo) return alert('Program numarası giriniz');
    if (!form.username || !form.password) return alert('Kullanıcı adı ve şifre giriniz');

    const formData = new FormData();
    formData.append('excel', excelFile);
    formData.append('programNo', form.programNo);
    formData.append('month', form.month);
    formData.append('year', form.year);
    formData.append('group', form.group);
    formData.append('username', form.username);
    formData.append('password', form.password);

    try {
      const res = await axios.post(`${API_URL}/api/process/start`, formData);
      if (!res.data.success) alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Bağlantı hatası');
    }
  };

  const handleStop = async () => {
    await axios.post(`${API_URL}/api/process/stop`);
  };

  const handleClearLogs = async () => {
    await axios.post(`${API_URL}/api/logs/clear`);
    setLogs([]);
  };

  const handleDebug = async () => {
    if (!excelFile) return alert('Excel dosyası seçiniz');
    const formData = new FormData();
    formData.append('excel', excelFile);
    formData.append('month', form.month);
    formData.append('year', form.year);

    try {
      const res = await axios.post(`${API_URL}/api/debug/excel`, formData);
      if (res.data.success) {
        const { totalPersons, personsToProcess, persons } = res.data.data;
        alert(`Toplam: ${totalPersons} kişi\nİşlenecek: ${personsToProcess} kişi\n\nİlk 5:\n${persons.slice(0, 5).map(p => `${p.adSoyad} (TC: ${p.tc || 'YOK'})`).join('\n')}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Hata');
    }
  };

  const getLogStyle = (level) => {
    switch (level) {
      case 'success': return { color: '#4ade80', background: 'rgba(74,222,128,0.08)', icon: '🟢' };
      case 'error':   return { color: '#f87171', background: 'rgba(248,113,113,0.08)', icon: '🔴' };
      case 'warning': return { color: '#fbbf24', background: 'rgba(251,191,36,0.08)',  icon: '🟠' };
      default:        return { color: '#94a3b8', background: 'transparent',            icon: '🔵' };
    }
  };

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">İŞKUR Bot</span>
          </div>
          <div className="header-status">
            {stats.isRunning
              ? <span className="badge badge-running">● Çalışıyor</span>
              : <span className="badge badge-idle">● Bekliyor</span>
            }
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="grid">

            {/* SOL PANEL - FORM */}
            <div className="panel form-panel">
              <h2 className="panel-title">E-Şube Portal İşlemleri</h2>
              <p className="panel-desc">
                Excel dosyası yükleyerek İŞKUR E-Şube portalında devam çizelgesi güncellemelerini yapabilirsiniz.
              </p>

              {/* Excel */}
              <div className="field">
                <label className="label">Excel Dosyası</label>
                <div className="file-input-wrapper">
                  <label className="file-btn">
                    <span>📂 Dosya Seç</span>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} hidden />
                  </label>
                  <span className="file-name">
                    {excelFile ? excelFile.name : 'Dosya seçilmedi'}
                  </span>
                </div>
              </div>

              {/* Program No */}
              <div className="field">
                <label className="label">Program Numarası</label>
                <input
                  className="input"
                  type="text"
                  name="programNo"
                  value={form.programNo}
                  onChange={handleFormChange}
                  placeholder="örn: 12085"
                />
              </div>

              {/* Ay & Yıl */}
              <div className="field-row">
                <div className="field">
                  <label className="label">Ay</label>
                  <select className="input" name="month" value={form.month} onChange={handleFormChange}>
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="label">Yıl</label>
                  <select className="input" name="year" value={form.year} onChange={handleFormChange}>
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grup */}
              <div className="field">
                <label className="label">Grup</label>
                <input
                  className="input"
                  type="text"
                  name="group"
                  value={form.group}
                  onChange={handleFormChange}
                  placeholder="örn: 1"
                />
              </div>

              {/* Kullanıcı Adı */}
              <div className="field">
                <label className="label">E-Şube Kullanıcı Adı</label>
                <input
                  className="input"
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleFormChange}
                  placeholder="Kullanıcı adınız"
                />
                <span className="hint">💡 Her 10 dakikada otomatik yeniden giriş yapılacak</span>
              </div>

              {/* Şifre */}
              <div className="field">
                <label className="label">E-Şube Şifre</label>
                <input
                  className="input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  placeholder="••••••••••"
                />
              </div>

              {/* Butonlar */}
              <div className="btn-group">
                {!stats.isRunning ? (
                  <button className="btn btn-primary" onClick={handleStart}>
                    ☁️ Excel Yükle ve İşlemi Başlat
                  </button>
                ) : (
                  <button className="btn btn-danger" onClick={handleStop}>
                    🛑 İşlemi Durdur
                  </button>
                )}
                <button className="btn btn-secondary" onClick={handleDebug}>
                  🔍 Debug: Excel Verilerini Göster
                </button>
                {!stats.isRunning && (
                  <button className="btn btn-reset" onClick={handleReset}>
                    🔄 Formu Sıfırla
                  </button>
                )}
              </div>
            </div>

            {/* SAĞ PANEL - İSTATİSTİK & LOGLAR */}
            <div className="right-panel">

              {/* İstatistikler */}
              <div className="panel stats-panel">
                <h2 className="panel-title">📊 İşlem İstatistikleri</h2>

                {/* Progress bar */}
                <div className="progress-wrapper">
                  <div className="progress-label">
                    <span>İlerleme</span>
                    <span className="progress-pct">{stats.progress}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${stats.progress}%` }} />
                  </div>
                </div>

                {/* Stat kartları */}
                <div className="stat-grid">
                  <div className="stat-card">
                    <div className="stat-label">Toplam TC</div>
                    <div className="stat-value">{stats.totalTC}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">İşlenen TC</div>
                    <div className="stat-value">{stats.processedTC}</div>
                  </div>
                  <div className="stat-card stat-success">
                    <div className="stat-label">Başarılı</div>
                    <div className="stat-value">{stats.successTC}</div>
                  </div>
                  <div className="stat-card stat-error">
                    <div className="stat-label">Hata</div>
                    <div className="stat-value">{stats.errorTC}</div>
                  </div>
                  <div className="stat-card stat-remaining">
                    <div className="stat-label">Kalan TC</div>
                    <div className="stat-value">{stats.remainingTC}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Geçen Süre</div>
                    <div className="stat-value stat-time">{formatElapsed(localElapsed)}</div>
                  </div>
                </div>
              </div>

              {/* Loglar */}
              <div className="panel logs-panel">
                <div className="logs-header">
                  <h2 className="panel-title">📋 İşlem Logları</h2>
                  <button className="btn-clear" onClick={handleClearLogs}>🗑 Temizle</button>
                </div>
                <div className="logs-container">
                  {logs.length === 0 && (
                    <div className="logs-empty">Henüz log yok...</div>
                  )}
                  {logs.map((log, i) => {
                    const style = getLogStyle(log.level);
                    return (
                      <div
                        key={i}
                        className="log-entry"
                        style={{ color: style.color, background: style.background }}
                      >
                        <span className="log-icon">{style.icon}</span>
                        <span className="log-time">[{log.timestamp}]</span>
                        <span className="log-msg">{log.message}</span>
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* TC Sonuç Raporu */}
              {(stats.tcResults || []).length > 0 && (
                <div className="panel" style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 className="panel-title">🧾 TC Sonuç Raporu</h2>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { key: 'all', label: `Tümü (${(stats.tcResults||[]).length})` },
                        { key: 'success', label: `✅ Başarılı (${(stats.tcResults||[]).filter(r=>r.success).length})` },
                        { key: 'error', label: `❌ Hatalı (${(stats.tcResults||[]).filter(r=>!r.success).length})` },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setDebugTab(tab.key)}
                          style={{
                            padding: '0.3rem 0.8rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            background: debugTab === tab.key ? '#4a90e2' : '#2d3748',
                            color: '#fff',
                          }}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {(stats.tcResults || [])
                      .filter(r => debugTab === 'all' || (debugTab === 'success' ? r.success : !r.success))
                      .map((r, i) => (
                        <div key={i} style={{
                          display: 'flex',
                          gap: '0.75rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '4px',
                          marginBottom: '0.25rem',
                          background: r.success ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)',
                          borderLeft: `3px solid ${r.success ? '#4ade80' : '#f87171'}`,
                        }}>
                          <span>{r.success ? '✅' : '❌'}</span>
                          <span style={{ color: '#a0aec0', minWidth: '140px' }}>
                            {r.tc.slice(0,4)}****{r.tc.slice(-2)}
                          </span>
                          <span style={{ color: '#e2e8f0', minWidth: '180px' }}>{r.adSoyad}</span>
                          <span style={{ color: r.success ? '#4ade80' : '#f87171' }}>{r.message}</span>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;