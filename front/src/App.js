import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Main from './components/Main-Auth-Navbar/Main';
import Login from './components/Main-Auth-Navbar/Login';
import SignUp from './components/Main-Auth-Navbar/SignUp';
import Home from './components/Home_PopUp/Home';
import InterviewRecord from './components/Interview/InterviewRecord';
import InterviewSummary from './components/Interview/InterviewSummary';
import NavbarLight from './components/Main-Auth-Navbar/Navbar_light';
import NavbarDark from './components/Main-Auth-Navbar/Navbar_dark';

import './App.css';

function Layout({ children }) {
  const location = useLocation();
  const path = location.pathname;

  // ⚫ Dark Navbar 적용 페이지
  const darkPaths = [
    /^\/$/, // 메인
    /^\/login$/, // 로그인
    /^\/signup$/, // 회원가입
    /^\/interview\/\d+\/webcam$/, // 인터뷰 웹캠
  ];

  // 🔵 Light Navbar 적용 페이지
  const lightPaths = [
    /^\/home$/, // 홈(팝업)
    /^\/interview\/\d+\/summary$/, // 인터뷰 총평
  ];

  let NavbarComponent = null;

  if (lightPaths.some((regex) => regex.test(path))) {
    NavbarComponent = NavbarLight;
  } else if (darkPaths.some((regex) => regex.test(path))) {
    NavbarComponent = NavbarDark;
  } else {
    // 지정 안 된 경우 기본 dark
    NavbarComponent = NavbarDark;
  }

  return (
    <>
      <NavbarComponent />
      {children}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Main />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/interview/:id/webcam" element={<InterviewRecord />} />
          <Route path="/interview/:id/summary" element={<InterviewSummary />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
