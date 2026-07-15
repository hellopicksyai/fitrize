import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";

import Nutrition from "@/pages/Nutrition";
import Workout from "@/pages/Workout";
import FormCorrection from "@/pages/FormCorrection";
import Coach from "@/pages/Coach";
import BodyScan from "@/pages/BodyScan";
import Progress from "@/pages/Progress";
import Feedback from "@/pages/Feedback";
import Analytics from "@/pages/Analytics";
import Profile from "@/pages/Profile";
import AdminOverview from "@/pages/AdminOverview";
import Paywall from "@/components/Paywall";

const Protected = ({ children, requireOnboarded = true }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  if (requireOnboarded && !user.onboarded) return <Navigate to="/onboarding" replace />;
  return children;
};

const Shell = ({ children }) => (
  <Protected><AppShell>{children}</AppShell></Protected>
);

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Protected requireOnboarded={false}><Onboarding /></Protected>} />
            <Route path="/app" element={<Shell><Dashboard /></Shell>} />
            <Route path="/app/tracker" element={<Navigate to="/app/nutrition" replace />} />
            <Route path="/app/nutrition" element={<Shell><Paywall feature="Custom Meal Plans"><Nutrition /></Paywall></Shell>} />
            <Route path="/app/workout" element={<Shell><Workout /></Shell>} />
            <Route path="/app/form" element={<Shell><Paywall feature="Live Form Correction"><FormCorrection /></Paywall></Shell>} />
            <Route path="/app/coach" element={<Shell><Coach /></Shell>} />
            <Route path="/app/body-scan" element={<Shell><Paywall feature="AI Body Scan"><BodyScan /></Paywall></Shell>} />
            <Route path="/app/progress" element={<Shell><Progress /></Shell>} />
            <Route path="/app/feedback" element={<Shell><Feedback /></Shell>} />
            <Route path="/app/log-workout" element={<Navigate to="/app/workout" replace />} />
            <Route path="/app/analytics" element={<Shell><Analytics /></Shell>} />
            <Route path="/app/profile" element={<Shell><Profile /></Shell>} />
            <Route path="/app/admin" element={<Shell><AdminOverview /></Shell>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster richColors position="top-right" theme="dark"/>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
