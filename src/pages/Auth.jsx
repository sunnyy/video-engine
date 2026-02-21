import React, { useState } from "react";
import { signIn, signUp } from "../services/auth/authService";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }

      navigate("/");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-[350px] rounded-lg bg-white p-6 shadow">
        <h2 className="mb-6 text-xl font-semibold">
          {mode === "login" ? "Login" : "Register"}
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="mb-3 w-full rounded border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="mb-4 w-full rounded border px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          className="w-full rounded bg-black py-2 text-white"
        >
          {mode === "login" ? "Login" : "Register"}
        </button>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? "No account?" : "Already have account?"}
          <button
            onClick={() =>
              setMode(mode === "login" ? "register" : "login")
            }
            className="ml-2 text-indigo-600"
          >
            {mode === "login" ? "Register" : "Login"}
          </button>
        </div>
      </div>
    </div>
  );
}