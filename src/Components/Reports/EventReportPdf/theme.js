import { Font } from '@react-pdf/renderer';

// Registers the app's real display typeface (tailwind.config.js
// `fontFamily.display`) so headings/big numbers match the design system
// instead of react-pdf's built-in Helvetica. Body text stays on Helvetica —
// the app's body typeface (Plus Jakarta Sans) was also tried here, but its
// TTF file has a font-level bug where "fi"/"fl" sequences silently drop a
// letter on text extraction/copy (e.g. "confirmar" -> "confrmar"), and no
// combination of fontFeatureSettings (liga/dlig/clig/calt) fixes it —
// verified against Helvetica, which never exhibits this. Lexend does not
// have this bug once ligature features are disabled (see PdfTemplate's
// `page` style), so it's safe to use for display text.
Font.register({
  family: 'Lexend',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/lexend/v26/wlptgwvFAVdoq2_F94zlCfv0bz1WCzsW_LA.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/lexend/v26/wlptgwvFAVdoq2_F94zlCfv0bz1WC-UR_LA.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/lexend/v26/wlptgwvFAVdoq2_F94zlCfv0bz1WC9wR_LA.ttf', fontWeight: 700 },
  ],
});

export const theme = {
  colors: {
    primary: '#4069FF',     
    primaryLight: '#6687FF',
    primaryDark: '#3451DB',
    
    secondary: '#6366F1',
    secondaryLight: '#818CF8',
    secondaryDark: '#4F46E5',
    
    accent: '#4069FF',
    accentLight: '#6687FF',
    accentDark: '#3451DB',
    
    text: {
      default: '#334155',
      light: '#64748B',
      dark: '#1E293B'
    },
    background: {
      default: '#F1F5F9',
      light: '#FFFFFF',
      dark: '#E2E8F0'
    },
    status: {
      confirmed: '#10B981',
      pending: '#f59e0b',
      canceled: '#ef4444',
      vip: '#1f2937',
      media: '#8b5cf6',
      success: '#10B981',
      warning: '#f59e0b',
      error: '#ef4444'
    },
    white: '#FFFFFF',
    purple: '#8b5cf6',
    yellow: '#f59e0b',
    gray: '#334155',
    border: '#E2E8F0'
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  typography: {
    fontFamily: {
      primary: 'Helvetica',
      display: 'Lexend'
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    },
    fontSize: {
      xs: 8,
      sm: 10,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6
    }
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12
  }
}; 