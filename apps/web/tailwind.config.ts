import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#005ea5',
        'primary-container': '#0077ce',
        'on-primary': '#ffffff',
        'on-primary-container': '#fdfcff',
        secondary: '#586062',
        'secondary-container': '#dae1e3',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#5d6466',
        tertiary: '#006953',
        'tertiary-container': '#00846a',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#f5fff9',
        background: '#f8f9fa',
        'on-background': '#191c1d',
        surface: '#f8f9fa',
        'on-surface': '#191c1d',
        'surface-container-low': '#f3f4f5',
        'surface-container': '#edeeef',
        'surface-container-high': '#e7e8e9',
        'surface-container-highest': '#e1e3e4',
        'surface-container-lowest': '#ffffff',
        'surface-variant': '#e1e3e4',
        'on-surface-variant': '#404752',
        'surface-dim': '#d9dadb',
        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        outline: '#707784',
        'outline-variant': '#c0c7d4'
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-manrope)', 'sans-serif']
      },
      boxShadow: {
        ambient: '0px 12px 32px rgba(25, 28, 29, 0.06)'
      }
    }
  },
  plugins: []
};
export default config;
