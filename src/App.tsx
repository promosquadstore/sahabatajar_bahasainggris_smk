/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import UploadData from './pages/UploadData';
import Generator from './pages/Generator';
import Result from './pages/Result';
import History from './pages/History';
import References from './pages/References';
import PublishGuide from './pages/PublishGuide';
import { FirebaseProvider } from './components/FirebaseProvider';

export default function App() {
  return (
    <FirebaseProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<UploadData />} />
            <Route path="generator" element={<Generator />} />
            <Route path="references" element={<References />} />
            <Route path="guide" element={<PublishGuide />} />
            <Route path="result/:id" element={<Result />} />
            <Route path="history" element={<History />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </FirebaseProvider>
  );
}
