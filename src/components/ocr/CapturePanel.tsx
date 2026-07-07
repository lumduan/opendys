import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/context/i18nContext';

interface CapturePanelProps {
  onCapture: (blob: Blob) => void;
  disabled?: boolean;
}

type CameraState = 'idle' | 'starting' | 'live' | 'unavailable' | 'denied';

export function CapturePanel({ onCapture, disabled }: CapturePanelProps) {
  const t = useTranslation().t.ocr;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('idle');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState('idle');
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('live');
    } catch (err) {
      setState(err instanceof DOMException && err.name === 'NotAllowedError' ? 'denied' : 'unavailable');
    }
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        stop();
      }
    }, 'image/png');
  }, [onCapture, stop]);

  if (state === 'unavailable' || state === 'denied') {
    return (
      <div role="alert" className="alert alert-warning rounded-box">
        <span>{state === 'denied' ? t.camera.denied : t.camera.unavailable}</span>
      </div>
    );
  }

  return (
    <div className="rounded-box bg-base-100 p-4 shadow-sm">
      <div className="overflow-hidden rounded-box bg-black">
        <video ref={videoRef} className="mx-auto max-h-72 w-full object-contain" playsInline muted />
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {state === 'live' ? (
          <>
            <button type="button" className="btn btn-primary" onClick={capture} disabled={disabled}>
              {t.camera.capture}
            </button>
            <button type="button" className="btn btn-ghost" onClick={stop}>
              {t.camera.stop}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={start}
            disabled={disabled || state === 'starting'}
          >
            {t.camera.start}
          </button>
        )}
      </div>
    </div>
  );
}
