import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { RootLayout } from '@/layouts/RootLayout';
import { HomePage } from '@/pages/HomePage';
import { ThaiColorDemoPage } from '@/pages/ThaiColorDemoPage';

// Code-split the OCR route — tesseract.js + WASM load only when the user actually reads.
const OcrPage = lazy(() => import('@/pages/OcrPage').then((module) => ({ default: module.OcrPage })));

function RouteFallback() {
  return (
    <div className="flex justify-center p-16">
      <span className="loading loading-spinner loading-lg text-primary" aria-label="Loading" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/read"
          element={
            <Suspense fallback={<RouteFallback />}>
              <OcrPage />
            </Suspense>
          }
        />
        <Route path="/dev/thai-colors" element={<ThaiColorDemoPage />} />
      </Route>
    </Routes>
  );
}
