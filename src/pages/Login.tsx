// SECTION: Imports
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// SECTION: Component
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation() as any;

  const from = useMemo(() => location?.state?.from || "/app", [location]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    try {
      if (!email.trim()) {
        setMsg("Enter your email.");
        return;
      }

      if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) throw error;
        setMsg("Check your email for the login link.");
        return;
      }

      if (!password) {
        setMsg("Enter your password.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      navigate(from, { replace: true });
    } catch (err: any) {
      setMsg(err?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: "64px auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>Lumvexor Login</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        Access is controlled. Authenticate to enter the platform.
      </p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button
          type="button"
          onClick={() => setMode("password")}
          disabled={loading}
          style={{ padding: "8px 12px", opacity: mode === "password" ? 1 : 0.7 }}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          disabled={loading}
          style={{ padding: "8px 12px", opacity: mode === "magic" ? 1 : 0.7 }}
        >
          Magic Link
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={loading}
            style={{ padding: 10 }}
          />
        </label>

        {mode === "password" && (
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.7 }}>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              disabled={loading}
              style={{ padding: 10 }}
            />
          </label>
        )}

        <button type="submit" disabled={loading} style={{ padding: 10, fontWeight: 600 }}>
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {msg && <div style={{ marginTop: 8, color: "#b00020" }}>{msg}</div>}
      </form>
    </div>
  );
}