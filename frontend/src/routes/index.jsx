import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSession, homeForRole } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const s = getSession();
    if (s) navigate({ to: homeForRole(s.role), replace: true });
    else navigate({ to: "/login", replace: true });
  }, [navigate]);
  return (
    <div className="grid min-h-screen place-items-center text-xs font-mono text-muted-foreground">
      routing…
    </div>
  );
}