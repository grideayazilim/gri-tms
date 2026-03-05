import { Link } from 'react-router-dom';
import "./NotFoundPage.scss";

function NotFoundPage() {
  return (
    <div className="auth-page">
      <svg
        className="auth-page__wave"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M-200,600 C100,350 400,800 750,450 C1100,100 1300,550 1650,300"
          fill="none"
          stroke="rgba(0, 40, 160, 0.18)"
          strokeWidth="380"
          strokeLinecap="round"
        />
      </svg>

      <div className="auth-page__card notfound">
        {/* 404 Browser Illustration */}
        <div className="notfound__browser">
          <div className="notfound__browser-bar">
            <span className="notfound__dot notfound__dot--red" />
            <span className="notfound__dot notfound__dot--yellow" />
            <span className="notfound__dot notfound__dot--green" />
            <div className="notfound__address-bar" />
          </div>
          <div className="notfound__browser-body">
            <span className="notfound__404">404</span>
            <div className="notfound__browser-footer">
              <div className="notfound__lines">
                <span />
                <span />
              </div>
              <div className="notfound__dots-group">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </div>

        <p className="notfound__message">Görünüşe göre kaybolmuşsunuz....</p>

        <Link to="/" className="btn notfound__btn" style={{textDecoration: 'none'}}>
          Ana Sayfaya Dön
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;

