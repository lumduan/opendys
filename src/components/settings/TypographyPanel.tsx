import { strings } from '@/i18n/strings';
import { useSettings } from '@/context/settingsContext';
import { READER_LIMITS, type FontChoice, type PaletteName } from '@/utils/reader';

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}

// Local (non-exported) helpers — keeps this file's single exported component for react-refresh.
function Slider({ label, min, max, step, value, suffix = '', onChange }: SliderProps) {
  return (
    <label className="form-control">
      <div className="label-text flex justify-between">
        <span>{label}</span>
        <span className="tabular-nums text-base-content/60">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="range range-primary range-sm"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="label-text">{label}</span>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function TypographyPanel() {
  const t = strings.en.settings;
  const { settings, update, reset } = useSettings();

  return (
    <div className="space-y-4">
      <label className="form-control">
        <span className="label-text mb-1">{t.font}</span>
        <select
          className="select select-bordered select-sm"
          value={settings.fontChoice}
          onChange={(event) => update({ fontChoice: event.target.value as FontChoice })}
        >
          <option value="dyslexic">{t.fontDyslexic}</option>
          <option value="sarabun">{t.fontSarabun}</option>
          <option value="mitr">{t.fontMitr}</option>
          <option value="system">{t.fontSystem}</option>
        </select>
      </label>

      <label className="form-control">
        <span className="label-text mb-1">{t.palette}</span>
        <select
          className="select select-bordered select-sm"
          value={settings.palette}
          onChange={(event) => update({ palette: event.target.value as PaletteName })}
        >
          <option value="classic">{t.paletteClassic}</option>
          <option value="colorblind">{t.paletteColorblind}</option>
        </select>
      </label>

      <Slider label={t.size} min={12} max={48} step={1} value={settings.fontSizePx} suffix="px" onChange={(v) => update({ fontSizePx: v })} />
      <Slider label={t.lineSpacing} min={1} max={3} step={0.1} value={settings.lineHeight} onChange={(v) => update({ lineHeight: v })} />
      <Slider label={t.letterSpacing} min={0} max={0.5} step={0.01} value={settings.letterSpacingEm} suffix="em" onChange={(v) => update({ letterSpacingEm: v })} />
      <Slider label={t.wordSpacing} min={0} max={1} step={0.02} value={settings.wordSpacingEm} suffix="em" onChange={(v) => update({ wordSpacingEm: v })} />

      <div className="divider my-1" />

      <Toggle label={t.colorCoding} checked={settings.colorCoding} onChange={(v) => update({ colorCoding: v })} />
      <Toggle label={t.guideLines} checked={settings.guideLines} onChange={(v) => update({ guideLines: v })} />
      <Toggle label={t.ruler} checked={settings.ruler} onChange={(v) => update({ ruler: v })} />

      {settings.ruler && (
        <>
          <Slider label={t.rulerDim} min={READER_LIMITS.rulerDim[0]} max={READER_LIMITS.rulerDim[1]} step={0.05} value={settings.rulerDim} onChange={(v) => update({ rulerDim: v })} />
          <Slider label={t.rulerBand} min={READER_LIMITS.rulerBandPx[0]} max={READER_LIMITS.rulerBandPx[1]} step={4} value={settings.rulerBandPx} suffix="px" onChange={(v) => update({ rulerBandPx: v })} />
        </>
      )}

      <div className="divider my-1" />

      <Slider label={t.speechRate} min={READER_LIMITS.ttsRate[0]} max={READER_LIMITS.ttsRate[1]} step={0.1} value={settings.ttsRate} suffix="×" onChange={(v) => update({ ttsRate: v })} />

      <button type="button" className="btn btn-outline btn-sm w-full" onClick={reset}>
        {t.reset}
      </button>
    </div>
  );
}
