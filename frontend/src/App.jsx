import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion as Motion } from 'motion/react';
import Home from './pages/Home';
import Create from './pages/Create';
import Tracker from './pages/Tracker';
import TemplateDetail from './pages/TemplateDetail';
import Account from './pages/Account';
import { EASE, DURATION } from './lib/motionTokens';

function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: DURATION.base, ease: EASE.out }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/account" element={<Account />} />
          <Route path="/templates/:templateId" element={<TemplateDetail />} />
          <Route path="/create/:templateId?" element={<Create />} />
          <Route path="/tracker/:patternId?" element={<Tracker />} />
        </Routes>
      </Motion.div>
    </AnimatePresence>
  );
}

export default App;
