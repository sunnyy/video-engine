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
import ImageLibrary    from "./pages/admin/ImageLibrary";
import Analytics       from "./pages/admin/Analytics";
import Credits         from "./pages/admin/Credits";
import PlansSales      from "./pages/admin/PlansSales";
import System          from "./pages/admin/System";

export default function App() {
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [recovering, setRecovering] = useState(false); // true when user landed via password-reset link

  useEffect(() => {
    // Pre-warm the layout registry cache so sync getters work before generation
    initLayoutRegistry().catch(() => {});

    // Register global handler for 402 NO_CREDITS responses
    setInsufficientCreditsHandler(() => {
      alert("Not enough credits. Purchase more to continue.");
      // TODO: replace alert with a credits purchase modal / navigate to /pricing
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

  // Password recovery flow — show reset form regardless of session state
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
        {!session ? (
          <>
            <Route path="/"              element={<LandingPage />} />
            <Route path="/login"         element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms"         element={<TermsOfService />} />
            <Route path="/privacy"       element={<PrivacyPolicy />} />
            <Route path="/refunds"       element={<RefundPolicy />} />
            <Route path="*"              element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<AIGenerator />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/terms"   element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refunds" element={<RefundPolicy />} />

            {/* Admin routes — role-gated: app_metadata.role must equal "admin" */}
            {isAdmin ? (
              <>
                <Route path="/admin"               element={<AdminDashboard />} />
                <Route path="/admin/analytics"    element={<Analytics />} />
                <Route path="/admin/users"        element={<UserManager />} />
                <Route path="/admin/credits"      element={<Credits />} />
                <Route path="/admin/plans"        element={<PlansSales />} />
                <Route path="/admin/system"       element={<System />} />
                <Route path="/admin/layouts"              element={<LayoutManager />} />
                <Route path="/admin/ai-generator"         element={<LayoutGenerator />} />
                <Route path="/admin/layouts/:layoutId"   element={<LayoutEditor />} />
                <Route path="/admin/library"             element={<ImageLibrary />} />
              </>
            ) : (
              <Route path="/admin/*" element={<Navigate to="/" />} />
            )}

            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
