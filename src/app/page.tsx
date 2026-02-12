"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [teamName, setTeamName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });

      if (!res.ok) throw new Error("Failed to create team");

      const data = await res.json();
      router.push(`/team/${data.id}?admin=${data.adminToken}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Animated mesh background */}
      <div className="mesh-bg" />

      {/* Floating orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="orb w-80 h-80 bg-purple-500/20 top-10 -left-20" />
        <div
          className="orb w-96 h-96 bg-pink-500/15 -bottom-20 right-0"
          style={{ animationDelay: "2s", animationDuration: "8s" }}
        />
        <div
          className="orb w-64 h-64 bg-cyan-500/15 top-1/3 right-1/4"
          style={{ animationDelay: "4s", animationDuration: "10s" }}
        />
        <div
          className="orb w-48 h-48 bg-green-500/10 bottom-1/3 left-1/4"
          style={{ animationDelay: "1s", animationDuration: "7s" }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center py-8">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="gradient-text">kudoly</span>
        </h1>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-2xl text-center">
          {/* Hero */}
          <div className="animate-fade-in">
            <div className="text-7xl mb-8 animate-float">✨</div>
            <h2 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
              One word.{" "}
              <span className="gradient-text">Big impact.</span>
            </h2>
            <p className="text-lg text-text-muted max-w-md mx-auto mb-14 leading-relaxed">
              Share anonymous positive feedback with your teammates using just
              one word. Build a culture of appreciation.
            </p>
          </div>

          {/* Create Team Form */}
          <div className="animate-slide-up gradient-border rounded-2xl p-8 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-6 text-foreground">
              Create your team space
            </h3>
            <form onSubmit={createTeam} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name..."
                  className="w-full px-4 py-3.5 rounded-xl border border-white/10 bg-white/5 text-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all backdrop-blur-sm"
                  maxLength={50}
                />
              </div>
              {error && (
                <p className="text-error text-sm animate-scale-in">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !teamName.trim()}
                className="w-full py-3.5 px-6 rounded-xl btn-glow text-white font-semibold text-base"
              >
                {loading ? (
                  <span className="animate-pulse-soft">Creating...</span>
                ) : (
                  "Create Team →"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-sm text-text-muted">
        Made with 💜 to spread positivity
      </footer>
    </div>
  );
}
