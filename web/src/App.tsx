import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/useTheme';
import { SiteHeader, SiteFooter, SkipLink } from './components/SiteChrome';
import { Home } from './pages/Home';
import { Topics } from './pages/Topics';
import { Topic } from './pages/Topic';
import { VoiceAssistant } from './voice/VoiceAssistant';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <SkipLink />
        <SiteHeader />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/topics/:id" element={<Topic />} />
          </Routes>
        </main>
        <SiteFooter />
        <VoiceAssistant />
      </BrowserRouter>
    </ThemeProvider>
  );
}
