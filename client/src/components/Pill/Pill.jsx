const Pill = ({ cfg }) => (
  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
    {cfg.label}
  </span>
);

export default Pill;
