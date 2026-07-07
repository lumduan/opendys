// UI dictionary. The active locale is served by I18nProvider (src/context/I18nProvider.tsx) and read
// via useTranslation(). No user-facing strings are inlined in components — everything routes through
// here. A missing en/th counterpart is a tsc error (Record<Language, UIStrings>), and the error/progress
// sub-objects are Record<…Key, string> so they cannot drift from the hooks' runtime enums.

import type { AsrErrorKey } from '@/hooks/useAsr';
import type { OcrErrorKey } from '@/hooks/useOcr';
import type { OcrProgressMessageKey } from '@/utils/ocr/progress';

export type Language = 'en' | 'th';

export interface Pillar {
  readonly title: string;
  readonly body: string;
}

export interface OcrStrings {
  readonly navLabel: string;
  readonly homeLink: string;
  readonly title: string;
  readonly intro: string;
  readonly languageLabel: string;
  readonly langEnglish: string;
  readonly langThai: string;
  readonly langAuto: string;
  readonly tabUpload: string;
  readonly tabCamera: string;
  readonly engineToggle: string;
  readonly engineCloudNotice: string;
  readonly upload: {
    readonly label: string;
    readonly hint: string;
    readonly invalidType: string;
  };
  readonly camera: {
    readonly start: string;
    readonly capture: string;
    readonly stop: string;
    readonly unavailable: string;
    readonly denied: string;
  };
  // message keys align with OcrProgressMessageKey (src/utils/ocr/progress.ts); `cancel` is a button.
  readonly progress: Readonly<Record<OcrProgressMessageKey, string>> & { readonly cancel: string };
  readonly result: {
    readonly heading: string;
    readonly empty: string;
    readonly copy: string;
    readonly copied: string;
    readonly colorView: string;
    readonly plainView: string;
    readonly confidence: string;
    readonly newImage: string;
    readonly edit: string;
    readonly done: string;
  };
  // keys align with OcrErrorKey (src/hooks/useOcr.ts) — Record<> makes drift a tsc error.
  readonly errors: Readonly<Record<OcrErrorKey, string>>;
}

export interface AsrStrings {
  readonly navLabel: string;
  readonly title: string;
  readonly intro: string;
  readonly cloudNotice: string;
  readonly targetLabel: string;
  readonly sample: string;
  readonly langEnglish: string;
  readonly langThai: string;
  readonly practice: string;
  readonly stop: string;
  readonly requesting: string;
  readonly recording: string;
  readonly processing: string;
  readonly transcriptLabel: string;
  readonly accuracyLabel: string;
  readonly mispronouncedLabel: string;
  readonly homeLink: string;
  readonly modeWhole: string;
  readonly modeLine: string;
  readonly ttsPreviewOn: string;
  readonly ttsPreviewOff: string;
  readonly lineHint: string;
  readonly doneReading: string;
  readonly silenceLabel: string;
  readonly micLevelLabel: string;
  readonly modeAriaLabel: string;
  readonly saved: string;
  // keys align with AsrErrorKey (src/hooks/useAsr.ts) — Record<> makes drift a tsc error.
  readonly errors: Readonly<Record<AsrErrorKey, string>>;
}

export interface ReaderStrings {
  readonly navLabel: string;
  readonly homeLink: string;
  readonly rulerAriaLabel: string;
  readonly pageTitle: string;
  readonly pageIntro: string;
  readonly placeholder: string;
  readonly sample: string;
  readonly langEnglish: string;
  readonly langThai: string;
  readonly readAloud: string;
  readonly stop: string;
  readonly noVoice: string;
  readonly noThaiVoice: string;
}

export interface SettingsStrings {
  readonly title: string;
  readonly open: string;
  readonly close: string;
  readonly reset: string;
  readonly language: string;
  readonly languageEnglish: string;
  readonly languageThai: string;
  readonly languageToggleAria: string;
  readonly font: string;
  readonly fontDyslexic: string;
  readonly fontSarabun: string;
  readonly fontMitr: string;
  readonly fontSystem: string;
  readonly palette: string;
  readonly paletteClassic: string;
  readonly paletteColorblind: string;
  readonly size: string;
  readonly lineSpacing: string;
  readonly letterSpacing: string;
  readonly wordSpacing: string;
  readonly colorCoding: string;
  readonly guideLines: string;
  readonly ruler: string;
  readonly rulerDim: string;
  readonly rulerBand: string;
  readonly speechRate: string;
}

