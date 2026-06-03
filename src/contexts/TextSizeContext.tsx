import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const BASE_STORAGE_KEY = 'eims_text_size';

export type TextSize = 'normal' | 'large' | 'xlarge';

const SIZE_TO_PX: Record<TextSize, string> = {
  normal: '16px',
  large: '18px',
  xlarge: '20px',
};

interface TextSizeContextType {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const TextSizeContext = createContext<TextSizeContextType | undefined>(undefined);

function isTextSize(value: unknown): value is TextSize {
  return value === 'normal' || value === 'large' || value === 'xlarge';
}

function applyTextSize(size: TextSize) {
  document.documentElement.style.fontSize = SIZE_TO_PX[size] ?? SIZE_TO_PX.normal;
}

export function TextSizeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const storageKey = user ? `${BASE_STORAGE_KEY}_${user.uid}` : BASE_STORAGE_KEY;

  const [textSize, setTextSizeState] = useState<TextSize>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (isTextSize(stored)) return stored;
    } catch {}
    return 'normal';
  });

  // Re-read preference when the user changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      setTextSizeState(isTextSize(stored) ? stored : 'normal');
    } catch {
      setTextSizeState('normal');
    }
  }, [storageKey]);

  useEffect(() => {
    applyTextSize(textSize);
    localStorage.setItem(storageKey, textSize);
    // Mirror to the generic key so index.html can apply it before paint
    localStorage.setItem(BASE_STORAGE_KEY, textSize);
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
