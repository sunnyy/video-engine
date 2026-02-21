import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession } from "./services/auth/authService";
import "./App.css"
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import AIGenerator from "./pages/AIGenerator";
import Editor from "./pages/Editor";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then((sess) => {
      setSession(sess);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        {!session ? (
          <>
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