import type { ReactNode } from 'react';

type BannerProps = {
  tone: 'info' | 'warn' | 'error';
  title: string;
  children?: ReactNode;
};

const toneLabels: Record<BannerProps['tone'], string> = {
  info: 'Info',
  warn: 'Warning',
  error: 'Error'
};

export function Banner({ tone, title, children }: BannerProps) {
  return (
    <section aria-label={toneLabels[tone]}>
      <strong>{title}</strong>
      {children ? <div>{children}</div> : null}
    </section>
  );
}
