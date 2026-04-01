'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCoins } from '@/context/CoinsContext';
import { useTheme } from '@/context/ThemeContext';
import { LogOut, Sun, Moon } from 'lucide-react';
import { usePathname } from 'next/navigation';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { coins } = useCoins();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="navbar-container">
      <nav className="floating-pill">
        <Link href="/" className="nav-brand">
          <span className="brand-name">EduTrace AI</span>
        </Link>

        <div className="nav-links">
          {user ? (
            <>
              <Link href="/dashboard" className={`nav-item ${pathname === '/dashboard' ? 'active' : ''}`}>
                Dashboard
              </Link>
              <Link href="/store" className={`nav-item ${pathname === '/store' ? 'active' : ''}`}>
                Store
              </Link>
              <Link href="http://localhost:3030/dashboard" target="_blank" className="nav-item">
                Interview Assessment
              </Link>

              <div className="badge badge-amber">
                <span className="glow-dot amber"></span>
                {coins} Coins
              </div>

              <Link href="/profile" className="avatar-circle" title="Profile">
                {getInitials(user.name)}
              </Link>

              <button onClick={logout} className="logout-btn" title="Log Out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="nav-item">Log In</Link>
              <Link href="/auth/signup" className="btn btn-primary" style={{ height: '34px', padding: '0 1rem' }}>Sign Up</Link>
            </>
          )}

          {/* Theme Toggle — always visible */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>
    </div>
  );
}
