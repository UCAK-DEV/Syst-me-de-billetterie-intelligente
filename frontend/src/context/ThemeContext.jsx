import React, { createContext, useContext, useState, useEffect } from 'react';

// Thème clair/sombre — bascule manuelle avec mémorisation de la préférence dans localStorage.
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  useEffect(() => {
    // Nettoyage préventif de tous les anciens attributs et clés de personnalisation
    localStorage.removeItem('appColor');
    localStorage.removeItem('appAccentColor');
    localStorage.removeItem('appBorderRadius');

    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.removeAttribute('data-color');
    root.removeAttribute('data-accent');
    root.removeAttribute('data-radius');

    // Nettoyage des propriétés CSS inline injectées précédemment
    const propsToRemove = [
      '--primary-color',
      '--primary-hover',
      '--primary-dark',
      '--primary-rgb',
      '--primary-glow',
      '--primary-glow-subtle',
      '--primary-light',
      '--radius-card',
      '--radius-btn',
      '--radius-sm',
      '--body-bg',
      '--card-bg',
      '--card-glass-bg',
      '--text-dark',
      '--text-muted',
      '--border-glass',
      '--floating-nav-bg',
    ];
    propsToRemove.forEach((p) => root.style.removeProperty(p));

    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
