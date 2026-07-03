import { isThai, codePointOf } from '@/utils/thai';

export type Script = 'thai' | 'latin';

export interface ScriptRun {
  script: Script;
  text: string;
}

/**
 * Split text into maximal runs of Thai vs non-Thai code points. Drives per-run `lang` tagging
 * (font fallback) and the Latin-only letter-spacing scoping (Thai runs must not be tracked).
 * Whitespace/punctuation count as non-Thai ('latin').
 */
export function splitScriptRuns(text: string): ScriptRun[] {
  const runs: ScriptRun[] = [];
  for (const ch of text) {
    const script: Script = isThai(codePointOf(ch)) ? 'thai' : 'latin';
    const last = runs[runs.length - 1];
    if (last && last.script === script) {
      last.text += ch;
    } else {
      runs.push({ script, text: ch });
    }
  }
  return runs;
}
