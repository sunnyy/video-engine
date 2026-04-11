import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, onAuthStateChange } from "./services/auth/authService";
import { setInsufficientCreditsHandler } from "./services/serverApi";
import "./App.css"
import Auth             from "./pages/Auth";
import ResetPassword    from "./pages/ResetPassword";
import Dashboard        from "./pages/Dashboard";
import AIGenerator      from "./pages/AIGenerator";
import Editor           from "./pages/Editor";
import AdminDashboard   from "./pages/admin/AdminDashboard";
import UserManager      from "./pages/admin/UserManager";
import LayoutManager    from "./pages/admin/LayoutManager";
import LayoutEditor     from "./pages/admin/LayoutEditor";
import ImageLibrary     from "./pages/admin/ImageLibrary";

export default function App() {
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [recovering, setRecovering] = useState(false); // true when user landed via password-reset link

  useEffect(() => {
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Auth />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<AIGenerator />} />
            <Route path="/editor/:id" element={<Editor />} />

            {/* Admin routes — role-gated: app_metadata.role must equal "admin" */}
            {isAdmin ? (
              <>
                <Route path="/admin"          element={<AdminDashboard />} />
                <Route path="/admin/users"    element={<UserManager />} />
                <Route path="/admin/layouts"              element={<LayoutManager />} />
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
