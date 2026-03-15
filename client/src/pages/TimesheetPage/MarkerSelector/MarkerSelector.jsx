import "./MarkerSelector.scss";

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
            className={`marker-btn${selected === m.code ? " marker-btn--active" : ""}`}
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
