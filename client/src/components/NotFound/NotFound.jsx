import { useBreakpoint } from "../../hooks/useBreakpoint";
import "./NotFound.scss";

function NotFound() {
  const { isPhone, isTablet } = useBreakpoint();

  return (
    <div
      className={`signin ${isPhone ? "signin--phone" : ""} ${isTablet ? "signin--tablet" : ""}`}
    >
      <svg
        className="signin__wave"
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

      <div className="signin__card notfound">
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

        <button type="button" className="btn notfound__btn">
          Ana Sayfaya Dön
        </button>
      </div>
    </div>
  );
}

export default NotFound;
