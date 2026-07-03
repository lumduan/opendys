import { Routes, Route } from 'react-router-dom';
import { RootLayout } from '@/layouts/RootLayout';
import { HomePage } from '@/pages/HomePage';
import { ThaiColorDemoPage } from '@/pages/ThaiColorDemoPage';

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dev/thai-colors" element={<ThaiColorDemoPage />} />
      </Route>
    </Routes>
  );
}
