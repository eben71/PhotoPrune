import type { SVGProps } from 'react';

type IconName =
  | 'scan'
  | 'group'
  | 'review'
  | 'summary'
  | 'support'
  | 'profile'
  | 'sparkle'
  | 'stack'
  | 'check'
  | 'gauge';

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
};

export function AppIcon({ name, ...props }: AppIconProps) {
  switch (name) {
    case 'scan':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
          <circle cx="12" cy="12" r="7.5" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="2.1" strokeWidth="1.8" />
        </svg>
      );
    case 'group':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <rect x="4" y="4" width="6" height="6" rx="1.4" />
          <rect x="14" y="4" width="6" height="6" rx="1.4" />
          <rect x="4" y="14" width="6" height="6" rx="1.4" />
          <rect x="14" y="14" width="6" height="6" rx="1.4" />
        </svg>
      );
    case 'review':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
          <path
            d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
            strokeWidth="1.8"
          />
          <circle cx="12" cy="12" r="2.6" strokeWidth="1.8" />
        </svg>
      );
    case 'summary':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <rect x="4" y="11" width="4" height="8" rx="1.2" />
          <rect x="10" y="7" width="4" height="12" rx="1.2" />
          <rect x="16" y="4" width="4" height="15" rx="1.2" />
        </svg>
      );
    case 'support':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
          <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
          <path
            d="M9.4 9.2A2.9 2.9 0 0 1 12 7.8c1.8 0 3.1 1.1 3.1 2.8 0 1.7-1.6 2.4-2.6 3.1-.8.5-1 1-.9 1.7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17.2" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'profile':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
          <circle cx="12" cy="8" r="3.4" strokeWidth="1.8" />
          <path
            d="M5.2 19.2c1.7-3.1 4.4-4.7 6.8-4.7s5.1 1.6 6.8 4.7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'sparkle':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="m12 2 1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2Z" />
          <path d="m18.3 14 1 2.7 2.7 1-2.7 1-1 2.7-1-2.7-2.7-1 2.7-1 1-2.7Z" />
        </svg>
      );
    case 'stack':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
          <path d="m12 3 8 4.2-8 4.2-8-4.2L12 3Z" />
          <path d="m4 11.2 8 4.2 8-4.2v3.1l-8 4.2-8-4.2v-3.1Z" />
        </svg>
      );
    case 'check':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
          <path
            d="m5 12.6 4.3 4.1L19 7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'gauge':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
          <path
            d="M4 14a8 8 0 1 1 16 0"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="m12 12 4.5-3" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}
