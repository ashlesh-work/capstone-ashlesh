import { useTheme, type ThemeChoice } from './useTheme';
import { useI18n } from '../i18n/useI18n';

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' }
];

/**
 * Three-way theme control as a labeled radiogroup — keyboard operable, with a
 * visible label and accessible names. Defaults to System.
 */
export function ThemeToggle() {
  const { choice, setChoice } = useTheme();
  const { t } = useI18n();
  return (
    <fieldset className="theme-toggle" aria-label={t.colorTheme}>
      <legend className="visually-hidden">Color theme</legend>
      {OPTIONS.map((opt) => (
        <label key={opt.value} className="theme-toggle__opt">
          <input
            type="radio"
            name="theme"
            value={opt.value}
            checked={choice === opt.value}
            onChange={() => setChoice(opt.value)}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
