import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import HomePage from '../app/page';
import { RunSessionProvider } from '../app/state/runSessionStore';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  })
}));

describe('HomePage', () => {
  it('renders trust copy and CTA', () => {
    render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );
    expect(
      screen.getByText('PhotoPrune does not delete anything.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/open items in Google Photos/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /select photos/i })
    ).toBeInTheDocument();
  });
});
