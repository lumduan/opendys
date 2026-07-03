// Minimal UI dictionary. A full i18n context/provider lands in Phase 4 (see ROADMAP).
// No user-facing strings are inlined in components — everything routes through here.

export type Language = 'en' | 'th';

export interface Pillar {
  readonly title: string;
  readonly body: string;
}

export interface UIStrings {
  readonly appName: string;
  readonly tagline: string;
  readonly offlineBadge: string;
  readonly footer: string;
  readonly pillars: readonly Pillar[];
}

export const strings: Record<Language, UIStrings> = {
  en: {
    appName: 'opendys',
    tagline: 'A free, private reading aid for English and Thai — everything runs in your browser.',
    offlineBadge: '100% offline',
    footer: 'opendys · free & open-source · runs entirely in your browser',
    pillars: [
      {
        title: 'Offline OCR',
        body: 'Snap or upload a photo of text and recognize it on-device — no image ever leaves your browser.',
      },
      {
        title: 'Dyslexia-friendly type',
        body: 'Tune font, size, and spacing; switch to weighted or looped fonts for English and Thai.',
      },
      {
        title: 'Thai 4-level color coding',
        body: 'Consonants, vowels, tone marks, and silent finals are colored and aligned to their vertical level.',
      },
      {
        title: 'Read aloud',
        body: 'Tap any word or sentence for offline text-to-speech in English or Thai.',
      },
    ],
  },
  th: {
    appName: 'opendys',
    tagline: 'เครื่องมือช่วยการอ่านฟรี รองรับภาษาไทยและอังกฤษ — ทำงานในเบราว์เซอร์ทั้งหมด',
    offlineBadge: 'ออฟไลน์ 100%',
    footer: 'opendys · ฟรีและโอเพนซอร์ส · ทำงานในเบราว์เซอร์ของคุณ',
    pillars: [
      {
        title: 'OCR แบบออฟไลน์',
        body: 'ถ่ายหรืออัปโหลดรูปข้อความแล้วแปลงเป็นตัวอักษรบนเครื่อง — รูปภาพไม่ถูกส่งออกไปที่ใด',
      },
      {
        title: 'ตัวอักษรที่อ่านง่าย',
        body: 'ปรับฟอนต์ ขนาด และระยะห่าง เลือกฟอนต์มีหัวที่อ่านง่ายทั้งไทยและอังกฤษ',
      },
      {
        title: 'ระบายสี 4 ระดับของไทย',
        body: 'พยัญชนะ สระ วรรณยุกต์ และตัวการันต์ ถูกแยกสีและจัดตำแหน่งตามระดับแนวตั้ง',
      },
      {
        title: 'อ่านออกเสียง',
        body: 'แตะคำหรือประโยคเพื่อฟังเสียงอ่านแบบออฟไลน์ทั้งภาษาไทยและอังกฤษ',
      },
    ],
  },
};
