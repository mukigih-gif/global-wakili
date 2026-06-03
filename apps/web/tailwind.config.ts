import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/modules/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Royal Justice — Deep Navy + Prestige Gold ──────────────────────
        primary: {
          50:  '#EEF2FA',
          100: '#D5E0F0',
          200: '#ADC2E3',
          300: '#7A9ACE',
          400: '#4D75B8',
          500: '#2A5298',
          600: '#1B3A6B',   // ← Main brand blue
          700: '#142E57',   // ← Hover / darker
          800: '#0D1F3C',   // ← Hero backgrounds
          900: '#071529',
          950: '#040D1C',
        },
        accent: {
          50:  '#FDFAEE',
          100: '#F9F0CC',
          200: '#F3E098',
          300: '#ECCB5C',
          400: '#D4AF37',   // ← Classic prestige gold
          500: '#C9A227',   // ← Main accent gold
          600: '#A8841F',
          700: '#856919',
          800: '#624E12',
          900: '#3F320B',
        },
        // Navy dark surfaces (hero, sidebar, modals)
        navy: {
          50:  '#EEF2FA',
          800: '#0D1F3C',
          900: '#071529',
          950: '#040D1C',
        },
        // Supporting semantic colours
        success: {
          50:  '#F0FDF4',
          500: '#059669',
          700: '#047857',
        },
        warning: {
          50:  '#FFFBEB',
          500: '#D97706',
          700: '#B45309',
        },
        danger: {
          50:  '#FEF2F2',
          500: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Lexend', 'Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg:  '0.625rem',
        xl:  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        'gold':    '0 4px 24px 0 rgba(201,162,39,0.25)',
        'navy':    '0 8px 40px 0 rgba(11,29,60,0.40)',
        'card':    '0 1px 4px 0 rgba(27,58,107,0.08)',
        'card-lg': '0 4px 16px 0 rgba(27,58,107,0.12)',
      },
      backgroundImage: {
        'gradient-royal': 'linear-gradient(135deg, #0D1F3C 0%, #1B3A6B 60%, #2A5298 100%)',
        'gradient-gold':  'linear-gradient(135deg, #C9A227 0%, #D4AF37 50%, #A8841F 100%)',
        'gradient-hero':  'linear-gradient(160deg, #071529 0%, #0D1F3C 40%, #1B3A6B 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
