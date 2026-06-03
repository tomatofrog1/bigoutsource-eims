import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const BASE_STORAGE_KEY = 'eims_dark_mode';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function applyDarkClass(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `${BASE_STORAGE_KEY}_${user.uid}` : BASE_STORAGE_KEY;

  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return JSON.parse(stored);
    } catch {}
    return false;
  });

  // Re-read preference when user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setIsDark(JSON.parse(stored));
      } else {
        setIsDark(false); // Default to light if no preference is saved for this user
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    applyDarkClass(isDark);
    localStorage.setItem(storageKey, JSON.stringify(isDark));
    // Also save a generic key to prevent flash of wrong theme for the most recently logged in user
    localStorage.setItem(BASE_STORAGE_KEY, JSON.stringify(isDark));
  }, [isDark, storageKey]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
