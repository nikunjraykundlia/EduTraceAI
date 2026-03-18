import { AuthProvider } from '@/context/AuthContext';
import { CoinsProvider } from '@/context/CoinsContext';
import Navbar from '@/components/layout/Navbar';
import './globals.css';

export const metadata = {
  title: 'EduTrace AI',
  description: 'Automated Video-to-Assessment Pipeline with Gamification.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <CoinsProvider>
            <div className="app-container">
              <Navbar />
              <main className="main-content">
                {children}
              </main>
            </div>
          </CoinsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
