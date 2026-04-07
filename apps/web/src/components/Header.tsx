import Link from 'next/link';

const navItems = [
  { href: '/', label: 'Get started' },
  { href: '/run', label: 'Analysis' },
  { href: '/results', label: 'Review' }
] as const;

export function Header() {
  return (
    <header className="glass-header fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[4.5rem] max-w-[1240px] items-center justify-between px-5">
        <Link
          href="/"
          className="font-display text-[1.65rem] font-semibold tracking-tight text-white"
        >
          PhotoPrune
        </Link>

        <nav className="flex items-center gap-4 text-sm text-slate-400">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 transition hover:bg-slate-800/70 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
