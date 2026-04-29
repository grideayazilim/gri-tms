/* ========================================================================
   PILL (DURUM ETİKETİ)
   Renk konfigürasyonu ile küçük durum göstergesi.
   ======================================================================== */

interface PillConfig {
  label: string;
  bg: string;
  color: string;
}

interface PillProps {
  cfg: PillConfig;
}

const Pill = ({ cfg }: PillProps) => (
  <span style={{ padding: '2px 8px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
    {cfg.label}
  </span>
);

export default Pill;
