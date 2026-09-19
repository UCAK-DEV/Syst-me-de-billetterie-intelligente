import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Charte Graphique Officielle des Réseaux de Transport Sénégalais
 * Conçu selon les normes de design system pour la mobilité urbaine & interurbaine.
 */
export const TRANSIT_OPERATORS = [
  {
    id: 'brt',
    name: 'BRT Dakar Mobilités',
    shortCode: 'BRT',
    network: 'Bus Rapid Transit (Lignes B1-B4)',
    badge: '100% Électrique',
    badgeColor: '#0284c7',
    hex: '#0284c7',
    hover: '#0369a1',
    rgb: '2, 132, 199',
    description: 'Flotte de bus électriques à haut niveau de service de l’agglomération dakaroise.',
  },
  {
    id: 'ter',
    name: 'TER Dakar (Seter)',
    shortCode: 'TER',
    network: 'Ligne Express Dakar - AIBD',
    badge: 'Ferroviaire Express',
    badgeColor: '#059669',
    hex: '#059669',
    hover: '#047857',
    rgb: '5, 150, 105',
    description: 'Rames Coradia express reliant le centre-ville de Dakar à Diamniadio et l’Aéroport.',
  },
  {
    id: 'ddd',
    name: 'Dakar Dem Dikk',
    shortCode: 'DDD',
    network: 'Réseau Urbain & Sénégal Dem Dikk',
    badge: 'Réseau National Bus',
    badgeColor: '#0077b6',
    hex: '#0077b6',
    hover: '#023e8a',
    rgb: '0, 119, 182',
    description: 'Opérateur public historique de transport de passagers urbain et interurbain.',
  },
  {
    id: 'national',
    name: 'Sénégal Mobilités (CETUD)',
    shortCode: 'CETUD',
    network: 'Autorité Organisatrice des Transports',
    badge: 'Charte Républicaine',
    badgeColor: '#2563eb',
    hex: '#2563eb',
    hover: '#1d4ed8',
    rgb: '37, 99, 235',
    description: 'Identité unifiée de régulation et de billettique intégrée pour tout le pays.',
  },
];

/**
 * Modes Opérationnels d'Éclairage & Accessibilité (WCAG 2.1 AAA)
 */
export const DISPLAY_MODES = [
  {
    id: 'sunlight',
    name: 'Plein Soleil (Extérieur)',
    icon: 'wb_sunny',
    standard: 'Contraste AAA (12:1)',
    desc: 'Fond blanc pur et typographie noir d’encre pour les contrôleurs en station sous fort ensoleillement.',
  },
  {
    id: 'office',
    name: 'Standard Bureau (Ardoise)',
    icon: 'desktop_windows',
    standard: 'Anti-fatigue oculaire',
    desc: 'Teinte sombre gris bleuté équilibrée pour les postes de supervision et agents au guichet.',
  },
  {
    id: 'oled',
    name: 'Nuit & Éco Batterie (OLED)',
    icon: 'dark_mode',
    standard: 'Économie batterie 30%',
    desc: 'Noir absolu éteignant les pixels AMOLED pour prolonger l’autonomie des terminaux mobiles de contrôle.',
  },
];

/**
 * Ergonomie & Densité d'Affichage Métier (Loi de Fitts)
 */
export const UI_DENSITIES = [
  {
    id: 'touch',
    name: 'Terrain / Confort Tactile',
    icon: 'touch_app',
    badge: 'Cibles 48px+',
    desc: 'Boutons agrandis adaptés à l’usage en station, en marche ou avec des gants de travail.',
  },
  {
    id: 'compact',
    name: 'Supervision / Synthétique',
    icon: 'table_chart',
    badge: 'Haute densité',
    desc: 'Tableaux et cartes resserrés pour visualiser davantage de validations et titres par écran.',
  },
];

const ThemeContext = createContext({
  operator: 'brt',
  displayMode: 'office',
  density: 'touch',
  customizerOpen: false,
  setOperator: () => {},
  setDisplayMode: () => {},
  setDensity: () => {},
  toggleDisplayMode: () => {},
  openCustomizer: () => {},
  closeCustomizer: () => {},
  resetCustomization: () => {},
  // Rétrocompatibilité
  theme: 'dark',
  accentColor: 'brt',
  borderRadius: 'rounded',
});

