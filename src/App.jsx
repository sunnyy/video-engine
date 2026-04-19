import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, onAuthStateChange } from "./services/auth/authService";
import { setInsufficientCreditsHandler } from "./services/serverApi";
import { initLayoutRegistry } from "./core/registries/layoutRegistry";
import "./App.css"
import LandingPage     from "./pages/LandingPage";
import TermsOfService  from "./pages/legal/TermsOfService";
import PrivacyPolicy   from "./pages/legal/PrivacyPolicy";
import RefundPolicy    from "./pages/legal/RefundPolicy";
import About           from "./pages/About";
import Auth            from "./pages/Auth";
import ResetPassword   from "./pages/ResetPassword";
import Dashboard       from "./pages/Dashboard";
import AIGenerator     from "./pages/AIGenerator";
import Editor          from "./pages/Editor";
import AdminDashboard  from "./pages/admin/AdminDashboard";
import UserManager     from "./pages/admin/UserManager";
import LayoutManager   from "./pages/admin/LayoutManager";
import LayoutEditor    from "./pages/admin/LayoutEditor";
import LayoutGenerator from "./pages/admin/LayoutGenerator";
import ImageGeneration from "./pages/ImageGeneration";
import Transcription   from "./pages/Transcription";
import Feedback        from "./pages/Feedback";
import Assets          from "./pages/Assets";
import CreditsPage     from "./pages/Credits";
import Settings        from "./pages/Settings";
import ImageLibrary    from "./pages/admin/ImageLibrary";
import Analytics       from "./pages/admin/Analytics";
import Credits         from "./pages/admin/Credits";
import PlansSales      from "./pages/admin/PlansSales";
import System          from "./pages/admin/System";

export default function App() {
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    initLayoutRegistry().catch(() => {});

    setInsufficientCreditsHandler(() => {
      alert("Not enough credits. Purchase more to continue.");
    });

    getSession().then((sess) => {
      setSession(sess);
      setLoading(false);
    });

    const sub = onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
        setSession(sess);
      } else if (event === "SIGNED_IN") {
        setRecovering(false);
        setSession(sess);
      } else if (event === "SIGNED_OUT") {
        setRecovering(false);
        setSession(null);
      } else if (event === "USER_UPDATED") {
        setRecovering(false);
        setSession(sess);
      }
    });

    return () => sub.unsubscribe();
  }, []);

  if (loading) return null;

  const isAdmin = session?.user?.app_metadata?.role === "admin";

  if (recovering) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<ResetPassword onDone={() => setRecovering(false)} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public routes — always accessible ── */}
        <Route path="/"              element={<LandingPage />} />
        <Route path="/about"         element={<About />} />
        <Route path="/terms"         element={<TermsOfService />} />
        <Route path="/privacy"       element={<PrivacyPolicy />} />
        <Route path="/refunds"       element={<RefundPolicy />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* /login → redirect to /dashboard if already signed in */}
        <Route path="/login" element={session ? <Navigate to="/dashboard" /> : <Auth />} />

        {/* ── Protected app routes ── */}
        {session ? (
          <>
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/new"              element={<AIGenerator />} />
            <Route path="/image-generation" element={<ImageGeneration />} />
            <Route path="/transcription"    element={<Transcription />} />
            <Route path="/feedback"         element={<Feedback />} />
            <Route path="/assets"           element={<Assets />} />
            <Route path="/credits"          element={<CreditsPage />} />
            <Route path="/settings"         element={<Settings />} />
            <Route path="/editor/:id"       element={<Editor />} />

            {/* Admin routes */}
            {isAdmin ? (
              <>
                <Route path="/admin"                   element={<AdminDashboard />} />
                <Route path="/admin/analytics"         element={<Analytics />} />
                <Route path="/admin/users"             element={<UserManager />} />
                <Route path="/admin/credits"           element={<Credits />} />
                <Route path="/admin/plans"             element={<PlansSales />} />
                <Route path="/admin/system"            element={<System />} />
                <Route path="/admin/layouts"           element={<LayoutManager />} />
                <Route path="/admin/ai-generator"      element={<LayoutGenerator />} />
                <Route path="/admin/layouts/:layoutId" element={<LayoutEditor />} />
                <Route path="/admin/library"           element={<ImageLibrary />} />
              </>
            ) : (
              <Route path="/admin/*" element={<Navigate to="/dashboard" />} />
            )}

            {/* Unknown routes → app home */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        ) : (
          /* Unauthenticated → gate to login */
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
