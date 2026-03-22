import './globals.css';
import type { ReactNode } from 'react';

import { RunSessionProvider } from './state/runSessionStore';

export const metadata = {
  title: 'PhotoPrune',
  description: 'Review groups of similar photos before making any changes.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RunSessionProvider>{children}</RunSessionProvider>
      </body>
    </html>
  );
}
