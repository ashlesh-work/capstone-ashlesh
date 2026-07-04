import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/useTheme';
import { SiteHeader, SiteFooter, SkipLink } from './components/SiteChrome';
import { Home } from './pages/Home';
import { Topics } from './pages/Topics';
import { Topic } from './pages/Topic';
import { Eval } from './pages/Eval';
import { VoiceAssistant } from './voice/VoiceAssistant';
import { VoiceFirstProvider, useVoiceFirstContext } from './voice/VoiceFirstContext';
import { VoiceFirstMode } from './voice/VoiceFirstMode';

function AppContent() {
  const { voiceFirstActive, exitVoiceFirst } = useVoiceFirstContext();

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/topics/:id" element={<Topic />} />
          {/* Trainer/evaluator console: tracing, LLM-as-judge, safety probes */}
          <Route path="/eval" element={<Eval />} />
        </Routes>
      </main>
      <SiteFooter />
      <VoiceAssistant />

      {/* Voice-first immersive overlay */}
      {voiceFirstActive && <VoiceFirstMode onExit={exitVoiceFirst} />}
    </>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <VoiceFirstProvider>
          <AppContent />
        </VoiceFirstProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

