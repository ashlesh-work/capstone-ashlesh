import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/useTheme';
import { SiteHeader, SiteFooter, SkipLink } from './components/SiteChrome';
import { Home } from './pages/Home';
import { Topics } from './pages/Topics';
import { Topic } from './pages/Topic';
import { Eval } from './pages/Eval';
import { useEvalEnabled, setEvalEnabled } from './lib/evalMode';

/** Renders the eval console only when Evaluation mode is on. */
function EvalGate() {
  const enabled = useEvalEnabled();
  if (enabled) return <Eval />;
  return (
    <div className="page" style={{ maxWidth: 700, margin: '0 auto', padding: '1rem' }}>
      <h1>Evaluation console is disabled</h1>
      <p>
        Evaluation mode is currently off, so the trainer console (tracing, LLM-as-a-judge,
        safety probes) is hidden. Enable it here or with the toggle in the page footer.
      </p>
      <button type="button" onClick={() => setEvalEnabled(true)}>
        Enable evaluation mode
      </button>
    </div>
  );
}
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
          {/* Trainer/evaluator console: tracing, LLM-as-judge, safety probes.
              Gated by the footer "Evaluation mode" toggle. */}
          <Route path="/eval" element={<EvalGate />} />
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

