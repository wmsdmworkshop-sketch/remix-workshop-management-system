/**
 * =============================================================================
 * DWIP Enterprise V1.1.0 — Enterprise Theme Engine & Font Manager
 * =============================================================================
 */

export type ThemeName = 'enterprise-dark' | 'enterprise-light' | 'tata-theme' | 'high-contrast' | 'compact' | 'glass';

export interface ThemeConfig {
  id: ThemeName;
  name: string;
  description: string;
  bgClass: string;
  textClass: string;
  accentColor: string;
}

export const THEME_CONFIGS: Record<ThemeName, ThemeConfig> = {
  'enterprise-dark': {
    id: 'enterprise-dark',
    name: 'Enterprise Dark',
    description: 'Deep navy-slate dark theme optimized for operational consoles',
    bgClass: 'bg-slate-950 text-slate-100',
    textClass: 'text-slate-100',
    accentColor: '#3b82f6'
  },
  'enterprise-light': {
    id: 'enterprise-light',
    name: 'Enterprise Light',
    description: 'High-clarity light theme for daytime administration',
    bgClass: 'bg-slate-50 text-slate-900',
    textClass: 'text-slate-900',
    accentColor: '#2563eb'
  },
  'tata-theme': {
    id: 'tata-theme',
    name: 'Tata Motors Blue',
    description: 'Official Tata Motors Commercial Vehicle corporate theme',
    bgClass: 'bg-blue-950 text-blue-50',
    textClass: 'text-blue-50',
    accentColor: '#0284c7'
  },
  'high-contrast': {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Maximum contrast theme for high-visibility workshop displays',
    bgClass: 'bg-black text-yellow-300',
    textClass: 'text-yellow-300',
    accentColor: '#eab308'
  },
  'compact': {
    id: 'compact',
    name: 'Compact Density',
    description: 'Dense layout theme for high-information density monitors',
    bgClass: 'bg-slate-900 text-slate-200',
    textClass: 'text-slate-200',
    accentColor: '#10b981'
  },
  'glass': {
    id: 'glass',
    name: 'Glassmorphic Modern',
    description: 'Translucent glass card theme with subtle gradient backdrops',
    bgClass: 'bg-slate-900/90 backdrop-blur-md text-slate-100',
    textClass: 'text-slate-100',
    accentColor: '#8b5cf6'
  }
};

const THEME_STORAGE_KEY = 'dwip_user_theme_preference';

export function getStoredTheme(): ThemeName {
  if (typeof window === 'undefined') return 'enterprise-dark';
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName;
  return saved && THEME_CONFIGS[saved] ? saved : 'enterprise-dark';
}

export function applyTheme(themeName: ThemeName): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  
  // Remove existing theme classes
  Object.keys(THEME_CONFIGS).forEach(t => root.classList.remove(`theme-${t}`));
  
  // Add new theme class
  root.classList.add(`theme-${themeName}`);
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
}

export function inspectFontStack(): { primary: string; fallbackActive: boolean; status: string } {
  if (typeof window === 'undefined') return { primary: 'Inter', fallbackActive: false, status: 'Loaded' };
  
  const isInterAvailable = document.fonts ? document.fonts.check('12px Inter') : true;
  return {
    primary: isInterAvailable ? 'Inter' : 'Segoe UI (Fallback)',
    fallbackActive: !isInterAvailable,
    status: isInterAvailable ? 'Inter Font Native' : 'Fallback System Font Active'
  };
}
