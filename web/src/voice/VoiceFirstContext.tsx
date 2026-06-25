import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface VoiceFirstContextValue {
  voiceFirstActive: boolean;
  enterVoiceFirst: () => void;
  exitVoiceFirst: () => void;
}

const VoiceFirstContext = createContext<VoiceFirstContextValue | null>(null);

/**
 * Provides global state for the voice-first mode toggle.
 * Any component can call enterVoiceFirst() to launch the immersive overlay.
 */
export function VoiceFirstProvider({ children }: { children: ReactNode }) {
  const [voiceFirstActive, setVoiceFirstActive] = useState(false);

  const enterVoiceFirst = useCallback(() => setVoiceFirstActive(true), []);
  const exitVoiceFirst = useCallback(() => setVoiceFirstActive(false), []);

  return (
    <VoiceFirstContext.Provider value={{ voiceFirstActive, enterVoiceFirst, exitVoiceFirst }}>
      {children}
    </VoiceFirstContext.Provider>
  );
}

export function useVoiceFirstContext(): VoiceFirstContextValue {
  const ctx = useContext(VoiceFirstContext);
  if (!ctx) throw new Error('useVoiceFirstContext must be used within VoiceFirstProvider');
  return ctx;
}
