import { useTranslation } from '@/context/i18nContext';
import type { OcrProgressInfo } from '@/utils/ocr';

interface OcrProgressProps {
  progress: OcrProgressInfo;
  onCancel: () => void;
}

export function OcrProgress({ progress, onCancel }: OcrProgressProps) {
  const t = useTranslation().t.ocr;
  return (
    <div className="rounded-box bg-base-100 p-6 shadow-sm">
      <div className="mb-2 flex items-center justify-between" aria-live="polite">
        <span>{t.progress[progress.messageKey]}</span>
        <span className="tabular-nums">{progress.percent}%</span>
      </div>
      <progress className="progress progress-primary w-full" value={progress.percent} max={100} />
      <div className="mt-4 text-right">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t.progress.cancel}
        </button>
      </div>
    </div>
  );
}
