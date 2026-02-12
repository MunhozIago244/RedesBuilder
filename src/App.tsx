// ─── App.tsx ────────────────────────────────────────────────────────────────
// Root da aplicação — React Router com rotas v3.0 completas.

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "@/components/Shell/AppShell";
import Dashboard from "@/pages/Dashboard";
import NetworkBuilderPage from "@/pages/NetworkBuilderPage";
import ArchBuilderPage from "@/pages/ArchBuilderPage";
import CodeGeneratorPage from "@/pages/CodeGeneratorPage";
import SecurityPage from "@/pages/SecurityPage";
import CostEstimatorPage from "@/pages/CostEstimatorPage";
import TemplateGalleryPage from "@/pages/TemplateGalleryPage";
import VersionHistoryPage from "@/pages/VersionHistoryPage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="redes" element={<NetworkBuilderPage />} />
          <Route path="arch" element={<ArchBuilderPage />} />
          <Route path="codegen" element={<CodeGeneratorPage />} />
          <Route path="security" element={<SecurityPage />} />
          <Route path="cost" element={<CostEstimatorPage />} />
          <Route path="templates" element={<TemplateGalleryPage />} />
          <Route path="versions" element={<VersionHistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
