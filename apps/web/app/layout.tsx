import './globals.css';
import type { ReactNode } from 'react';
import { Inter, Manrope } from 'next/font/google';

import { RunSessionProvider } from './state/runSessionStore';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });

export const metadata = {
  title: 'PhotoPrune',
  description: 'Review groups of similar photos before making any changes.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="font-sans">
        <RunSessionProvider>{children}</RunSessionProvider>
      </body>
    </html>
  );
}
