import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { RatingForm } from './components/RatingForm';
import { Ratings } from './components/Ratings';
import { About } from './components/About';

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
    <div className="min-h-screen bg-gradient-to-br from-indian-cream via-orange-50 to-indian-cream">
      {/* Header */}
      <header className="bg-gradient-to-r from-indian-saffron via-indian-curry to-indian-saffron text-white shadow-lg relative z-50 border-b-4 border-indian-gold">
        <div className="container mx-auto px-4 py-4 flex items-center justify-center relative">
          <img src="/logo.png" alt="The Curry Club" className="h-16 drop-shadow-lg" />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-300 absolute right-4 backdrop-blur-sm"
            aria-label="Toggle menu"
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* Side Menu */}
      <div
        className={`fixed top-[72px] right-0 h-[calc(100vh-72px)] bg-gradient-to-b from-indian-cream to-orange-50 shadow-2xl z-40 transition-transform duration-300 ease-in-out border-l-4 border-indian-gold ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        } w-64`}
      >
        <nav className="p-6">
          <ul className="space-y-4">
            <li>
              <Link 
                to="/" 
                onClick={() => setMenuOpen(false)}
                className={`w-full text-left flex items-center gap-3 transition-all duration-300 py-3 px-4 rounded-lg font-heading ${
                  location.pathname === '/' 
                    ? 'bg-indian-saffron text-white shadow-md' 
                    : 'text-indian-spice hover:bg-indian-gold hover:bg-opacity-30 hover:translate-x-1'
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
                className={`w-full text-left flex items-center gap-3 transition-all duration-300 py-3 px-4 rounded-lg font-heading ${
                  location.pathname === '/ratings' 
                    ? 'bg-indian-saffron text-white shadow-md' 
                    : 'text-indian-spice hover:bg-indian-gold hover:bg-opacity-30 hover:translate-x-1'
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
                className={`w-full text-left flex items-center gap-3 transition-all duration-300 py-3 px-4 rounded-lg font-heading ${
                  location.pathname === '/about' 
                    ? 'bg-indian-saffron text-white shadow-md' 
                    : 'text-indian-spice hover:bg-indian-gold hover:bg-opacity-30 hover:translate-x-1'
                }`}
              >
                <InfoIcon />
                <span>About</span>
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
      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)] relative z-10">
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-2xl w-full border-4 border-indian-gold relative overflow-hidden">
          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-indian-curry opacity-30 rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-indian-curry opacity-30 rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-indian-curry opacity-30 rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-indian-curry opacity-30 rounded-br-2xl"></div>
          
          <Routes>
            <Route path="/" element={
              <>
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-indian-spice mb-2 font-heading">Rate a Curry House</h2>
                  <p className="text-indian-rust font-body">Currys With The Lads</p>
                </div>
                <RatingForm />
              </>
            } />
            <Route path="/ratings" element={<Ratings />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
