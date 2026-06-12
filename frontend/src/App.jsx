import { Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import PageTransition from './components/motion/PageTransition';
import Home from './pages/Home';
import Create from './pages/Create';
import Tracker from './pages/Tracker';
import TemplateDetail from './pages/TemplateDetail';
import Account from './pages/Account';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <PageTransition>
        {(location) => (
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/account" element={<Account />} />
            <Route path="/templates/:templateId" element={<TemplateDetail />} />
            <Route path="/create/:templateId?" element={<Create />} />
            <Route path="/tracker/:patternId?" element={<Tracker />} />
          </Routes>
        )}
      </PageTransition>
    </MotionConfig>
  );
}

export default App;
