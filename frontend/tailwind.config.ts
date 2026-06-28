import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Primary teal: sourced from "deal" wordmark in logo */
        teal: {
          50:  '#E6F7F6',
          100: '#C2EDEA',
          200: '#9AE0DB',
          300: '#6DD2CC',
          400: '#47C6BE',
          500: '#2E9E96',
          600: '#247D76',
          700: '#1A5C57',
          800: '#103C38',
          900: '#071E1C',
        },
        /* Sky blue: sourced from "room" wordmark in logo */
        sky: {
          50:  '#E8F6FB',
          100: '#C5E9F5',
          200: '#9EDAEE',
          300: '#74CAE7',
          400: '#50BCE1',
          500: '#6BC4DC',
          600: '#4A9DB5',
          700: '#347888',
          800: '#1F525C',
          900: '#0D2E33',
        },
        /* Mint: sourced from icon accent shapes in logo */
        mint: {
          50:  '#E8F9F3',
          100: '#C5F0E0',
          200: '#9CE5CB',
          300: '#70D9B5',
          400: '#4DCFA0',
          500: '#7ED4B0',
          600: '#5BAF8C',
          700: '#3E8969',
          800: '#246348',
          900: '#0E3D2C',
        },
        /* Neutral cream: sourced from logo background */
        cream: {
          50:  '#FAFAF9',
          100: '#F5F3F1',
          200: '#EEECEA',
          300: '#E4E1DE',
          400: '#D5D1CD',
          500: '#C1BDB8',
        },
        /* Semantic surface colors */
        surface: '#FFFFFF',
        background: '#EEECEA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(30, 90, 86, 0.06), 0 1px 2px -1px rgba(30, 90, 86, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(30, 90, 86, 0.10), 0 2px 4px -1px rgba(30, 90, 86, 0.06)',
        'elevated': '0 8px 24px 0 rgba(30, 90, 86, 0.12)',
      },
      animation: {
        'pulse-teal': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
