import { memo, useMemo, type KeyboardEvent } from 'react';
import { splitScriptRuns } from '@/utils/reader';
import { ColorText } from './ColorText';

interface ChunkProps {
  raw: string;
  index: number;
  colorCoding: boolean;
  active: boolean;
  speakable: boolean;
  onSpeak: (index: number, text: string) => void;
}

function ChunkImpl({ raw, index, colorCoding, active, speakable, onSpeak }: ChunkProps) {
  // Split into Thai/Latin runs for lang-tagging (font fallback + Latin-only letter-spacing).
  const runs = useMemo(() => splitScriptRuns(raw), [raw]);

  const speak = () => {
    if (speakable) onSpeak(index, raw);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (speakable && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      speak();
    }
  };

  const className =
    'reader-chunk' +
    (active ? ' reader-chunk--active' : '') +
    (speakable ? ' reader-chunk--speakable' : '');

  return (
    <span
      data-chunk-index={index}
      className={className}
      role={speakable ? 'button' : undefined}
      tabIndex={speakable ? 0 : undefined}
      onClick={speak}
      onKeyDown={onKeyDown}
    >
      {runs.map((run, runIndex) =>
        run.script === 'thai' ? (
          <span key={runIndex} lang="th">
            {colorCoding ? <ColorText text={run.text} /> : run.text}
          </span>
        ) : (
          <span key={runIndex} lang="en">
            {run.text}
          </span>
        ),
      )}
    </span>
  );
}

/** Memoized so only the two chunks whose `active` flips re-render during read-aloud. */
export const Chunk = memo(ChunkImpl);
