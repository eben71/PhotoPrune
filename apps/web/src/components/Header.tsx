import Link from 'next/link';

import { AppIcon } from '../../app/components/AppIcon';

const navItems = [
  { href: '/results', label: 'History', active: true },
  { href: '/', label: 'Settings', active: false }
] as const;

export function Header() {
  return (
    <header className="glass-header">
      <div className="page-shell desktop-gutter header-inner">
        <div className="header-brand-cluster">
          <Link href="/" className="header-brand">
            PhotoPrune
          </Link>

          <nav className="top-nav-desktop header-nav">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`shell-nav-link ${item.active ? 'shell-nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="header-profile">
          <AppIcon name="profile" className="h-[18px] w-[18px]" />
        </div>
      </div>
    </header>
  );
}
