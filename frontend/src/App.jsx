import { Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import PageTransition from './components/motion/PageTransition';
import CursorDot from './components/motion/CursorDot';
import ScrollThread from './components/motion/ScrollThread';
import MobileTabBar from './components/MobileTabBar';
import Home from './pages/Home';
import Create from './pages/Create';
import Design from './pages/Design';
import DesignShare from './pages/DesignShare';
import Tracker from './pages/Tracker';
import TemplateDetail from './pages/TemplateDetail';
import Account from './pages/Account';
import VerifyEmail from './pages/VerifyEmail';
import ResetPassword from './pages/ResetPassword';

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100000] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-primary focus:shadow-warm"
      >
        Skip to content
      </a>
      <ScrollThread />
      <CursorDot />
      <PageTransition>
        {(location) => (
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/account" element={<Account />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/templates/:templateId" element={<TemplateDetail />} />
            <Route path="/create/:templateId?" element={<Create />} />
            <Route path="/design" element={<Design />} />
            <Route path="/d/:id" element={<DesignShare />} />
            <Route path="/tracker/:patternId?" element={<Tracker />} />
          </Routes>
        )}
      </PageTransition>
      <MobileTabBar />
    </MotionConfig>
  );
}

export default App;
