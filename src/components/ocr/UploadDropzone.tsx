import { useCallback, useState } from 'react';
import { strings } from '@/i18n/strings';
import { acceptAttribute, isAcceptedImageFile } from '@/utils/ocr';

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onFile, disabled }: UploadDropzoneProps) {
  const t = strings.en.ocr;
  const [dragOver, setDragOver] = useState(false);
  const [rejected, setRejected] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      if (!isAcceptedImageFile(file)) {
        setRejected(true);
        return;
      }
      setRejected(false);
      onFile(file);
    },
    [onFile],
  );

  return (
    <div>
      {/* The <label> wraps a real (visually-hidden) file input, so the whole zone is one
          keyboard-focusable, screen-reader-labelled control; drag/drop is a layered enhancement. */}
      <label
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-box border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-base-300'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!disabled) handleFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          accept={acceptAttribute()}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <span className="text-base-content/80">{t.upload.hint}</span>
        <span className="btn btn-primary pointer-events-none">{t.upload.label}</span>
      </label>
      {rejected && (
        <p role="alert" className="mt-3 text-sm text-error">
          {t.upload.invalidType}
        </p>
      )}
    </div>
  );
}
