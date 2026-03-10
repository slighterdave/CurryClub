import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { RatingForm } from './components/RatingForm';
import { Ratings } from './components/Ratings';
import { About } from './components/About';
import { Visits } from './components/Visits';

// Simple icons as SVG components
const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const XIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white text-gray-800 shadow-md relative z-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center relative">
          <img src="/logo.png" alt="The Curry Club" className="h-16" />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors absolute right-4"
            aria-label="Toggle menu"
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* Side Menu */}
      <div
        className={`fixed top-[72px] right-0 h-[calc(100vh-72px)] bg-white shadow-2xl z-40 transition-transform duration-300 ease-in-out border-l border-gray-200 ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } w-64`}
      >
        <nav className="p-6">
          <ul className="space-y-4">
            <li>
              <Link 
                to="/" 
                onClick={() => setMenuOpen(false)}
                className={`w-full text-left flex items-center gap-3 transition-colors py-2 ${
                  location.pathname === '/' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'
                }`}
              >
                <HomeIcon />
                <span>Home</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/ratings" 
                onClick={() => setMenuOpen(false)}
                className={`w-full text-left flex items-center gap-3 transition-colors py-2 ${
                  location.pathname === '/ratings' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'
                }`}
              >
                <StarIcon />
                <span>Top Rated</span>
              </Link>
            </li>
            <li>
              <Link 
                to="/about" 
                onClick={() => setMenuOpen(false)}
                className={`w-full text-left flex items-center gap-3 transition-colors py-2 ${
                  location.pathname === '/about' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'
                }`}
              >
                <InfoIcon />
                <span>About</span>
              </Link>
            </li>
            <li>
              <Link
                to="/visits"
                onClick={() => setMenuOpen(false)}
                className={`w-full text-left flex items-center gap-3 transition-colors py-2 ${
                  location.pathname === '/visits' ? 'text-orange-600' : 'text-gray-700 hover:text-orange-600'
                }`}
              >
                <CalendarIcon />
                <span>Visits</span>
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-30 top-[72px]"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl w-full border border-gray-200">
          <Routes>
            <Route path="/" element={
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">Rate a Curry House</h2>
                  <p className="text-gray-600">Currys With The Lads</p>
                </div>
                <RatingForm />
              </>
            } />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/about" element={<About />} />
            <Route path="/visits" element={<Visits />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
