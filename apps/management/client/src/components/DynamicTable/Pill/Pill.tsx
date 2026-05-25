/* ========================================================================
   PILL (DURUM ETİKETİ)
   Renk konfigürasyonu ile küçük durum göstergesi.
   ======================================================================== */
import './Pill.scss';

interface PillConfig {
  label: string;
  bg: string;
  color: string;
}

interface PillProps {
  cfg: PillConfig;
}

const Pill = ({ cfg }: PillProps) => (
  <span
    className="pill"
    style={{ background: cfg.bg, color: cfg.color }}
  >
    {cfg.label}
  </span>
);

export default Pill;
