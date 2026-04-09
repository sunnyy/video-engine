import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, onAuthStateChange } from "./services/auth/authService";
import "./App.css"
import Auth          from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard     from "./pages/Dashboard";
import AIGenerator   from "./pages/AIGenerator";
import Editor        from "./pages/Editor";

export default function App() {
  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [recovering, setRecovering] = useState(false); // true when user landed via password-reset link

  useEffect(() => {
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
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
