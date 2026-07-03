import { isThai, codePointOf } from '@/utils/thai';

/** Best-effort primary-script detection to seed a default reading language. */
export function detectPrimaryScript(text: string): 'en' | 'th' {
  let thai = 0;
  let latin = 0;
  for (const ch of text) {
    if (isThai(codePointOf(ch))) thai += 1;
    else if (/[a-z]/i.test(ch)) latin += 1;
  }
  return thai > latin ? 'th' : 'en';
}
