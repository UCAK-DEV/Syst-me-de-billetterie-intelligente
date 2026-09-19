import React, { createContext, useContext, useState, useEffect } from 'react';

export const ACCENT_PRESETS = [
  {
    id: 'indigo',
    name: 'Indigo Cyber',
    hex: '#6366f1',
    hover: '#4f46e5',
    rgb: '99, 102, 241',
    description: 'Moderne, élégant et haute précision',
  },
  {
    id: 'emerald',
    name: 'Émeraude Néon',
    hex: '#10b981',
    hover: '#059669',
    rgb: '16, 185, 129',
    description: 'Inspiré des transports écologiques et durables',
  },
  {
    id: 'violet',
    name: 'Violet Électrique',
    hex: '#8b5cf6',
    hover: '#7c3aed',
    rgb: '139, 92, 246',
    description: 'Ambiance technologique futuriste',
  },
  {
    id: 'amber',
    name: 'Ambre Solaire',
    hex: '#f59e0b',
    hover: '#d97706',
    rgb: '245, 158, 11',
    description: 'Chaleureux, dynamique et très contrasté',
  },
  {
    id: 'rose',
    name: 'Rose Rubis',
    hex: '#f43f5e',
    hover: '#e11d48',
    rgb: '244, 63, 94',
    description: 'Audacieux, contemporain et percutant',
  },
  {
    id: 'cyan',
    name: 'Cyan Océan',
    hex: '#06b6d4',
    hover: '#0891b2',
    rgb: '6, 182, 212',
    description: 'Haute visibilité pour la lecture de nuit',
  },
];

export const THEME_MODES = [
  { id: 'dark', name: 'Sombre OLED', icon: 'dark_mode', desc: 'Fond noir profond et vitres néon' },
  { id: 'slate', name: 'Ardoise Pro', icon: 'night_sight', desc: 'Gris bleuté premium' },
  { id: 'light', name: 'Clair Épuré', icon: 'light_mode', desc: 'Contraste blanc éclatant' },
];

export const RADIUS_PRESETS = [
  { id: 'rounded', name: 'Moderne iOS', value: '1.25rem', desc: 'Coins très arrondis (20px)' },
  { id: 'compact', name: 'Sobre Compact', value: '0.625rem', desc: 'Coins affinés (10px)' },
];

const ThemeContext = createContext({
  theme: 'dark',
  accentColor: 'indigo',
  borderRadius: 'rounded',
  customizerOpen: false,
  setTheme: () => {},
  setAccentColor: () => {},
  setBorderRadius: () => {},
  toggleTheme: () => {},
  openCustomizer: () => {},
  closeCustomizer: () => {},
  resetCustomization: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'slate' || saved === 'light') return saved;
    return 'dark'; // Thème sombre par défaut comme la maquette
  });

  const [accentColor, setAccentColorState] = useState(() => {
    const saved = localStorage.getItem('appAccentColor');
    return ACCENT_PRESETS.some((a) => a.id === saved) ? saved : 'indigo';
  });

  const [borderRadius, setBorderRadiusState] = useState(() => {
    const saved = localStorage.getItem('appBorderRadius');
    return saved === 'compact' ? 'compact' : 'rounded';
  });

  const [customizerOpen, setCustomizerOpen] = useState(false);

  // Synchronisation des variables CSS dynamiques dans le DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Attributs racine pour selectors CSS
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accentColor);
    root.setAttribute('data-radius', borderRadius);

    // Recherche de la palette sélectionnée
    const currentAccent = ACCENT_PRESETS.find((a) => a.id === accentColor) || ACCENT_PRESETS[0];

    // Variables de couleur d'accentuation
    root.style.setProperty('--primary-color', currentAccent.hex);
    root.style.setProperty('--primary-hover', currentAccent.hover);
    root.style.setProperty('--primary-dark', currentAccent.hover);
    root.style.setProperty('--primary-rgb', currentAccent.rgb);
    root.style.setProperty('--primary-glow', `rgba(${currentAccent.rgb}, 0.45)`);
    root.style.setProperty('--primary-glow-subtle', `rgba(${currentAccent.rgb}, 0.18)`);
    root.style.setProperty('--primary-light', `rgba(${currentAccent.rgb}, 0.12)`);

    // Variables d'arrondis
    const radiusValue = borderRadius === 'compact' ? '10px' : '20px';
    const radiusSm = borderRadius === 'compact' ? '6px' : '12px';
    root.style.setProperty('--radius-card', radiusValue);
    root.style.setProperty('--radius-btn', radiusValue);
    root.style.setProperty('--radius-sm', radiusSm);

    // Ambiance de fond
    if (theme === 'dark') {
      root.style.setProperty('--body-bg', '#090d16');
      root.style.setProperty('--card-bg', '#131926');
      root.style.setProperty('--card-glass-bg', 'rgba(19, 25, 38, 0.85)');
      root.style.setProperty('--text-dark', '#f3f4f6');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.09)');
      root.style.setProperty('--floating-nav-bg', 'rgba(15, 21, 32, 0.88)');
    } else if (theme === 'slate') {
      root.style.setProperty('--body-bg', '#0f172a');
      root.style.setProperty('--card-bg', '#1e293b');
      root.style.setProperty('--card-glass-bg', 'rgba(30, 41, 59, 0.88)');
      root.style.setProperty('--text-dark', '#f8fafc');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--floating-nav-bg', 'rgba(24, 33, 47, 0.9)');
    } else {
      root.style.setProperty('--body-bg', '#f8fafc');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--card-glass-bg', 'rgba(255, 255, 255, 0.92)');
      root.style.setProperty('--text-dark', '#0f172a');
      root.style.setProperty('--text-muted', '#64748b');
      root.style.setProperty('--border-glass', '#e2e8f0');
      root.style.setProperty('--floating-nav-bg', 'rgba(255, 255, 255, 0.92)');
    }

    // Persistance dans localStorage
    localStorage.setItem('theme', theme);
    localStorage.setItem('appAccentColor', accentColor);
    localStorage.setItem('appBorderRadius', borderRadius);
  }, [theme, accentColor, borderRadius]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'slate';
      if (prev === 'slate') return 'light';
      return 'dark';
    });
  };

  const setTheme = (t) => setThemeState(t);
  const setAccentColor = (c) => setAccentColorState(c);
  const setBorderRadius = (r) => setBorderRadiusState(r);
  const openCustomizer = () => setCustomizerOpen(true);
  const closeCustomizer = () => setCustomizerOpen(false);

  const resetCustomization = () => {
    setThemeState('dark');
    setAccentColorState('indigo');
    setBorderRadiusState('rounded');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accentColor,
        borderRadius,
        customizerOpen,
        setTheme,
        setAccentColor,
        setBorderRadius,
        toggleTheme,
        openCustomizer,
        closeCustomizer,
        resetCustomization,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
