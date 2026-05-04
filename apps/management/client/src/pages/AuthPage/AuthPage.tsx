/* ========================================================================
   AUTH PAGE (GİRİŞ VE KAYIT ANA SAYFASI)
   Giriş (SignIn) ve Kayıt (SignUp) bileşenleri arasında geçişi yönetir.
   ======================================================================== */
import { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import { motion, AnimatePresence } from 'framer-motion';
import './AuthPage.scss';


function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="auth-page">
      {/* Arkaplandaki dalga efekti (SVG Animasyonu) */}
      <svg
        className="auth-page__wave"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-200,600 C100,350 400,800 750,450 C1100,100 1300,550 1650,300"
          fill="none"
          stroke="rgba(0, 40, 160, 0.18)"
          strokeWidth="380"
          strokeLinecap="round"
        />
      </svg>


      {/* AnimatePresence: isLogin değiştiğinde eski kartın çıkış (exit), yenisinin giriş animasyonunu yönetir */}
      <AnimatePresence mode="wait">
        {isLogin ? (
          <motion.div
            key="login"
            className="auth-page__card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }} // Animasyon başlangıcı
            animate={{ opacity: 1, scale: 1, y: 0 }}     // Aktif durum
            exit={{ opacity: 0, scale: 0.95, y: -15 }}    // Çıkış durumu
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignIn onToggle={() => setIsLogin(false)} />
          </motion.div>
        ) : (
          <motion.div
            key="register"
            className="auth-page__card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <SignUp onToggle={() => setIsLogin(true)} />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default AuthPage;

