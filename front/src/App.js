import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './components/Main-Auth-Navbar/Login';
import SignUp from './components/Main-Auth-Navbar/SignUp';
import Home from './components/Home_PopUp/Home';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
