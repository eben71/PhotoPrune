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
  it('renders scope boundaries, session warning, and cost guardrail copy', () => {
    render(
      <RunSessionProvider>
        <HomePage />
      </RunSessionProvider>
    );

    expect(
      screen.getByRole('heading', { name: /review similar photos — safely/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /what this tool does:/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /what this tool does not do:/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/this is a single-session scan/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/scans are capped per session/i)
    ).toBeInTheDocument();
  });
});
