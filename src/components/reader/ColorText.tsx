import { useMemo } from 'react';
import { toColorClusters } from '@/utils/thai';

/** Render a Thai run with the FR-3 4-level color coding (reuses the Phase 2 engine). */
export function ColorText({ text }: { text: string }) {
  const clusters = useMemo(() => toColorClusters(text), [text]);
  return (
    <>
      {clusters.map((cluster, clusterIndex) => (
        <span key={clusterIndex}>
          {cluster.tokens.map((token, tokenIndex) => (
            <span key={tokenIndex} style={{ color: token.color }}>
              {token.char}
            </span>
          ))}
        </span>
      ))}
    </>
  );
}
