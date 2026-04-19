import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Create from './pages/Create';
import Tracker from './pages/Tracker';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/create/:templateId?" element={<Create />} />
      <Route path="/tracker/:patternId?" element={<Tracker />} />
    </Routes>
  );
}

export default App;
