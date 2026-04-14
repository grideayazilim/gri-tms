import "dotenv/config";
import app from "./app.js";
import { pool } from "./config/database.js";
import { initCronJobs } from "./utils/cronJobs.js";

const PORT = process.env.PORT || 3000;

// Database sorgusu yap (çalıştı mı kontrolü)
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Veritabanına bağlanılamadı! Ayarları kontrol et:", err.message);
    process.exit(1);
  } else {
    console.log("✅ Veritabanı bağlantısı başarılı (Time:", res.rows[0].now, ")");
    
    app.listen(PORT, () => {
      console.log(`🚀 Server http://localhost:${PORT} adresinde yayında!`);
      initCronJobs();
    });
  }
});