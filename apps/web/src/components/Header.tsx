'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { AppIcon } from '../../app/components/AppIcon';

const navItems = [
  { href: '/results', label: 'History' },
  { href: '/settings', label: 'Settings' }
] as const;

export function Header() {
  const pathname = usePathname();
  const currentPathname = pathname ?? '';

  return (
    <header className="glass-header">
      <div className="page-shell desktop-gutter header-inner">
        <div className="header-brand-cluster">
          <Link href="/" className="header-brand">
            PhotoPrune
          </Link>

          <nav className="top-nav-desktop header-nav">
            {navItems.map((item) => {
              const isActive =
                currentPathname === item.href ||
                currentPathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.label}
                  href={{ pathname: item.href }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`shell-nav-link ${isActive ? 'shell-nav-link-active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <Link
          href={{ pathname: '/account' }}
          aria-label="Account status"
          className="header-profile"
        >
          <AppIcon name="profile" className="h-[18px] w-[18px]" />
        </Link>
      </div>
    </header>
  );
}
