import "./Toast.scss";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaInfoCircle,
  FaExclamationCircle,
} from "react-icons/fa";

const toastIcons = {
  success: FaCheckCircle,
  error: FaTimesCircle,
  info: FaInfoCircle,
  warning: FaExclamationCircle,
};

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const Icon = toastIcons[toast.type];

        return (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <div className="toast__icon">{Icon && <Icon size={18} />}</div>
            <div className="toast__message">{toast.message}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
