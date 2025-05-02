import { Link } from 'react-router-dom';

export const Navbar = () => {
  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-white">TradingApp</span>
            </Link>
          </div>

          <div className="flex space-x-4">
            <Link
              to="/dashboard"
              className="inline-flex items-center px-3 py-2 text-gray-300 hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              to="/markets"
              className="inline-flex items-center px-3 py-2 text-gray-300 hover:text-white"
            >
              Marchés
            </Link>
            <Link
              to="/portfolio"
              className="inline-flex items-center px-3 py-2 text-gray-300 hover:text-white"
            >
              Portfolio
            </Link>
            <Link
              to="/strategies"
              className="inline-flex items-center px-3 py-2 text-gray-300 hover:text-white"
            >
              Stratégies
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}; 