export function ThemeProvider({ children }) {
  const [operator, setOperatorState] = useState(() => {
    const saved = localStorage.getItem('transitOperator') || localStorage.getItem('appAccentColor');
    return TRANSIT_OPERATORS.some((o) => o.id === saved) ? saved : 'brt';
  });

  const [displayMode, setDisplayModeState] = useState(() => {
    const saved = localStorage.getItem('transitDisplayMode') || localStorage.getItem('theme');
    if (saved === 'sunlight' || saved === 'light') return 'sunlight';
    if (saved === 'oled' || saved === 'dark') return 'oled';
    return 'office'; // Par défaut ardoise pro
  });

  const [density, setDensityState] = useState(() => {
    const saved = localStorage.getItem('transitDensity') || localStorage.getItem('appBorderRadius');
    return saved === 'compact' ? 'compact' : 'touch';
  });

  const [customizerOpen, setCustomizerOpen] = useState(false);

  // Synchronisation des variables CSS dynamiques dans le DOM
  useEffect(() => {
    const root = document.documentElement;

    // Attributs racine
    root.setAttribute('data-theme', displayMode === 'sunlight' ? 'light' : 'dark');
    root.setAttribute('data-mode', displayMode);
    root.setAttribute('data-operator', operator);
    root.setAttribute('data-density', density);

    // Recherche de l'opérateur actif
    const currentOp = TRANSIT_OPERATORS.find((o) => o.id === operator) || TRANSIT_OPERATORS[0];

    // Variables de couleurs métier
    root.style.setProperty('--primary-color', currentOp.hex);
    root.style.setProperty('--primary-hover', currentOp.hover);
    root.style.setProperty('--primary-dark', currentOp.hover);
    root.style.setProperty('--primary-rgb', currentOp.rgb);
    root.style.setProperty('--primary-glow', `rgba(${currentOp.rgb}, 0.45)`);
    root.style.setProperty('--primary-glow-subtle', `rgba(${currentOp.rgb}, 0.16)`);
    root.style.setProperty('--primary-light', `rgba(${currentOp.rgb}, 0.12)`);

    // Densité & Ergonomie
    if (density === 'compact') {
      root.style.setProperty('--radius-card', '10px');
      root.style.setProperty('--radius-btn', '8px');
      root.style.setProperty('--radius-sm', '6px');
      root.style.setProperty('--touch-target-min', '38px');
    } else {
      root.style.setProperty('--radius-card', '18px');
      root.style.setProperty('--radius-btn', '14px');
      root.style.setProperty('--radius-sm', '10px');
      root.style.setProperty('--touch-target-min', '48px');
    }

    // Gestion de l'ambiance lumineuse
    if (displayMode === 'sunlight') {
      // Mode Plein Soleil : Contraste maximal WCAG AAA
      root.style.setProperty('--body-bg', '#f4f5f7');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--card-glass-bg', '#ffffff');
      root.style.setProperty('--text-dark', '#09090b');
      root.style.setProperty('--text-muted', '#475569');
      root.style.setProperty('--border-glass', '#cbd5e1');
      root.style.setProperty('--floating-nav-bg', 'rgba(255, 255, 255, 0.96)');
    } else if (displayMode === 'oled') {
      // Mode Nuit OLED : Noir pur pour économiser la batterie
      root.style.setProperty('--body-bg', '#000000');
      root.style.setProperty('--card-bg', '#09090b');
      root.style.setProperty('--card-glass-bg', '#09090b');
      root.style.setProperty('--text-dark', '#ffffff');
      root.style.setProperty('--text-muted', '#a1a1aa');
      root.style.setProperty('--border-glass', '#27272a');
      root.style.setProperty('--floating-nav-bg', 'rgba(9, 9, 11, 0.94)');
    } else {
      // Mode Office (Ardoise Pro) : Équilibré reposant
      root.style.setProperty('--body-bg', '#0b0f19');
      root.style.setProperty('--card-bg', '#111827');
      root.style.setProperty('--card-glass-bg', 'rgba(17, 24, 39, 0.92)');
      root.style.setProperty('--text-dark', '#f9fafb');
      root.style.setProperty('--text-muted', '#94a3b8');
      root.style.setProperty('--border-glass', 'rgba(255, 255, 255, 0.1)');
      root.style.setProperty('--floating-nav-bg', 'rgba(17, 24, 39, 0.92)');
    }

    // Persistance locale
    localStorage.setItem('transitOperator', operator);
    localStorage.setItem('appAccentColor', operator);
    localStorage.setItem('transitDisplayMode', displayMode);
    localStorage.setItem('theme', displayMode === 'sunlight' ? 'light' : 'dark');
    localStorage.setItem('transitDensity', density);
    localStorage.setItem('appBorderRadius', density === 'compact' ? 'compact' : 'rounded');
  }, [operator, displayMode, density]);

  const toggleDisplayMode = () => {
    setDisplayModeState((prev) => {
      if (prev === 'office') return 'sunlight';
      if (prev === 'sunlight') return 'oled';
      return 'office';
    });
  };

  const setOperator = (op) => setOperatorState(op);
  const setDisplayMode = (m) => setDisplayModeState(m);
  const setDensity = (d) => setDensityState(d);
  const openCustomizer = () => setCustomizerOpen(true);
  const closeCustomizer = () => setCustomizerOpen(false);

  const resetCustomization = () => {
    setOperatorState('brt');
    setDisplayModeState('office');
    setDensityState('touch');
  };

  return (
    <ThemeContext.Provider
      value={{
        operator,
        displayMode,
        density,
        customizerOpen,
        setOperator,
        setDisplayMode,
        setDensity,
        toggleDisplayMode,
        openCustomizer,
        closeCustomizer,
        resetCustomization,
        // Compatibilité avec composants existants
        theme: displayMode === 'sunlight' ? 'light' : 'dark',
        accentColor: operator,
        borderRadius: density === 'compact' ? 'compact' : 'rounded',
        setTheme: (t) => setDisplayModeState(t === 'light' ? 'sunlight' : 'office'),
        setAccentColor: (a) => setOperatorState(a),
        setBorderRadius: (r) => setDensityState(r === 'compact' ? 'compact' : 'touch'),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

