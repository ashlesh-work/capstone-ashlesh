import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'a508-theme';

interface ThemeContextValue {
  choice: ThemeChoice;
  setChoice: (c: ThemeChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'system') {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return choice;
}

function apply(choice: ThemeChoice): void {
  document.documentElement.dataset.theme = resolve(choice);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) as ThemeChoice : null) || 'system'
  );

  // Re-apply when the OS theme changes, but only while in System mode.
  useEffect(() => {
    apply(choice);
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : 'system';
      if ((stored || 'system') === 'system') apply('system');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const setChoice = (c: ThemeChoice) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, c);
    }
    setChoiceState(c);
  };

  return <ThemeContext.Provider value={{ choice, setChoice }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
