import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Nuancier de couleurs d'accentuation avec pastilles simples et directes.
 */
export const COLOR_PRESETS = [
  { id: 'blue', name: 'Bleu', hex: '#2563eb', hover: '#1d4ed8', rgb: '37, 99, 235' },
  { id: 'green', name: 'Vert', hex: '#10b981', hover: '#059669', rgb: '16, 185, 129' },
  { id: 'orange', name: 'Orange', hex: '#f97316', hover: '#ea580c', rgb: '249, 115, 22' },
  { id: 'purple', name: 'Violet', hex: '#8b5cf6', hover: '#7c3aed', rgb: '139, 92, 246' },
  { id: 'red', name: 'Rouge', hex: '#ef4444', hover: '#dc2626', rgb: '239, 68, 68' },
  { id: 'gray', name: 'Gris', hex: '#64748b', hover: '#475569', rgb: '100, 116, 139' },
];

/**
 * Modes d'ambiance sobres
 */
export const THEME_MODES = [
  { id: 'dark', name: 'Sombre', icon: 'dark_mode', desc: 'Fond sombre profond' },
  { id: 'slate', name: 'Ardoise', icon: 'night_sight', desc: 'Gris bleuté équilibré' },
  { id: 'light', name: 'Clair', icon: 'light_mode', desc: 'Fond blanc éclatant' },
];

/**
 * Styles de formes
 */
export const RADIUS_PRESETS = [
  { id: 'rounded', name: 'Arrondi', desc: 'Style moderne arrondi (16px)' },
  { id: 'compact', name: 'Compact', desc: 'Style sobre et droit (8px)' },
];

const ThemeContext = createContext({
  color: 'blue',
  theme: 'dark',
  borderRadius: 'rounded',
  customizerOpen: false,
  setColor: () => {},
  setTheme: () => {},
  setBorderRadius: () => {},
  toggleTheme: () => {},
  openCustomizer: () => {},
  closeCustomizer: () => {},
  resetCustomization: () => {},
  // Alias pour rétrocompatibilité
  accentColor: 'blue',
  setAccentColor: () => {},
});

export function ThemeProvider({ children }) {
  const [color, setColorState] = useState(() => {
    const saved = localStorage.getItem('appColor') || localStorage.getItem('appAccentColor');
    return COLOR_PRESETS.some((c) => c.id === saved) ? saved : 'blue';
  });

  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'slate' || saved === 'light') return saved;
    return 'dark';
  });

  const [borderRadius, setBorderRadiusState] = useState(() => {
    const saved = localStorage.getItem('appBorderRadius');
    return saved === 'compact' ? 'compact' : 'rounded';
  });

  const [customizerOpen, setCustomizerOpen] = useState(false);

  // Synchronisation des variables CSS dynamiques dans le DOM
  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-color', color);
    root.setAttribute('data-accent', color);
    root.setAttribute('data-radius', borderRadius);

    // Recherche de la couleur active
    const current = COLOR_PRESETS.find((c) => c.id === color) || COLOR_PRESETS[0];

    // Variables de couleurs d'accent
    root.style.setProperty('--primary-color', current.hex);
    root.style.setProperty('--primary-hover', current.hover);
    root.style.setProperty('--primary-dark', current.hover);
    root.style.setProperty('--primary-rgb', current.rgb);
    root.style.setProperty('--primary-glow', `rgba(${current.rgb}, 0.35)`);
    root.style.setProperty('--primary-glow-subtle', `rgba(${current.rgb}, 0.15)`);
    root.style.setProperty('--primary-light', `rgba(${current.rgb}, 0.12)`);

    // Variables des formes
    if (borderRadius === 'compact') {
      root.style.setProperty('--radius-card', '8px');
      root.style.setProperty('--radius-btn', '8px');
      root.style.setProperty('--radius-sm', '6px');
    } else {
      root.style.setProperty('--radius-card', '16px');
      root.style.setProperty('--radius-btn', '12px');
      root.style.setProperty('--radius-sm', '8px');
    }

    // Gestion de l'ambiance de fond
    if (theme === 'dark') {
      root.style.setProperty('--body-bg', '#090d16');
      root.style.setProperty('--card-bg', '#111726');
      root.style.setProperty('--card-glass-bg', 'rgba(17, 23, 38, 0.9)');
      root.style.setProperty('--text-dark', '#f3f4f6');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.08)');
      root.style.setProperty('--floating-nav-bg', 'rgba(15, 21, 32, 0.92)');
    } else if (theme === 'slate') {
      root.style.setProperty('--body-bg', '#0f172a');
      root.style.setProperty('--card-bg', '#1e293b');
      root.style.setProperty('--card-glass-bg', 'rgba(30, 41, 59, 0.9)');
      root.style.setProperty('--text-dark', '#f8fafc');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--floating-nav-bg', 'rgba(24, 33, 47, 0.92)');
    } else {
      root.style.setProperty('--body-bg', '#f8fafc');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--card-glass-bg', 'rgba(255, 255, 255, 0.95)');
      root.style.setProperty('--text-dark', '#0f172a');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-glass', '#e2e8f0');
      root.style.setProperty('--floating-nav-bg', 'rgba(255, 255, 255, 0.95)');
    }

    // Persistance dans localStorage
    localStorage.setItem('appColor', color);
    localStorage.setItem('appAccentColor', color);
    localStorage.setItem('theme', theme);
    localStorage.setItem('appBorderRadius', borderRadius);
  }, [color, theme, borderRadius]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'slate';
      if (prev === 'slate') return 'light';
      return 'dark';
    });
  };

  const setColor = (c) => setColorState(c);
  const setTheme = (t) => setThemeState(t);
  const setBorderRadius = (r) => setBorderRadiusState(r);
  const openCustomizer = () => setCustomizerOpen(true);
  const closeCustomizer = () => setCustomizerOpen(false);

  const resetCustomization = () => {
    setColorState('blue');
    setThemeState('dark');
    setBorderRadiusState('rounded');
  };

  return (
    <ThemeContext.Provider
      value={{
        color,
        theme,
        borderRadius,
        customizerOpen,
        setColor,
        setTheme,
        setBorderRadius,
        toggleTheme,
        openCustomizer,
        closeCustomizer,
        resetCustomization,
        // Alias rétrocompatibilité
        accentColor: color,
        setAccentColor: setColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}


