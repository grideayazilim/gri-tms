/* ========================================================================
   MODAL CONTEXT - MODAL VE CONFIRM DIALOG YÖNETİMİ
   ========================================================================
   
   Bu dosya uygulamadaki tüm modal ve confirm dialog işlemlerini yönetir.
   
   ========================================================================
   KULLANIM ÖRNEKLERİ
   ========================================================================
   
   1) MODAL PROVIDER KURULUMU (main.jsx veya App.jsx):
   --------------------------------------------------------------------
   import { ModalProvider } from './components/Modal';
   
   <ModalProvider>
     <App />
   </ModalProvider>
   
   
   2) GENERIC MODAL KULLANIMI:
   --------------------------------------------------------------------
   import { useModal } from '../../components/Modal';
   
   function MyComponent() {
     const { showModal } = useModal();
     
     const handleOpenModal = async () => {
       const result = await showModal({
         title: 'Duyurular',
         content: <AnnouncementList />,
         size: 'large', // 'small' | 'medium' | 'large' | 'full'
         showCloseButton: true, // default: true
       });
       
       // Modal kapanınca result değeri döner
       if (result) {
         console.log('Modal data:', result);
       }
     };
   }
   
   
   3) MODAL İÇERİK COMPONENT'İNE CLOSE FONKSİYONU GEÇME:
   --------------------------------------------------------------------
   const handleOpenModal = async () => {
     const result = await showModal({
       title: 'Yeni Duyuru Ekle',
       content: (closeModal) => (
         <AnnouncementForm
           onSubmit={(data) => {
             // İşlem tamamlandı, modal'ı kapat ve veri döndür
             closeModal(data);
           }}
           onCancel={() => {
             // İptal edildi, null döndür
             closeModal(null);
           }}
         />
       ),
       size: 'medium',
     });
   };
   
   
   4) CONFIRM DIALOG KULLANIMI:
   --------------------------------------------------------------------
   import { useModal } from '../../components/Modal';
   
   function MyComponent() {
     const { showConfirm } = useModal();
     
     const handleDelete = async () => {
       const confirmed = await showConfirm({
         title: 'Duyuruyu Sil',
         message: 'Bu duyuruyu silmek istediğinizden emin misiniz?',
         type: 'danger', // 'danger' | 'warning' | 'info'
         confirmText: 'Sil',
         cancelText: 'Vazgeç',
       });
       
       if (confirmed) {
         // Kullanıcı onayladı
         console.log('Silme işlemi yapılıyor...');
       }
     };
   }
   
   
   5) CONFIRM İÇİNDE ASYNC İŞLEM YAPMA:
   --------------------------------------------------------------------
   const handleDelete = async () => {
     const confirmed = await showConfirm({
       title: 'Duyuruyu Sil',
       message: 'Bu işlem geri alınamaz.',
       type: 'danger',
       confirmText: 'Sil',
       onConfirm: async () => {
         // Async işlem buraya
         await deleteAnnouncement(id);
       },
     });
     
     if (confirmed) {
       // onConfirm başarıyla tamamlandı
       toast({ type: 'success', message: 'Duyuru silindi' });
     }
   };
   
   
   6) ÇOKLU MODAL (STACKABLE):
   --------------------------------------------------------------------
   Modal'lar otomatik olarak üst üste açılabilir.
   Her yeni modal öncekinin üstünde z-index ile açılır.
   
   const handleOpenFirst = async () => {
     await showModal({
       title: 'İlk Modal',
       content: (
         <button onClick={handleOpenSecond}>
           İkinci Modal'ı Aç
         </button>
       ),
     });
   };
   
   ======================================================================== */

import { createContext, useContext, useState, useCallback } from 'react';
import Modal from './Modal';

const ModalContext = createContext();

function ConfirmContent({ message, type, confirmText, cancelText, onConfirm, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (onConfirm) {
      setLoading(true);
      try {
        await onConfirm();
        onClose(true);
      } catch (error) {
        onClose(false);
      }
    } else {
      onClose(true);
    }
  };

  return (
    <div>
      <p className="confirm-dialog-message">{message}</p>
      <div className="confirm-dialog-actions">
        <button className="btn btn--sm" onClick={() => onClose(false)} disabled={loading}>
          {cancelText}
        </button>
        <button
          className={`btn btn--sm ${type === "danger" ? "btn--danger" : "btn--primary"}`}
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <span className="confirm-dialog-loading">
              <span className="spinner confirm-dialog-spinner" />
              Yükleniyor...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </div>
  );
}

export function ModalProvider({ children }) {
  const [modals, setModals] = useState([]);

  /**
   * showModal - Generic modal açma fonksiyonu
   * @param {Object} options - Modal ayarları
   * @param {string} options.title - Modal başlığı
   * @param {ReactNode|Function} options.content - Modal içeriği (component veya render function)
   * @param {string} options.size - Modal boyutu: 'small' | 'medium' | 'large' | 'full'
   * @param {boolean} options.showCloseButton - X butonu göster (default: true)
   * @returns {Promise} Modal kapanınca resolve olur
   */
  const showModal = useCallback((options) => {
    return new Promise((resolve) => {
      const id = Date.now() + Math.random();
      setModals(prev => [...prev, {
        id,
        type: 'modal',
        ...options,
        resolve,
      }]);
    });
  }, []);

  /**
   * showConfirm - Confirm dialog açma (backward compatible with ConfirmContext)
   * @param {Object} options - Confirm ayarları
   * @returns {Promise<boolean>} Kullanıcı onaylarsa true, iptal ederse false
   */
  const showConfirm = useCallback((options) => {
    return showModal({
      title: options?.title || "Emin misiniz?",
      size: 'small',
      content: (closeModal) => (
        <ConfirmContent
          message={options?.message || ""}
          type={options?.type || "danger"}
          confirmText={options?.confirmText || "Onayla"}
          cancelText={options?.cancelText || "Vazgeç"}
          onConfirm={options?.onConfirm}
          onClose={closeModal}
        />
      )
    });
  }, [showModal]);

  /**
   * closeModal - Modal'ı kapat
   * @param {number} id - Modal ID
   * @param {*} result - Modal sonucu (promise'e dönecek)
   */
  const closeModal = useCallback((id, result) => {
    setModals(prev => {
      const modal = prev.find(m => m.id === id);
      if (modal?.resolve) {
        modal.resolve(result);
      }
      return prev.filter(m => m.id !== id);
    });
  }, []);

  return (
    <ModalContext.Provider value={{ showModal, showConfirm, closeModal }}>
      {children}
      
      {/* Generic Modals */}
      {modals.map((modal, index) => (
        <Modal
          key={modal.id}
          {...modal}
          zIndex={3000 + index}
          onClose={(result) => closeModal(modal.id, result)}
        />
      ))}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

// Backward compatibility: useConfirm hook
export function useConfirm() {
  const { showConfirm } = useModal();
  return showConfirm;
}

