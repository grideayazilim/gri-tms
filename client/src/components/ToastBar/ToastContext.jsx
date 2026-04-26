/* ========================================================================
   TOAST CONTEXT - BİLDİRİM YÖNETİMİ
   ========================================================================
   
   Bu dosya uygulamadaki tüm toast bildirimlerini yönetir.
   Toast'lar ekranın sağ üst köşesinde otomatik olarak gösterilir ve
   belirtilen süre sonra kaybolur.
   
   ========================================================================
   KULLANIM ÖRNEKLERİ
   ========================================================================
   
   1) TOAST PROVIDER KURULUMU (main.jsx):
   --------------------------------------------------------------------
   import { ToastProvider } from './components/ToastBar/ToastContext';
   
   <BrowserRouter>
     <AuthProvider>
       <ToastProvider>
         <App />
       </ToastProvider>
     </AuthProvider>
   </BrowserRouter>
   
   
   2) BAŞARI BİLDİRİMİ (SUCCESS):
   --------------------------------------------------------------------
   import { useToast } from '../../components/ToastBar/ToastContext';
   
   function MyComponent() {
     const toast = useToast();
     
     const handleSave = async () => {
       await saveData();
       
       toast({
         type: 'success',
         message: 'Kayıt başarıyla tamamlandı',
         duration: 3000, // default: 3000ms (3 saniye)
       });
     };
   }
   
   
   3) HATA BİLDİRİMİ (ERROR):
   --------------------------------------------------------------------
   const handleDelete = async () => {
     try {
       await deleteItem();
       toast({ type: 'success', message: 'Silme başarılı' });
     } catch (error) {
       toast({
         type: 'error',
         message: 'Silme işlemi başarısız oldu',
       });
     }
   };
   
   
   4) BİLGİ BİLDİRİMİ (INFO):
   --------------------------------------------------------------------
   const handleInfo = () => {
     toast({
       type: 'info',
       message: 'Bu özellik yakında eklenecek',
       duration: 5000, // 5 saniye göster
     });
   };
   
   
   5) TOAST TİPLERİ:
   --------------------------------------------------------------------
   type: 'success' → Yeşil, başarılı işlemler için (✓)
   type: 'error'   → Kırmızı, hata durumları için (✕)
   type: 'info'    → Mavi, bilgilendirme için (i)
   
   
   6) GERÇEK HAYAT ÖRNEKLERİ:
   --------------------------------------------------------------------
   
   // Duyuru Silme
   const handleDeleteAnnouncement = async (id) => {
     const confirmed = await showConfirm({...});
     
     if (confirmed) {
       await deleteAnnouncement(id);
       toast({ type: 'success', message: 'Duyuru silindi' });
     }
   };
   
   // Kullanıcı Güncelleme
   const handleUpdateUser = async (data) => {
     try {
       await updateUser(data);
       toast({ type: 'success', message: 'Kullanıcı güncellendi' });
     } catch (error) {
       toast({ type: 'error', message: error.message });
     }
   };
   
   // Form Gönderimi
   const handleSubmit = async (formData) => {
     setLoading(true);
     
     const result = await submitForm(formData);
     
     if (result.success) {
       toast({ type: 'success', message: 'Form gönderildi' });
       navigate('/success');
     } else {
       toast({ type: 'error', message: result.error });
     }
     
     setLoading(false);
   };
   
   ======================================================================== */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import ToastContainer from "./ToastContainer";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeouts = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, removing: true } : t));

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 220);

    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  const toast = useCallback(
    ({ type = "info", message = "", duration = 3000 }) => {
      const id = crypto.randomUUID();

      setToasts((prev) => [...prev, { id, type, message }]);

      const timeout = setTimeout(() => {
        removeToast(id);
      }, duration);

      timeouts.current[id] = timeout;
    },
    [removeToast],
  );

  useEffect(() => {
    return () => {
      Object.values(timeouts.current).forEach(clearTimeout);
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
