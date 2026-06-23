import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import { ThemeProvider } from '../theme/useTheme';
import { I18nProvider } from '../i18n/useI18n';
import { Home } from '../pages/Home';
import { VoiceAssistant } from '../voice/VoiceAssistant';

function renderHome() {
  return render(
    <I18nProvider>
      <ThemeProvider>
        <MemoryRouter>
          <main>
            <Home />
          </main>
        </MemoryRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}

describe('accessibility', () => {
  it('home page has no axe violations', async () => {
    const { container } = renderHome();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('voice launcher exposes dialog semantics and opens an accessible dialog', async () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <VoiceAssistant />
        </ThemeProvider>
      </I18nProvider>
    );
    const launcher = screen.getByRole('button', { name: /ask the assistant/i });
    expect(launcher).toHaveAttribute('aria-haspopup', 'dialog');
    expect(launcher).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(launcher);
    const dialog = screen.getByRole('dialog', { name: /assistant/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // The mic toggle is a real button with a stable accessible name + pressed state.
    const mic = screen.getByRole('button', { name: /start voice/i });
    expect(mic).toHaveAttribute('aria-pressed', 'false');

    // Open dialog must itself be axe-clean.
    expect(await axe(dialog)).toHaveNoViolations();
  });

  it('the conversation transcript is a labeled log region', () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <VoiceAssistant />
        </ThemeProvider>
      </I18nProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /ask the assistant/i }));
    expect(screen.getByRole('log', { name: /conversation transcript/i })).toBeInTheDocument();
  });
});
