/* ===================================================================*/
/* BU SAYFA MODAL YAPISININ GLOBAL OLARAK KULLANILMASINI SAĞLAR. */
/* ================================================================= */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import ConfirmDialog from "./ConfirmDialog";

// Confirm fonksiyonu global kullanılabilsin diye context oluşturuldu
const ConfirmContext = createContext();

// Modal kapalıyken varsayılan state
const initialState = {
  isOpen: false, // Modal açık mı?
  title: "", // Başlık
  message: "", // Açıklama metni
  type: "danger", // Stil tipi (danger, info vs.)
  confirmText: "Onayla",
  cancelText: "Vazgeç",
  onConfirm: null, // Async işlem fonksiyonu
  resolve: null, // Promise resolver (modal sonucunu dışarıya döndürmek için)
};

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState(initialState);
  const [loading, setLoading] = useState(false);

  /**
   * confirm()
   * Promise döndürür.
   * Modal açılır ve kullanıcı aksiyonuna göre resolve edilir.
   */

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options?.title || "Emin misiniz?",
        message: options?.message || "",
        type: options?.type || "danger",
        confirmText: options?.confirmText || "Onayla",
        cancelText: options?.cancelText || "Vazgeç",
        onConfirm: options?.onConfirm || null,
        resolve,
      });
    });
  }, []);

  const close = useCallback(() => {
    setConfirmState(initialState);
  }, []);

  const handleConfirm = useCallback(async () => {
    try {
      setLoading(true);

      if (confirmState.onConfirm) {
        await confirmState.onConfirm();
      }
      confirmState.resolve?.(true);
    } catch (error) {
      confirmState.resolve?.(false);
    } finally {
      setLoading(false);
      close();
    }
  }, [confirmState, close]);

  const handleCancel = useCallback(() => {
    if (!loading) {
      confirmState.resolve?.(false);
      close();
    }
  }, [confirmState.resolve, close, loading]);

  /**
   * ESC tuşu ile modal kapatma bölümü
   * Loading esnasında ESC devre dışı bırakılır.
   */

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && confirmState.isOpen && !loading) {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmState.isOpen, handleCancel, loading]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        {...confirmState}
        loading={loading}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