export interface HomeStrings {
  readonly badgeEnglish: string;
  readonly badgeThai: string;
  readonly previewColors: string;
  readonly previewAsr: string;
  readonly statusNote: string;
}

export interface UiStrings {
  readonly loading: string;
}

export interface ThaiDemoStrings {
  readonly title: string;
  readonly placeholder: string;
  readonly homeLink: string;
  readonly legendConsonant: string;
  readonly legendVowel: string;
  readonly legendUpperVowel: string;
  readonly legendLowerVowel: string;
  readonly legendTone: string;
  readonly legendSilent: string;
}

export interface UIStrings {
  readonly appName: string;
  readonly tagline: string;
  readonly offlineBadge: string;
  readonly footer: string;
  readonly home: HomeStrings;
  readonly ui: UiStrings;
  readonly pillars: readonly Pillar[];
  readonly ocr: OcrStrings;
  readonly asr: AsrStrings;
  readonly reader: ReaderStrings;
  readonly settings: SettingsStrings;
  readonly thaiDemo: ThaiDemoStrings;
}

export const strings: Record<Language, UIStrings> = {
  en: {
    appName: 'opendys',
    tagline: 'A free, private reading aid for English and Thai — everything runs in your browser.',
    offlineBadge: '100% offline',
    footer: 'opendys · free & open-source · runs entirely in your browser',
    home: {
      badgeEnglish: 'English',
      badgeThai: 'Thai',
      previewColors: 'Preview the Thai 4-level color engine →',
      previewAsr: 'Try the ASR reading playground →',
      statusNote:
        'Offline OCR is live. Reading tools and text-to-speech arrive next (see docs/plans/ROADMAP.md).',
    },
    ui: {
      loading: 'Loading',
    },
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
    ocr: {
      navLabel: 'Read text',
      homeLink: '← Home',
      title: 'Read text from an image',
      intro: 'Upload or photograph text in English or Thai. Recognition runs entirely on your device.',
      languageLabel: 'Language',
      langEnglish: 'English',
      langThai: 'Thai',
      langAuto: 'Auto (English + Thai)',
      tabUpload: 'Upload',
      tabCamera: 'Camera',
      engineToggle: 'Enhanced Thai OCR (Cloud)',
      engineCloudNotice:
        'This sends your image to Typhoon (opentyphoon.ai) for recognition — it leaves your device. On-device OCR stays private.',
      upload: {
        label: 'Choose an image',
        hint: 'Drag an image here, or choose a file (PNG, JPG, WebP, GIF, BMP).',
        invalidType: 'That file type is not supported. Please use a PNG, JPG, WebP, GIF, or BMP image.',
      },
      camera: {
        start: 'Start camera',
        capture: 'Capture',
        stop: 'Stop',
        unavailable: 'No camera is available on this device. Please upload an image instead.',
        denied: 'Camera permission was denied. Please allow access or upload an image instead.',
      },
      progress: {
        initializing: 'Preparing the offline OCR engine…',
        loadingLanguage: 'Loading the language model…',
        initializingApi: 'Getting ready…',
        recognizing: 'Recognizing text…',
        cancel: 'Cancel',
      },
      result: {
        heading: 'Recognized text',
        empty: 'No text was found in this image. Try a clearer or higher-contrast photo.',
        copy: 'Copy',
        copied: 'Copied!',
        colorView: 'Color-code Thai',
        plainView: 'Plain text',
        confidence: 'Confidence',
        newImage: 'Read another image',
        edit: 'Edit',
        done: 'Done',
      },
      errors: {
        unsupported: 'This browser cannot run on-device OCR (WebAssembly or Web Workers are unavailable).',
        invalidFile: 'That file type is not supported. Please use a PNG, JPG, WebP, GIF, or BMP image.',
        modelMissing: 'A language model could not be loaded. Please rebuild the app assets and try again.',
        recognizeFailed: 'Something went wrong while reading the image. Please try again.',
        cloudNotConfigured:
          'Cloud OCR is not set up on this server. Add a TYPHOON_API key, or use on-device OCR.',
        cloudAuth: 'Cloud OCR rejected the API key. Check the server’s TYPHOON_API key.',
        cloudRateLimit: 'Cloud OCR is rate-limited right now. Please wait a moment and try again.',
        cloudFailed: 'Cloud OCR could not be reached. Check your connection, or use on-device OCR.',
      },
    },
    asr: {
      navLabel: 'Practice reading',
      title: 'Practice reading aloud',
      intro:
        'Read the text aloud and watch each word get checked in real time. Your voice is sent for recognition only while you practice.',
      cloudNotice:
        'Practice sends short clips of your voice to Typhoon (opentyphoon.ai) for speech recognition — audio leaves your device. Nothing is sent unless you start practicing.',
      targetLabel: 'Text to read',
      sample: 'Load a sample',
      langEnglish: 'English',
      langThai: 'Thai',
      practice: 'Practice reading',
      stop: 'Stop',
      requesting: 'Requesting microphone access…',
      recording: 'Listening — read the text aloud.',
      processing: 'Scoring your reading…',
      transcriptLabel: 'What we heard',
      accuracyLabel: 'Accuracy',
      mispronouncedLabel: 'Missed or mispronounced',
      homeLink: '← Home',
      modeWhole: 'Whole passage',
      modeLine: 'Line by line',
      ttsPreviewOn: '🔊 TTS preview: on',
      ttsPreviewOff: '🔊 TTS preview: off',
      lineHint: 'Tap a line to practice',
      doneReading: 'Done reading',
      silenceLabel: 'Auto-stop after silence',
      micLevelLabel: 'Microphone level',
      modeAriaLabel: 'practice mode',
      saved: 'Saved to on-device history ({key}).',
      errors: {
        unsupported:
          'This browser cannot record audio (MediaRecorder or microphone access is unavailable).',
        micDenied: 'Microphone permission was denied. Please allow microphone access and try again.',
        micUnavailable: 'No microphone is available on this device.',
        cloudNotConfigured:
          'Cloud speech recognition is not set up on this server. Add a TYPHOON_API key to enable practice.',
        cloudAuth: 'Cloud speech recognition rejected the API key. Check the server’s TYPHOON_API key.',
        cloudRateLimit: 'Cloud speech recognition is rate-limited right now. Please wait a moment and try again.',
        cloudFailed: 'Cloud speech recognition could not be reached. Check your connection and try again.',
      },
    },
    reader: {
      navLabel: 'Reader',
      homeLink: '← Home',
      rulerAriaLabel: 'Reading ruler',
      pageTitle: 'Reader',
      pageIntro: 'Type or paste English or Thai text, then restyle it, color-code it, and hear it read.',
      placeholder: 'Type or paste text to read…',
      sample: 'Load a sample',
      langEnglish: 'English',
      langThai: 'Thai',
      readAloud: 'Read aloud',
      stop: 'Stop',
      noVoice: 'No offline voice is installed for this language.',
      noThaiVoice: 'No offline Thai voice found. On iOS/macOS: Settings ▸ Accessibility ▸ Spoken Content ▸ Voices ▸ Thai. On Windows: add the Thai language pack.',
    },
    settings: {
      title: 'Reading settings',
      open: 'Reading settings',
      close: 'Close',
      reset: 'Reset to defaults',
      language: 'Language',
      languageEnglish: 'English',
      languageThai: 'ภาษาไทย',
      languageToggleAria: 'Switch language',
      font: 'Font',
      fontDyslexic: 'OpenDyslexic + Sarabun',
      fontSarabun: 'Sarabun (looped)',
      fontMitr: 'Mitr (rounded)',
      fontSystem: 'System',
      palette: 'Color palette',
      paletteClassic: 'Classic',
      paletteColorblind: 'Colorblind-safe',
      size: 'Text size',
      lineSpacing: 'Line spacing',
      letterSpacing: 'Letter spacing',
      wordSpacing: 'Word spacing',
      colorCoding: 'Color-code Thai (by category)',
      guideLines: 'Thai guide lines',
      ruler: 'Reading ruler',
      rulerDim: 'Ruler dimming',
      rulerBand: 'Ruler height',
      speechRate: 'Speech speed',
    },
    thaiDemo: {
      title: 'Thai 4-level color engine — preview',
      placeholder: 'Type or paste Thai text',
      homeLink: '← Home',
      legendConsonant: 'Consonant (base)',
      legendVowel: 'Vowel (spacing)',
      legendUpperVowel: 'Upper vowel',
      legendLowerVowel: 'Lower vowel',
      legendTone: 'Tone mark',
      legendSilent: 'Silent / final',
    },
  },
  th: {
    appName: 'opendys',
    tagline: 'เครื่องมือช่วยการอ่านฟรี รองรับภาษาไทยและอังกฤษ — ทำงานในเบราว์เซอร์ทั้งหมด',
    offlineBadge: 'ออฟไลน์ 100%',
    footer: 'opendys · ฟรีและโอเพนซอร์ส · ทำงานในเบราว์เซอร์ของคุณ',
    home: {
      badgeEnglish: 'อังกฤษ',
      badgeThai: 'ภาษาไทย',
      previewColors: 'ดูตัวอย่างระบบระบายสี 4 ระดับของไทย →',
      previewAsr: 'ลองสนามฝึกอ่านพร้อมวิเคราะห์ผล →',
      statusNote:
        'OCR แบบออฟไลน์ใช้งานได้แล้ว เครื่องมืออ่านและเสียงอ่านจะตามมาในขั้นถัดไป (ดู docs/plans/ROADMAP.md)',
    },
    ui: {
      loading: 'กำลังโหลด',
    },
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
    ocr: {
      navLabel: 'อ่านข้อความ',
      homeLink: '← หน้าแรก',
      title: 'อ่านข้อความจากรูปภาพ',
      intro: 'อัปโหลดหรือถ่ายรูปข้อความภาษาไทยหรืออังกฤษ การแปลงข้อความทำงานบนเครื่องของคุณทั้งหมด',
      languageLabel: 'ภาษา',
      langEnglish: 'อังกฤษ',
      langThai: 'ไทย',
      langAuto: 'อัตโนมัติ (ไทย + อังกฤษ)',
      tabUpload: 'อัปโหลด',
      tabCamera: 'กล้อง',
      engineToggle: 'OCR ภาษาไทยแม่นยำสูง (คลาวด์)',
      engineCloudNotice:
        'จะส่งรูปภาพของคุณไปยัง Typhoon (opentyphoon.ai) เพื่ออ่านข้อความ — ข้อมูลจะออกจากอุปกรณ์ ส่วน OCR บนเครื่องยังเป็นส่วนตัว',
      upload: {
        label: 'เลือกรูปภาพ',
        hint: 'ลากรูปมาที่นี่ หรือเลือกไฟล์ (PNG, JPG, WebP, GIF, BMP)',
        invalidType: 'ไม่รองรับไฟล์ชนิดนี้ กรุณาใช้รูป PNG, JPG, WebP, GIF หรือ BMP',
      },
      camera: {
        start: 'เปิดกล้อง',
        capture: 'ถ่ายภาพ',
        stop: 'หยุด',
        unavailable: 'ไม่พบกล้องบนอุปกรณ์นี้ กรุณาอัปโหลดรูปภาพแทน',
        denied: 'การเข้าถึงกล้องถูกปฏิเสธ กรุณาอนุญาตหรืออัปโหลดรูปภาพแทน',
      },
      progress: {
        initializing: 'กำลังเตรียมเครื่องมือ OCR แบบออฟไลน์…',
        loadingLanguage: 'กำลังโหลดโมเดลภาษา…',
        initializingApi: 'กำลังเตรียมความพร้อม…',
        recognizing: 'กำลังอ่านข้อความ…',
        cancel: 'ยกเลิก',
      },
      result: {
        heading: 'ข้อความที่อ่านได้',
        empty: 'ไม่พบข้อความในรูปนี้ ลองใช้รูปที่ชัดขึ้นหรือคมชัดกว่านี้',
        copy: 'คัดลอก',
        copied: 'คัดลอกแล้ว!',
        colorView: 'ระบายสีภาษาไทย',
        plainView: 'ข้อความธรรมดา',
        confidence: 'ความมั่นใจ',
        newImage: 'อ่านรูปอื่น',
        edit: 'แก้ไข',
        done: 'เสร็จ',
      },
      errors: {
        unsupported: 'เบราว์เซอร์นี้ไม่รองรับ OCR บนเครื่อง (ไม่มี WebAssembly หรือ Web Worker)',
        invalidFile: 'ไม่รองรับไฟล์ชนิดนี้ กรุณาใช้รูป PNG, JPG, WebP, GIF หรือ BMP',
        modelMissing: 'โหลดโมเดลภาษาไม่สำเร็จ กรุณาสร้างไฟล์แอปใหม่แล้วลองอีกครั้ง',
        recognizeFailed: 'เกิดข้อผิดพลาดขณะอ่านรูปภาพ กรุณาลองใหม่อีกครั้ง',
        cloudNotConfigured:
          'เซิร์ฟเวอร์นี้ยังไม่ได้ตั้งค่า OCR แบบคลาวด์ กรุณาเพิ่มคีย์ TYPHOON_API หรือใช้ OCR บนเครื่อง',
        cloudAuth: 'OCR แบบคลาวด์ปฏิเสธคีย์ API กรุณาตรวจสอบคีย์ TYPHOON_API ของเซิร์ฟเวอร์',
        cloudRateLimit: 'OCR แบบคลาวด์ถูกจำกัดอัตราการใช้งานอยู่ กรุณารอสักครู่แล้วลองใหม่',
        cloudFailed: 'ไม่สามารถเชื่อมต่อ OCR แบบคลาวด์ได้ กรุณาตรวจสอบการเชื่อมต่อ หรือใช้ OCR บนเครื่อง',
      },
    },
    asr: {
      navLabel: 'ฝึกอ่าน',
      title: 'ฝึกอ่านออกเสียง',
      intro:
        'อ่านข้อความออกเสียงแล้วดูการตรวจแต่ละคำแบบเรียลไทม์ เสียงของคุณจะถูกส่งไปเพื่อรู้จำเฉพาะตอนที่ฝึกเท่านั้น',
      cloudNotice:
        'การฝึกจะส่งคลิปเสียงสั้น ๆ ของคุณไปยัง Typhoon (opentyphoon.ai) เพื่อรู้จำเสียงพูด — เสียงจะออกจากอุปกรณ์ ระบบจะไม่ส่งอะไรจนกว่าคุณจะเริ่มฝึก',
      targetLabel: 'ข้อความที่จะอ่าน',
      sample: 'ใส่ข้อความตัวอย่าง',
      langEnglish: 'อังกฤษ',
      langThai: 'ไทย',
      practice: 'ฝึกอ่านออกเสียง',
      stop: 'หยุด',
      requesting: 'กำลังขออนุญาตใช้ไมโครโฟน…',
      recording: 'กำลังฟัง — อ่านข้อความออกเสียง',
      processing: 'กำลังประเมินการอ่าน…',
      transcriptLabel: 'สิ่งที่ได้ยิน',
      accuracyLabel: 'ความแม่นยำ',
      mispronouncedLabel: 'คำที่ข้ามหรืออ่านผิด',
      homeLink: '← หน้าแรก',
      modeWhole: 'ทั้งย่อหน้า',
      modeLine: 'ทีละบรรทัด',
      ttsPreviewOn: '🔊 ตัวอย่างเสียง: เปิด',
      ttsPreviewOff: '🔊 ตัวอย่างเสียง: ปิด',
      lineHint: 'แตะบรรทัดเพื่อฝึก',
      doneReading: 'อ่านจบแล้ว',
      silenceLabel: 'หยุดอัตโนมัติเมื่อเงียบ',
      micLevelLabel: 'ระดับเสียงไมโครโฟน',
      modeAriaLabel: 'โหมดฝึกอ่าน',
      saved: 'บันทึกลงประวัติในเครื่องแล้ว ({key})',
      errors: {
        unsupported: 'เบราว์เซอร์นี้ไม่สามารถบันทึกเสียงได้ (ไม่มี MediaRecorder หรือการเข้าถึงไมโครโฟน)',
        micDenied: 'การเข้าถึงไมโครโฟนถูกปฏิเสธ กรุณาอนุญาตแล้วลองใหม่อีกครั้ง',
        micUnavailable: 'ไม่พบไมโครโฟนบนอุปกรณ์นี้',
        cloudNotConfigured:
          'เซิร์ฟเวอร์นี้ยังไม่ได้ตั้งค่าการรู้จำเสียงแบบคลาวด์ กรุณาเพิ่มคีย์ TYPHOON_API เพื่อเปิดใช้การฝึก',
        cloudAuth: 'การรู้จำเสียงแบบคลาวด์ปฏิเสธคีย์ API กรุณาตรวจสอบคีย์ TYPHOON_API ของเซิร์ฟเวอร์',
        cloudRateLimit: 'การรู้จำเสียงแบบคลาวด์ถูกจำกัดอัตราการใช้งานอยู่ กรุณารอสักครู่แล้วลองใหม่',
        cloudFailed: 'ไม่สามารถเชื่อมต่อการรู้จำเสียงแบบคลาวด์ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่',
      },
    },
    reader: {
      navLabel: 'เครื่องอ่าน',
      homeLink: '← หน้าแรก',
      rulerAriaLabel: 'ไม้บรรทัดช่วยอ่าน',
      pageTitle: 'เครื่องอ่าน',
      pageIntro: 'พิมพ์หรือวางข้อความภาษาไทยหรืออังกฤษ แล้วปรับรูปแบบ ระบายสี และฟังเสียงอ่าน',
      placeholder: 'พิมพ์หรือวางข้อความที่ต้องการอ่าน…',
      sample: 'ใส่ข้อความตัวอย่าง',
      langEnglish: 'อังกฤษ',
      langThai: 'ไทย',
      readAloud: 'อ่านออกเสียง',
      stop: 'หยุด',
      noVoice: 'ไม่มีเสียงอ่านแบบออฟไลน์สำหรับภาษานี้',
      noThaiVoice: 'ไม่พบเสียงภาษาไทยแบบออฟไลน์ บน iOS/macOS: ตั้งค่า ▸ การช่วยการเข้าถึง ▸ เนื้อหาที่พูด ▸ เสียง ▸ ไทย บน Windows: เพิ่มชุดภาษาไทย',
    },
    settings: {
      title: 'ตั้งค่าการอ่าน',
      open: 'ตั้งค่าการอ่าน',
      close: 'ปิด',
      reset: 'คืนค่าเริ่มต้น',
      language: 'ภาษา',
      languageEnglish: 'English',
      languageThai: 'ภาษาไทย',
      languageToggleAria: 'เปลี่ยนภาษา',
      font: 'ฟอนต์',
      fontDyslexic: 'OpenDyslexic + สารบรรณ',
      fontSarabun: 'สารบรรณ (มีหัว)',
      fontMitr: 'Mitr (มน)',
      fontSystem: 'ระบบ',
      palette: 'ชุดสี',
      paletteClassic: 'มาตรฐาน',
      paletteColorblind: 'สำหรับตาบอดสี',
      size: 'ขนาดตัวอักษร',
      lineSpacing: 'ระยะบรรทัด',
      letterSpacing: 'ระยะตัวอักษร',
      wordSpacing: 'ระยะคำ',
      colorCoding: 'ระบายสีไทย (ตามหมวด)',
      guideLines: 'เส้นบรรทัดไทย',
      ruler: 'ไม้บรรทัดช่วยอ่าน',
      rulerDim: 'ความมืดไม้บรรทัด',
      rulerBand: 'ความสูงไม้บรรทัด',
      speechRate: 'ความเร็วเสียงอ่าน',
    },
    thaiDemo: {
      title: 'เครื่องมือระบายสี 4 ระดับของไทย — ตัวอย่าง',
      placeholder: 'พิมพ์หรือวางข้อความภาษาไทย',
      homeLink: '← หน้าแรก',
      legendConsonant: 'พยัญชนะ (ฐาน)',
      legendVowel: 'สระ (ระยะ)',
      legendUpperVowel: 'สระบน',
      legendLowerVowel: 'สระล่าง',
      legendTone: 'วรรณยุกต์',
      legendSilent: 'การันต์ (เงียบ)',
    },
  },
};
