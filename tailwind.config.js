/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1030px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff', 
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#4069FF', // Current primary
          600: '#3451DB', // Current primary-dark
          700: '#2d3a8c',
          800: '#1e2a78',
          900: '#1e1b4b',
          950: '#0f0f2e',
          light: '#6687FF', // Keeping for backward compatibility
          dark: '#3451DB', // Keeping for backward compatibility
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          50: '#f0f4ff',
          100: '#dee8ff',
          200: '#c3d4ff',
          300: '#a0baff',
          400: '#7896ff',
          500: '#6366F1', // Current secondary
          600: '#4F46E5', // Current secondary-dark
          700: '#3730a3',
          800: '#312e81',
          900: '#292673',
          950: '#14143a',
          light: '#818CF8', // Keeping for backward compatibility
          dark: '#4F46E5', // Keeping for backward compatibility
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        background: {
          50: '#F9FAFB',
          100: '#F1F5F9', // Current background
          200: '#E2E8F0',
          300: '#CBD5E0',
          400: '#A0AEC0',
          500: '#718096',
          600: '#4A5568',
          700: '#2D3748',
          800: '#1E293B', // Current background-dark
          900: '#0F172A',
          950: '#020617',
          // Semantic tokens for consistent theming
          'app': '#F1F5F9',           // Main app background (light)
          'app-dark': '#0F172A',      // Main app background (dark)
          'surface': '#FFFFFF',        // Elevated surfaces like cards (light)
          'surface-dark': '#1E293B',  // Elevated surfaces like cards (dark)
          'surface-hover': '#F8FAFC', // Hover state for surfaces (light)
          'surface-hover-dark': '#334155', // Hover state for surfaces (dark)
          // Backward compatibility
          light: '#FFFFFF',
          dark: '#1E293B',
          DEFAULT: 'rgb(var(--background) / <alpha-value>)',
        },
        text: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e0',
          400: '#94a3b8',
          500: '#64748b', // Current text-light
          600: '#475569',
          700: '#334155', // Current text
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
          // Dark mode specific tokens for better WCAG compliance
          'primary-dark': '#f1f5f9',   // 100 - Primary text in dark mode
          'secondary-dark': '#cbd5e1', // 300 - Secondary text in dark mode
          'tertiary-dark': '#94a3b8',  // 400 - Tertiary text in dark mode
          'muted-dark': '#64748b',     // 500 - Muted text in dark mode
          // Backward compatibility
          light: '#64748B',
          dark: '#f1f5f9', // Updated from cbd5e0 for better contrast
          DEFAULT: '#334155',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10B981', // Current success
          600: '#059669', // Current success-dark
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
          light: '#DCFCE7', // Keeping for backward compatibility
          dark: '#059669', // Keeping for backward compatibility
          DEFAULT: 'rgb(var(--success) / <alpha-value>)',
          foreground: 'rgb(var(--success-foreground) / <alpha-value>)',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Current warning
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
          DEFAULT: 'rgb(var(--warning) / <alpha-value>)',
          foreground: 'rgb(var(--warning-foreground) / <alpha-value>)',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Current error
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
          DEFAULT: '#ef4444',
        },
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
          light: '#F3F4F6', // Keeping for backward compatibility
          dark: '#4B5563', // Keeping for backward compatibility
          DEFAULT: '#9CA3AF', // Keeping for backward compatibility
        },
        focus: {
          DEFAULT: '#2563EB',
          ring: 'rgba(37, 99, 235, 0.2)',
        },
        roles: {
          team: {
            DEFAULT: '#10B981',
            light: '#DCFCE7',
            dark: '#059669',
          },
          attendee: {
            DEFAULT: '#4069FF',
            light: '#6687FF',
            dark: '#3451DB',
          },
          vip: '#1f2937',
          media: '#8b5cf6',
        },
        confirmed: {
          DEFAULT: '#0ea5e9',
          light: '#e0f2fe',
          dark: '#0284c7',
        },
        vip: '#1f2937',
        media: '#8b5cf6',
        white: '#FFFFFF',
        black: '#000000',
        transparent: 'transparent',
        // shadcn/ui semantic tokens (CSS variable-based, RGB channels for opacity support)
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        sidebar: {
          DEFAULT: 'rgb(var(--sidebar) / <alpha-value>)',
          foreground: 'rgb(var(--sidebar-foreground) / <alpha-value>)',
          accent: 'rgb(var(--sidebar-accent) / <alpha-value>)',
          'accent-foreground': 'rgb(var(--sidebar-accent-foreground) / <alpha-value>)',
          border: 'var(--sidebar-border)',
        },
      },
      fontFamily: {
        sans: [
          'Plus Jakarta Sans',
          'system-ui',
          'sans-serif'
        ],
        display: [
          'Lexend',
          'Inter var',
          'sans-serif'
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
        'base': ['1rem', { lineHeight: '1.5rem', letterSpacing: '0.01em' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '0.01em' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '0' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.01em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.01em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      spacing: {
        '0.5': '0.125rem',
        '1.5': '0.375rem',
        '2.5': '0.625rem',
        '3.5': '0.875rem',
        // Semantic spacing tokens for consistency
        // Container spacing (for modals, pages)
        'container-sm': '1rem',      // 16px
        'container-md': '1.5rem',    // 24px
        'container-lg': '2rem',      // 32px
        // Card internal padding
        'card-sm': '1rem',           // 16px
        'card-md': '1.5rem',         // 24px
        'card-lg': '2rem',           // 32px
        // Section spacing (vertical between major sections)
        'section-xs': '2rem',        // 32px
        'section-sm': '3rem',        // 48px
        'section-md': '4rem',        // 64px
        'section-lg': '6rem',        // 96px
        // Gap spacing (between components and elements)
        'gap-component': '1.5rem',   // 24px - Between components
        'gap-element': '0.75rem',    // 12px - Between elements
      },
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',   // 4px
        DEFAULT: '0.5rem',  // 8px
        'md': '0.75rem',   // 12px
        'lg': '1rem',      // 16px - Small cards, buttons
        'xl': '1.25rem',   // 20px - Medium cards
        '2xl': '1.5rem',   // 24px - Large cards, modals
        '3xl': '2rem',     // 32px - Hero sections, special elements
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'card': '0 2px 8px -1px rgba(0, 0, 0, 0.12), 0 1px 3px -1px rgba(0, 0, 0, 0.08)',
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'none': 'none',
        'soft': '0 2px 10px 0 rgba(0, 0, 0, 0.05)',
        'elevated': '0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        // Dark mode shadows — minimal, borders do the work
        'dark-card': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'dark-elevated': '0 4px 12px -2px rgba(0, 0, 0, 0.15)',
        'dark-glass': '0 4px 16px 0 rgba(0, 0, 0, 0.1)',
        // Glow effects for accent elements in dark mode
        'glow-primary': '0 0 20px rgba(64, 105, 255, 0.3)',
        'glow-success': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-error': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-in-out',
        'fade-out': 'fadeOut 150ms ease-in-out',
        'scale-in': 'scaleIn 150ms ease-in-out',
        'scale-out': 'scaleOut 150ms ease-in-out',
        'slide-in': 'slideIn 150ms ease-in-out',
        'slide-out': 'slideOut 150ms ease-in-out',
        'modal-fade': 'modalFade 200ms ease-out',
        'modal-scale': 'modalScale 200ms ease-out',
        'modal-slide-up': 'modalSlideUp 200ms ease-out',
        'modal-slide-down': 'modalSlideDown 200ms ease-out',
        'dropdown-slide': 'dropdownSlide 150ms ease-out',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-sm': 'bounceSm 1s infinite',
        'pulse': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out', 
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'scale-up': 'scaleUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        fadeOut: {
          '0%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        scaleIn: {
          '0%': { opacity: 0, transform: 'scale(0.95)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: 1, transform: 'scale(1)' },
          '100%': { opacity: 0, transform: 'scale(0.95)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        bounceSm: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.98)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        modalFade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        modalScale: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        modalSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        modalSlideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        dropdownSlide: {
          '0%': { opacity: '0', transform: 'translateY(-5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
      },
      transitionDuration: {
        '50': '50ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'width': 'width',
        'transform': 'transform',
        'opacity-transform': 'opacity, transform',
      },
      aspectRatio: {
        'square': '1 / 1',
        'card': '2 / 3',
        'video': '16 / 9',
      },
      outline: {
        primary: '2px solid #4069FF',
        secondary: '2px solid #6366F1',
        success: '2px solid #10B981',
        error: '2px solid #ef4444',
        warning: '2px solid #f59e0b',
      },
      outlineOffset: {
        '3': '3px',
      },
      backgroundImage: {
        // Primary gradients
        'gradient-primary': 'linear-gradient(135deg, #4069FF 0%, #6366F1 100%)',
        'gradient-primary-soft': 'linear-gradient(135deg, rgba(64, 105, 255, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
        // Success gradients
        'gradient-success': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'gradient-success-soft': 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
        // Error/Danger gradients
        'gradient-error': 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        'gradient-error-soft': 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
        // Warm gradient
        'gradient-warm': 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        // Cool gradient
        'gradient-cool': 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
        // Dark mode specific
        'gradient-dark': 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
        'gradient-dark-subtle': 'linear-gradient(180deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.8) 100%)',
        // Glass gradients
        'gradient-glass-light': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'gradient-glass-dark': 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
      },
      zIndex: {
        '0': 0,
        '10': 10,
        '20': 20,
        '30': 30,
        '40': 40,
        '50': 50,
        '60': 60,
        '70': 70,
        '80': 80,
        '90': 90,
        '100': 100,
        'auto': 'auto',
      },
      opacity: {
        '5': '0.05',
        '15': '0.15',
        '35': '0.35',
        '65': '0.65',
        '85': '0.85',
        '95': '0.95',
      },
      translate: {
        'hover': '-2px',    // Subtle lift on hover
        'active': '1px',    // Subtle press feedback
      },
      scale: {
        '98': '0.98',       // Active/pressed state
        '102': '1.02',      // Subtle hover grow
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        DEFAULT: '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '40px',
        '3xl': '64px',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-hide': {
          /* Firefox */
          'scrollbar-width': 'none',
          /* Safari and Chrome */
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          '&::-webkit-scrollbar': {
            width: '4px',
            height: '4px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '9999px',
          }
        },
        '.no-tap-highlight': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        // Enhanced glassmorphism utilities
        '.glass': {
          'background': 'rgba(255, 255, 255, 0.25)',
          'backdrop-filter': 'blur(8px)',
          '-webkit-backdrop-filter': 'blur(8px)'
        },
        '.dark-glass': {
          'background': 'rgba(17, 25, 40, 0.75)',
          'backdrop-filter': 'blur(8px)',
          '-webkit-backdrop-filter': 'blur(8px)'
        },
        '.glass-light': {
          'background': 'rgba(255, 255, 255, 0.7)',
          'backdrop-filter': 'blur(12px) saturate(150%)',
          '-webkit-backdrop-filter': 'blur(12px) saturate(150%)',
          'border': '1px solid rgba(255, 255, 255, 0.2)',
          'box-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        },
        '.glass-dark': {
          'background': 'rgba(17, 25, 40, 0.8)',
          'backdrop-filter': 'blur(12px) saturate(150%)',
          '-webkit-backdrop-filter': 'blur(12px) saturate(150%)',
          'border': '1px solid rgba(255, 255, 255, 0.1)',
          'box-shadow': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        },
        '.glass-primary': {
          'background': 'rgba(64, 105, 255, 0.15)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(64, 105, 255, 0.2)',
          'box-shadow': '0 0 20px rgba(64, 105, 255, 0.1)',
        },
        '.glass-success': {
          'background': 'rgba(16, 185, 129, 0.15)',
          'backdrop-filter': 'blur(12px)',
          '-webkit-backdrop-filter': 'blur(12px)',
          'border': '1px solid rgba(16, 185, 129, 0.2)',
          'box-shadow': '0 0 20px rgba(16, 185, 129, 0.1)',
        },
      }
      addUtilities(newUtilities);
    }
  ],
}