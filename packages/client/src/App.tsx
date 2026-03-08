import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ChatPage } from "./pages/ChatPage";
import { DraftsPage } from "./pages/DraftsPage";
import { DraftFormPage } from "./pages/DraftFormPage";
import { DraftResultPage } from "./pages/DraftResultPage";
import { ResearchPage } from "./pages/ResearchPage";
import { CasesPage } from "./pages/CasesPage";
import { CaseDetailPage } from "./pages/CaseDetailPage";
import { Placeholder } from "./pages/Placeholder";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { useAuthStore } from "./stores/auth.store";

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="chat/:id" element={<ChatPage />} />
            <Route path="research" element={<ResearchPage />} />
            <Route path="drafts" element={<DraftsPage />} />
            <Route path="drafts/:templateId" element={<DraftFormPage />} />
            <Route path="drafts/result/:documentId" element={<DraftResultPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/:id" element={<CaseDetailPage />} />
            <Route path="documents" element={<Placeholder />} />
            <Route path="settings" element={<Placeholder />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
