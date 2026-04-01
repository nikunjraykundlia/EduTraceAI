import { AuthProvider } from '@/context/AuthContext';
import { CoinsProvider } from '@/context/CoinsContext';
import { ThemeProvider } from '@/context/ThemeContext';
import Navbar from '@/components/layout/Navbar';
import { Syne, DM_Mono, Instrument_Serif } from 'next/font/google';
import './globals.css';

const syne = Syne({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne' 
});

const dmMono = DM_Mono({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-dm-mono' 
});

const instrumentSerif = Instrument_Serif({ 
  subsets: ['latin'], 
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif' 
});

export const metadata = {
  title: 'EduTrace AI — Automated Video-to-Assessment Pipeline',
  description: 'AI-powered platform that converts educational videos into structured assessments, quizzes and gamified learning experiences.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmMono.variable} ${instrumentSerif.variable}`}>
      <body>
        <ThemeProvider>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
