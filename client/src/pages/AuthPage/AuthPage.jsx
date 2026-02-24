import { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import './AuthPage.scss';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

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

      {isLogin ? <SignIn onToggle={() => setIsLogin(false)} /> : <SignUp onToggle={() => setIsLogin(true)} />}
    </div>
  );
}

export default AuthPage;

