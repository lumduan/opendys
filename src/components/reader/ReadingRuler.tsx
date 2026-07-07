import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import type { StyleVars } from '@/utils/reader';
import { useTranslation } from '@/context/i18nContext';

interface ReadingRulerProps {
  enabled: boolean;
  dim: number;
  bandPx: number;
  children: ReactNode;
}

/**
 * A dimming reading-ruler band scoped to its wrapper: the band's huge `box-shadow` is CLIPPED by the
 * wrapper's `overflow:hidden`, so only the reading text dims — the nav and settings drawer (rendered
 * outside this wrapper) stay bright. Band follows the pointer (rAF-throttled) and the keyboard.
 */
export function ReadingRuler({ enabled, dim, bandPx, children }: ReadingRulerProps) {
  const { t } = useTranslation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const wrapper = wrapperRef.current;
    const band = bandRef.current;
    if (!wrapper || !band) return;

    let raf = 0;
    const setY = (y: number) => {
      const max = Math.max(0, wrapper.clientHeight - band.offsetHeight);
      band.style.setProperty('--band-y', `${Math.max(0, Math.min(max, y))}px`);
    };

    const onPointer = (event: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = wrapper.getBoundingClientRect();
        setY(event.clientY - rect.top - band.offsetHeight / 2);
      });
    };

    setY(wrapper.clientHeight / 2 - band.offsetHeight / 2);
    wrapper.addEventListener('pointermove', onPointer);
    return () => {
      wrapper.removeEventListener('pointermove', onPointer);
      cancelAnimationFrame(raf);
    };
  }, [enabled, bandPx]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const band = bandRef.current;
    const wrapper = wrapperRef.current;
    if (!band || !wrapper) return;
    const cur = parseFloat(band.style.getPropertyValue('--band-y')) || 0;
    const apply = (y: number) => {
      const max = Math.max(0, wrapper.clientHeight - band.offsetHeight);
      band.style.setProperty('--band-y', `${Math.max(0, Math.min(max, y))}px`);
    };
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      apply(cur + bandPx);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      apply(cur - bandPx);
    } else if (event.key === 'Home') {
      apply(0);
    } else if (event.key === 'End') {
      apply(wrapper.clientHeight);
    }
  };

  if (!enabled) return <>{children}</>;

  const bandStyle: StyleVars = {
    height: `${bandPx}px`,
    '--band-y': '0px',
    boxShadow: `0 0 0 100vmax rgba(0, 0, 0, ${dim})`,
  };

  return (
    <div
      ref={wrapperRef}
      className="reader-ruler-wrapper"
      tabIndex={0}
      role="group"
      aria-label={t.reader.rulerAriaLabel}
      onKeyDown={onKeyDown}
    >
      {children}
      <div ref={bandRef} className="reader-ruler-band" style={bandStyle} aria-hidden="true" />
    </div>
  );
}
