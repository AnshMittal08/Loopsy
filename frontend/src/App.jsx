import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Create from './pages/Create';
import Tracker from './pages/Tracker';
import TemplateDetail from './pages/TemplateDetail';
import Account from './pages/Account';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/account" element={<Account />} />
      <Route path="/templates/:templateId" element={<TemplateDetail />} />
      <Route path="/create/:templateId?" element={<Create />} />
      <Route path="/tracker/:patternId?" element={<Tracker />} />
    </Routes>
  );
}

export default App;
