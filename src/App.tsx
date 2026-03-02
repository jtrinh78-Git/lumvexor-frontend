// SECTION: Imports
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

// SECTION: Component
export default function App() {
  const [status, setStatus] = useState<"checking" | "ok" | "error">("checking");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(() => {
        if (!mounted) return;
        setStatus("ok");
        setMessage("Supabase client initialized ✅");
      })
      .catch((err) => {
        if (!mounted) return;
        setStatus("error");
        setMessage(err?.message ?? "Unknown error");
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto" }}>
      <h1 style={{ margin: 0 }}>Lumvexor</h1>
      <p style={{ marginTop: 8 }}>
        Status: <b>{status}</b>
      </p>
      {message ? <pre style={{ background: "#f5f5f5", padding: 12 }}>{message}</pre> : null}
    </div>
  );
}