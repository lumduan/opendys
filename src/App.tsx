import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RootLayout } from '@/layouts/RootLayout';
import { HomePage } from '@/pages/HomePage';

// Landing stays eager; everything heavier is code-split (Suspense lives in RootLayout).
const ReaderPage = lazy(() => import('@/pages/ReaderPage').then((m) => ({ default: m.ReaderPage })));
const OcrPage = lazy(() => import('@/pages/OcrPage').then((m) => ({ default: m.OcrPage })));
const ThaiColorDemoPage = lazy(() =>
  import('@/pages/ThaiColorDemoPage').then((m) => ({ default: m.ThaiColorDemoPage })),
);
const AsrPlaygroundPage = lazy(() =>
  import('@/pages/AsrPlaygroundPage').then((m) => ({ default: m.AsrPlaygroundPage })),
);

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reader" element={<ReaderPage />} />
        <Route path="/read" element={<OcrPage />} />
        <Route path="/dev/thai-colors" element={<ThaiColorDemoPage />} />
        <Route path="/dev/asr-playground" element={<AsrPlaygroundPage />} />
      </Route>
    </Routes>
  );
}
