import { Link } from 'react-router-dom';
import { RiHome4Line, RiArrowLeftLine } from 'react-icons/ri';
import './NotFoundPage.scss';

const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-animation">
          <div className="number-404">404</div>
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>

        <h1 className="not-found-title">Sayfa Bulunamadı</h1>
        <p className="not-found-description">
          Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
        </p>

        <div className="not-found-actions">
          <Link to="/" className="btn btn--primary">
            <RiHome4Line />
            Ana Sayfaya Dön
          </Link>
          <button onClick={() => window.history.back()} className="btn btn--secondary">
            <RiArrowLeftLine />
            Geri Dön
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;

