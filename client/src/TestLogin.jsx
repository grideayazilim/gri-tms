import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLocationsAndUnits } from './hooks/data/useLocationsAndUnits';

const TestLogin = () => {
  const { login, register, isAuthenticated, user, logout } = useAuth();
  const { locations, units, fetchLocations, fetchUnitsByLocation } = useLocationsAndUnits();
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const navigate = useNavigate();

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    username: '',
    password: '',
    role: 'RESPONSIBLE',
    locationId: '',
    unitId: '',
  });

  const [error, setError] = useState('');

  // Yerleşkeleri yükle
  useEffect(() => {
    if (showRegisterModal) {
      fetchLocations();
    }
  }, [showRegisterModal]);

  // Yerleşke değiştiğinde birimleri yükle
  useEffect(() => {
    if (registerForm.locationId) {
      fetchUnitsByLocation(registerForm.locationId);
    } else {
      setRegisterForm(prev => ({ ...prev, unitId: '' }));
    }
  }, [registerForm.locationId]);

  const handleLogin = async () => {
    setIsLoading(true);
    setError('');
    
    const username = prompt('Kullanıcı adı:');
    if (!username) {
      setIsLoading(false);
      return;
    }
    
    const password = prompt('Şifre:');
    if (!password) {
      setIsLoading(false);
      return;
    }
    
    const result = await login(username, password);
    
    if (result.success) {
      console.log('✅ Login başarılı');
      navigate('/');
    } else {
      setError(result.error);
      alert(`Login hatası: ${result.error}`);
    }
    
    setIsLoading(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { username, password, role, unitId, locationId } = registerForm;

    // Validasyon
    if (!username || !password) {
      setError('Kullanıcı adı ve şifre zorunlu');
      setIsLoading(false);
      return;
    }

    if (role === 'RESPONSIBLE' && (!unitId || !locationId)) {
      setError('Birim sorumlusu için yerleşke ve birim seçimi zorunlu');
      setIsLoading(false);
      return;
    }

    const result = await register(
      username,
      password,
      role,
      role === 'RESPONSIBLE' ? unitId : null,
      role === 'RESPONSIBLE' ? locationId : null
    );

    if (result.success) {
      console.log('✅ Kayıt başarılı');
      setShowRegisterModal(false);
      navigate('/');
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    console.log('✅ Logout başarılı');
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      {/* Main Fixed Button */}
      <div style={styles.container}>
        <div style={styles.box}>
          <div style={styles.header}>🔧 Test Login</div>
          
          {isAuthenticated ? (
            <div style={styles.userInfo}>
              <div style={styles.userText}>
                <strong>{user?.username}</strong>
                <br />
                <span style={styles.role}>{user?.role}</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoading}
                style={{...styles.button, ...styles.logoutButton}}
              >
                Çıkış Yap
              </button>
            </div>
          ) : (
            <div style={styles.buttonGroup}>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                style={{...styles.button, ...styles.loginButton}}
              >
                🔑 Giriş Yap
              </button>
              <button
                onClick={() => setShowRegisterModal(true)}
                disabled={isLoading}
                style={{...styles.button, ...styles.registerButton}}
              >
                📝 Kayıt Ol
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div style={styles.modalOverlay} onClick={() => setShowRegisterModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Yeni Kullanıcı Kaydı</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowRegisterModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} style={styles.form}>
              {error && (
                <div style={styles.errorBox}>{error}</div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Kullanıcı Adı</label>
                <input
                  type="text"
                  name="username"
                  value={registerForm.username}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Şifre</label>
                <input
                  type="password"
                  name="password"
                  value={registerForm.password}
                  onChange={handleInputChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Rol</label>
                <select
                  name="role"
                  value={registerForm.role}
                  onChange={handleInputChange}
                  style={styles.input}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="RESPONSIBLE">Birim Sorumlusu</option>
                </select>
              </div>

              {registerForm.role === 'RESPONSIBLE' && (
                <>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Yerleşke</label>
                    <select
                      name="locationId"
                      value={registerForm.locationId}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                    >
                      <option value="">Seçiniz...</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.program_no})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Birim</label>
                    <select
                      name="unitId"
                      value={registerForm.unitId}
                      onChange={handleInputChange}
                      style={styles.input}
                      required
                      disabled={!registerForm.locationId}
                    >
                      <option value="">Seçiniz...</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{...styles.button, ...styles.cancelButton}}
                  disabled={isLoading}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  style={{...styles.button, ...styles.submitButton}}
                  disabled={isLoading}
                >
                  {isLoading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
  },
  box: {
    backgroundColor: '#1a1a1a',
    border: '2px solid #333',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
    minWidth: '220px',
  },
  header: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '12px',
    textAlign: 'center',
    borderBottom: '1px solid #333',
    paddingBottom: '8px',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  button: {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#fff',
  },
  loginButton: {
    backgroundColor: '#2563eb',
  },
  registerButton: {
    backgroundColor: '#10b981',
  },
  logoutButton: {
    backgroundColor: '#6b7280',
    fontSize: '12px',
    padding: '8px 12px',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
  },
  userText: {
    color: '#fff',
    fontSize: '13px',
    textAlign: 'center',
  },
  role: {
    color: '#10b981',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    backgroundColor: '#1f1f1f',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #333',
    paddingBottom: '12px',
  },
  modalTitle: {
    color: '#fff',
    margin: 0,
    fontSize: '20px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#ddd',
    fontSize: '14px',
    fontWeight: '500',
  },
  input: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #444',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: '14px',
  },
  errorBox: {
    backgroundColor: '#dc2626',
    color: '#fff',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#10b981',
    flex: 1,
  },
};

export default TestLogin;
