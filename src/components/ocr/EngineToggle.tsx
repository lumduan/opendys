import { strings } from '@/i18n/strings';
import type { OcrEngineKind } from '@/services/ocr/tesseractClient';

interface EngineToggleProps {
  value: OcrEngineKind;
  onChange: (engine: OcrEngineKind) => void;
  disabled?: boolean;
}

/**
 * Opt-in switch for the Typhoon cloud engine. Rendered only when the server has a key configured
 * (`useOcr().typhoonAvailable`). Off = on-device/private default; on shows a persistent privacy notice
 * because the image then leaves the device.
 */
export function EngineToggle({ value, onChange, disabled }: EngineToggleProps) {
  const t = strings.en.ocr;
  const cloud = value === 'typhoon';
  return (
    <div className="form-control w-full max-w-xs">
      <label className="label cursor-pointer justify-start gap-3">
        <input
          type="checkbox"
          className="toggle toggle-primary"
          checked={cloud}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked ? 'typhoon' : 'tesseract')}
        />
        <span className="label-text">{t.engineToggle}</span>
      </label>
      {cloud && (
        <p role="note" className="mt-1 text-xs text-warning">
          ⚠ {t.engineCloudNotice}
        </p>
      )}
    </div>
  );
}
