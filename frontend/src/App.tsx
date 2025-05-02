import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Layout/Navbar';
import { Home } from '@/pages/Home';
import { Markets } from '@/pages/Markets';
import { Portfolio } from '@/pages/Portfolio';
import { Dashboard } from '@/pages/Dashboard';
import { CoinPage } from '@/pages/CoinPage';
import { StrategyManager } from '@/pages/StrategyManager';

export const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/coins/:symbol" element={<CoinPage />} />
            <Route path="/strategies" element={<StrategyManager />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}; 