import './globals.css';
import type { ReactNode } from 'react';

import { RunSessionProvider } from './state/runSessionStore';

export const metadata = {
  title: 'PhotoPrune',
  description: 'Review potential photo duplicates from a Picker session.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RunSessionProvider>
          <main className="app-shell">{children}</main>
        </RunSessionProvider>
      </body>
    </html>
  );
}
