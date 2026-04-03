import "./MarkerSelector.scss";

const toSafeCssClass = (code) =>
  code
    .normalize("NFD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");

const MarkerSelector = ({ markers = [], selected, onSelect }) => {
  if (markers.length === 0) return null;

  return (
    <div className="marker-selector">
      <span className="marker-selector__label">İşaretçi:</span>
      <div className="marker-selector__buttons">
        {markers.map((m) => (
          <button
            key={m.code}
            type="button"
            title={m.label}
            className={[
              "marker-btn",
              `marker-btn--${toSafeCssClass(m.code)}`,
              selected === m.code ? "marker-btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSelect(m.code)}
          >
            {m.code}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MarkerSelector;
