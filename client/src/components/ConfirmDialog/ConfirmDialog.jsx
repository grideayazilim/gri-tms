import "./ConfirmDialog.scss";

function ConfirmDialog({
  isOpen,
  title,
  message,
  type,
  confirmText,
  cancelText,
  loading,
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="buttons">
          {/* Cancel */}
          <button className="btn btn--sm" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>

          {/* Confirm */}
          <button
            className={`btn btn--sm ${type === "danger" ? "btn--danger" : ""}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-content">
                <span className="spinner" />
                Yükleniyor...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
