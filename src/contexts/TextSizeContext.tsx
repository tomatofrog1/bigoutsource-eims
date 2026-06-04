import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const BASE_STORAGE_KEY = 'eims_text_size';

export type TextSize = 'small' | 'medium' | 'large';

export const TEXT_SIZES: TextSize[] = ['small', 'medium', 'large'];

// Root font-size per level. All rem-based Tailwind sizes scale from this, so the
// whole UI grows proportionally (text + row heights together), avoiding overflow
// in the tight tables. 'small' clears the override to respect the browser default
// (the original size). Keep the medium/large values in sync with index.html's
// flash-prevention script.
const FONT_SIZES: Record<TextSize, string> = {
  small: '',
  medium: '112.5%',
  large: '125%',
};

function parseSize(raw: string | null): TextSize {
  return raw && (TEXT_SIZES as string[]).includes(raw) ? (raw as TextSize) : 'small';
}

interface TextSizeContextType {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

function applyTextSize(size: TextSize) {
  document.documentElement.style.fontSize = FONT_SIZES[size];
}

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `${BASE_STORAGE_KEY}_${user.uid}` : BASE_STORAGE_KEY;

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    try {
      return parseSize(localStorage.getItem(storageKey));
    } catch {
      return 'small';
    }
  });

  // Re-read preference when user changes
  useEffect(() => {
    try {
      setTextSizeState(parseSize(localStorage.getItem(storageKey)));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    applyTextSize(textSize);
    try {
      localStorage.setItem(storageKey, textSize);
      // Also save a generic key to prevent flash of wrong size for the most recently logged in user
      localStorage.setItem(BASE_STORAGE_KEY, textSize);
    } catch {}
  }, [textSize, storageKey]);

  const setTextSize = (size: TextSize) => setTextSizeState(size);

  return (
    <TextSizeContext.Provider value={{ textSize, setTextSize }}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = useContext(TextSizeContext);
  if (context === undefined) {
    throw new Error('useTextSize must be used within a TextSizeProvider');
  }
  return context;
}
