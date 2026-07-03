import { strings } from '@/i18n/strings';
import { isOcrLanguage, type OcrLanguage } from '@/utils/ocr';

interface LanguageSelectProps {
  value: OcrLanguage;
  onChange: (lang: OcrLanguage) => void;
  disabled?: boolean;
}

export function LanguageSelect({ value, onChange, disabled }: LanguageSelectProps) {
  const t = strings.en.ocr;
  return (
    <label className="form-control w-full max-w-xs">
      <span className="label-text mb-1">{t.languageLabel}</span>
      <select
        className="select select-bordered"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          if (isOcrLanguage(event.target.value)) onChange(event.target.value);
        }}
      >
        <option value="eng+tha">{t.langAuto}</option>
        <option value="eng">{t.langEnglish}</option>
        <option value="tha">{t.langThai}</option>
      </select>
    </label>
  );
}
