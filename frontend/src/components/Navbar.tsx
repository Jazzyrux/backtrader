import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/markets', label: 'Markets' },
  { path: '/portfolio', label: 'Portfolio' },
];

export const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">
            Trading Platform
          </Link>
          
          <div className="flex space-x-8">
            {navItems.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                className={`${
                  location.pathname === path
                    ? 'text-white'
                    : 'text-gray-300 hover:text-white'
                } transition-colors`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}; 