import type { ReactNode } from 'react';

type InlineDisclosureProps = {
  summary: string;
  children: ReactNode;
};

export function InlineDisclosure({ summary, children }: InlineDisclosureProps) {
  return (
    <details>
      <summary>{summary}</summary>
      <div>{children}</div>
    </details>
  );
}
