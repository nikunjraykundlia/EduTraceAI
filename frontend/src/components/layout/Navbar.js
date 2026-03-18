'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCoins } from '@/context/CoinsContext';
import { Coins, LogOut, User as UserIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { coins } = useCoins();
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-primary)' }}>
        <div style={{ background: 'var(--accent-gradient)', padding: '0.4rem', borderRadius: '0.5rem', display: 'flex' }}>
          <Coins size={20} color="white" />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          EduTrace AI
        </span>
      </Link>

      <div className="nav-links">
        {user ? (
          <>
            <Link href="/dashboard" className={`nav-link ${pathname === '/dashboard' ? 'active' : ''}`}>Dashboard</Link>
            <Link href="/store" className={`nav-link ${pathname === '/store' ? 'active' : ''}`}>Store</Link>

            <div className="badge badge-yellow" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Coins size={14} />
              <span>{coins} Coins</span>
            </div>

            <Link href="/profile" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
              <UserIcon size={16} />
              <span className="hide-mobile">{user.name}</span>
            </Link>

            <button onClick={logout} className="btn btn-danger" style={{ padding: '0.5rem' }}>
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login" className="nav-link">Log In</Link>
            <Link href="/auth/signup" className="btn btn-primary">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
