"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SAMPLE_WORDS = [
  "brilliant",
  "inspiring",
  "creative",
  "dedicated",
  "reliable",
  "thoughtful",
  "amazing",
  "supportive",
  "innovative",
  "passionate",
  "leader",
  "kind",
  "talented",
  "motivating",
  "exceptional",
];

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
      // Redirect to team page with admin token so creator can manage members
      router.push(`/team/${data.id}?admin=${data.adminToken}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/30 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="gradient-text">kudoly</span>
        </h1>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-20">
        <div className="w-full max-w-2xl text-center">
          {/* Hero */}
          <div className="animate-fade-in">
            <div className="text-6xl mb-6">✨</div>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              One word.{" "}
              <span className="gradient-text">Big impact.</span>
            </h2>
            <p className="text-lg text-text-muted max-w-md mx-auto mb-12">
              Share anonymous positive feedback with your teammates using just
              one word. Build a culture of appreciation.
            </p>
          </div>

          {/* Create Team Form */}
          <div className="animate-slide-up glass-card rounded-2xl p-8 shadow-lg shadow-accent/5 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-6">
              Create your team space
            </h3>
            <form onSubmit={createTeam} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter your team name..."
                  className="w-full px-4 py-3 rounded-xl border border-card-border bg-white/80 text-foreground placeholder-text-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                  maxLength={50}
                />
              </div>
              {error && (
                <p className="text-error text-sm animate-scale-in">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || !teamName.trim()}
                className="w-full py-3 px-6 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-accent/20 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="animate-pulse-soft">Creating...</span>
                ) : (
                  "Create Team →"
                )}
              </button>
            </form>
          </div>

          {/* Floating sample words */}
          <div className="mt-16 animate-fade-in stagger-3 opacity-0">
            <p className="text-sm text-text-muted mb-4">
              Words your team could share:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SAMPLE_WORDS.map((word, i) => (
                <span
                  key={word}
                  className="px-3 py-1.5 rounded-full text-sm font-medium glass-card text-accent hover:bg-accent/10 transition-colors cursor-default"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {word}
                </span>
              ))}
            </div>
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
