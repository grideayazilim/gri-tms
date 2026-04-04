import "./Toast.scss";

const toastIcons = {
  success: "✓",
  error: "✕",
  info: "i",
  warning: "!",
};

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast__icon">{toastIcons[toast.type]}</div>
          <div className="toast__message">{toast.message}</div>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
