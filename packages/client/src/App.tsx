import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthGuard } from "./components/AuthGuard";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Placeholder } from "./pages/Placeholder";
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
        <Route path="/login" element={<Placeholder />} />
        <Route path="/signup" element={<Placeholder />} />
        <Route path="/onboarding" element={<Placeholder />} />

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route element={<DashboardLayout />}>
            <Route index element={<Placeholder />} />
            <Route path="chat" element={<Placeholder />} />
            <Route path="chat/:id" element={<Placeholder />} />
            <Route path="research" element={<Placeholder />} />
            <Route path="drafts" element={<Placeholder />} />
            <Route path="drafts/:id" element={<Placeholder />} />
            <Route path="cases" element={<Placeholder />} />
            <Route path="cases/:id" element={<Placeholder />} />
            <Route path="documents" element={<Placeholder />} />
            <Route path="settings" element={<Placeholder />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
