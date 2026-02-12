"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";

interface FeedbackWord {
  word: string;
  count: number;
}

interface Member {
  id: string;
  name: string;
  feedback: FeedbackWord[];
  myVote: string | null;
}

interface Team {
  id: string;
  name: string;
  isAdmin: boolean;
  members: Member[];
}

// Color palette for feedback word tags
const TAG_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
  "bg-rose-100 text-rose-700",
  "bg-indigo-100 text-indigo-700",
  "bg-cyan-100 text-cyan-700",
  "bg-orange-100 text-orange-700",
];

function getTagColor(index: number) {
  return TAG_COLORS[index % TAG_COLORS.length];
}

// Generate a deterministic avatar gradient from a name
function getAvatarGradient(name: string) {
  const gradients = [
    "from-purple-400 to-pink-400",
    "from-blue-400 to-cyan-400",
    "from-green-400 to-teal-400",
    "from-orange-400 to-rose-400",
    "from-indigo-400 to-purple-400",
    "from-pink-400 to-rose-400",
    "from-teal-400 to-green-400",
    "from-amber-400 to-orange-400",
  ];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

// Get or create a persistent voter ID in localStorage
function getVoterId(): string {
  if (typeof window === "undefined") return "";
  let voterId = localStorage.getItem("kudoly_voter_id");
  if (!voterId) {
    voterId = crypto.randomUUID();
    localStorage.setItem("kudoly_voter_id", voterId);
  }
  return voterId;
}

export default function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const searchParams = useSearchParams();
  const adminToken = searchParams.get("admin");

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [voterId, setVoterId] = useState<string>("");
  const [newMember, setNewMember] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState("");

  // Feedback state: per-member input words and messages
  const [feedbackWords, setFeedbackWords] = useState<Record<string, string>>({});
  const [submittingFor, setSubmittingFor] = useState<string | null>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});
  const [showConfetti, setShowConfetti] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [revealedMembers, setRevealedMembers] = useState<Set<string>>(new Set());
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  // Initialize voter ID on mount
  useEffect(() => {
    setVoterId(getVoterId());
  }, []);

  const fetchTeam = useCallback(async () => {
    const vid = getVoterId();
    try {
      const params = new URLSearchParams();
      if (adminToken) params.set("admin", adminToken);
      if (vid) params.set("voter", vid);
      const qs = params.toString();
      const url = `/api/teams/${teamId}${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Team not found");
      const data = await res.json();
      setTeam(data);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, adminToken]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.trim()) return;

    setAddingMember(true);
    setMemberError("");

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newMember.trim(), adminToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add member");
      }

      setNewMember("");
      fetchTeam();
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Failed to add member"
      );
    } finally {
      setAddingMember(false);
    }
  };

  // Initialize feedback words from existing votes when team loads
  useEffect(() => {
    if (team && !isAdmin) {
      const words: Record<string, string> = {};
      team.members.forEach((m) => {
        if (m.myVote) {
          words[m.id] = m.myVote;
        }
      });
      setFeedbackWords((prev) => ({ ...words, ...prev }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team]);

  const isAdmin = adminToken ? team?.isAdmin ?? false : false;

  const updateFeedbackWord = (memberId: string, value: string) => {
    const val = value.replace(/\s/g, "");
    setFeedbackWords((prev) => ({ ...prev, [memberId]: val }));
  };

  const submitFeedback = async (memberId: string) => {
    const word = feedbackWords[memberId]?.trim();
    if (!word) return;

    setSubmittingFor(memberId);
    setFeedbackMessages((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });

    try {
      const res = await fetch(`/api/teams/${teamId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          word,
          voterId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedbackMessages((prev) => ({
          ...prev,
          [memberId]: { type: "error", text: data.error },
        }));
        return;
      }

      setFeedbackMessages((prev) => ({
        ...prev,
        [memberId]: {
          type: "success",
          text: data.updated ? "Updated! ✏️" : "Sent! 🎉",
        },
      }));
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      setTimeout(() => {
        setFeedbackMessages((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }, 2000);
      fetchTeam();
    } catch {
      setFeedbackMessages((prev) => ({
        ...prev,
        [memberId]: {
          type: "error",
          text: "Something went wrong.",
        },
      }));
    } finally {
      setSubmittingFor(null);
    }
  };

  // Share the PUBLIC link (without admin token)
  const copyPublicLink = async () => {
    try {
      const publicUrl = `${window.location.origin}/team/${teamId}`;
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  // Fetch QR code
  const fetchQrCode = useCallback(async () => {
    if (qrData) return;
    setLoadingQr(true);
    try {
      const res = await fetch(
        `/api/teams/${teamId}/qr?origin=${encodeURIComponent(window.location.origin)}`
      );
      const data = await res.json();
      setQrData(data.qr);
      setQrUrl(data.url);
    } catch {
      // ignore
    } finally {
      setLoadingQr(false);
    }
  }, [teamId, qrData]);

  // Auto-load QR for admin view
  useEffect(() => {
    if (team?.isAdmin) {
      fetchQrCode();
    }
  }, [team?.isAdmin, fetchQrCode]);

  // Show QR modal (for non-admin)
  const openQrCode = () => {
    setShowQr(true);
    fetchQrCode();
  };

  const revealMember = (memberId: string) => {
    setRevealedMembers((prev) => new Set(prev).add(memberId));
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const revealAll = () => {
    if (!team) return;
    const allIds = new Set(team.members.map((m) => m.id));
    setRevealedMembers(allIds);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-float mb-4">✨</div>
          <p className="text-text-muted animate-pulse-soft">
            Loading your team...
          </p>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card rounded-2xl p-12">
          <div className="text-4xl mb-4">😢</div>
          <h2 className="text-2xl font-bold mb-2">Team not found</h2>
          <p className="text-text-muted mb-6">
            This team doesn&apos;t exist or the link is invalid.
          </p>
          <a
            href="/"
            className="inline-block py-2 px-6 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-all"
          >
            ← Go Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-200/20 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-20 right-10 w-96 h-96 bg-pink-200/15 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 80 }).map((_, i) => {
            const delay = Math.random() * 0.4;
            const duration = 0.8 + Math.random() * 0.6;
            return (
              <div
                key={i}
                className="absolute animate-confetti"
                style={
                  {
                    left: `${Math.random() * 100}%`,
                    top: `-5%`,
                    animationDelay: `${delay}s`,
                    "--fall-duration": `${duration}s`,
                    fontSize: `${18 + Math.random() * 18}px`,
                  } as React.CSSProperties
                }
              >
                {
                  [
                    "🎉",
                    "⭐",
                    "💜",
                    "✨",
                    "🌟",
                    "💫",
                    "🎊",
                    "💖",
                    "🥳",
                    "👏",
                    "🙌",
                    "🌈",
                  ][i % 12]
                }
              </div>
            );
          })}
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 border-b border-card-border/50 bg-white/60 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold gradient-text">
            kudoly
          </a>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20">
                👑 Admin
              </span>
            )}
            {!isAdmin && (
              <button
                onClick={openQrCode}
                className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border hover:bg-accent/5 transition-all active:scale-95"
              >
                📱 QR Code
              </button>
            )}
            <button
              onClick={copyPublicLink}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-card-border hover:bg-accent/5 transition-all active:scale-95"
            >
              {copied ? "✅ Copied!" : "📋 Share Link"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {/* Team Header */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">{team.name}</h1>
          <p className="text-text-muted">
            {team.members.length} member{team.members.length !== 1 && "s"} •{" "}
            {isAdmin
              ? "You are the admin — manage members & share the feedback link"
              : "Share positive feedback anonymously"}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left sidebar — Admin: add members + QR code */}
          {isAdmin && (
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card rounded-2xl p-6 animate-slide-up">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="text-lg">👥</span> Add Team Member
                </h3>
                <form onSubmit={addMember} className="space-y-3">
                  <input
                    type="text"
                    value={newMember}
                    onChange={(e) => setNewMember(e.target.value)}
                    placeholder="Member name..."
                    className="w-full px-3 py-2.5 rounded-xl border border-card-border bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                    maxLength={30}
                  />
                  {memberError && (
                    <p className="text-error text-xs animate-scale-in">
                      {memberError}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={addingMember || !newMember.trim()}
                    className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {addingMember ? "Adding..." : "Add Member"}
                  </button>
                </form>
              </div>

              {/* QR Code inline for admin */}
              <div className="glass-card rounded-2xl p-6 animate-slide-up stagger-2 text-center">
                <h3 className="font-semibold mb-3 flex items-center justify-center gap-2">
                  <span className="text-lg">📱</span> Feedback QR Code
                </h3>
                <p className="text-text-muted text-xs mb-4">
                  Share this QR code with your team so they can scan and give
                  anonymous feedback.
                </p>
                {loadingQr ? (
                  <div className="w-[200px] h-[200px] mx-auto flex items-center justify-center">
                    <p className="text-text-muted text-sm animate-pulse-soft">
                      Loading...
                    </p>
                  </div>
                ) : qrData ? (
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrData}
                      alt="QR Code for feedback link"
                      className="w-[200px] h-[200px] mx-auto rounded-xl"
                    />
                    <p className="text-xs text-text-muted mt-3 break-all">
                      {qrUrl}
                    </p>
                  </div>
                ) : (
                  <p className="text-text-muted text-sm">
                    QR code will appear here
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Kudos Board */}
          <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <span>🌟</span> Team Kudos Board
              </h3>
              {isAdmin && team.members.length > 0 && (
                <button
                  onClick={revealAll}
                  disabled={
                    revealedMembers.size === team.members.length
                  }
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-md hover:shadow-lg"
                >
                  🎉 Reveal All
                </button>
              )}
            </div>
            {!isAdmin && (
              <p className="text-text-muted text-sm mb-6">
                Type one positive word for each team member. You can update your
                word anytime.
              </p>
            )}
            {team.members.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center animate-fade-in">
                <div className="text-5xl mb-4">👋</div>
                <h4 className="text-xl font-semibold mb-2">No members yet</h4>
                <p className="text-text-muted">
                  {isAdmin
                    ? "Add your first team member to get started!"
                    : "The admin hasn't added any members yet. Check back soon!"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {team.members.map((member, memberIdx) => {
                  const hasVoted = !!member.myVote;
                  const currentWord = feedbackWords[member.id] || "";
                  const msg = feedbackMessages[member.id];
                  const isSubmitting = submittingFor === member.id;
                  const isRevealed = revealedMembers.has(member.id);
                  const hasFeedback = member.feedback.length > 0;
                  const totalVotes = member.feedback.reduce(
                    (sum, fb) => sum + fb.count,
                    0
                  );

                  return (
                    <div
                      key={member.id}
                      className={`glass-card rounded-2xl p-6 animate-slide-up transition-all ${
                        isRevealed
                          ? "animate-reveal-glow"
                          : "hover:shadow-lg hover:shadow-accent/5"
                      }`}
                      style={{ animationDelay: `${memberIdx * 0.1}s` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div
                          className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient(
                            member.name
                          )} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-md`}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-lg">
                              {member.name}
                            </h4>
                            {/* Reveal button for admin */}
                            {isAdmin && !isRevealed && hasFeedback && (
                              <button
                                onClick={() => revealMember(member.id)}
                                className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-accent to-pink-400 text-white hover:from-accent/90 hover:to-pink-500 transition-all active:scale-95 shadow-md hover:shadow-lg group"
                              >
                                <span className="group-hover:hidden">
                                  🎁 Reveal ({totalVotes}{" "}
                                  {totalVotes === 1 ? "word" : "words"})
                                </span>
                                <span className="hidden group-hover:inline">
                                  ✨ Click to reveal!
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Admin view: hidden or revealed feedback */}
                          {isAdmin ? (
                            !hasFeedback ? (
                              <p className="text-text-muted text-sm">
                                No feedback yet
                              </p>
                            ) : !isRevealed ? (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {member.feedback.map((_, i) => (
                                  <span
                                    key={i}
                                    className="inline-block px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-400 select-none"
                                  >
                                    ● ● ● ● ●
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="relative">
                                {/* Sparkle decorations */}
                                <div className="absolute -top-2 -right-2 text-lg animate-sparkle">
                                  ✨
                                </div>
                                <div
                                  className="absolute -top-1 left-1/4 text-sm animate-sparkle"
                                  style={{ animationDelay: "0.2s" }}
                                >
                                  🌟
                                </div>
                                <div
                                  className="absolute -bottom-1 right-1/4 text-sm animate-sparkle"
                                  style={{ animationDelay: "0.4s" }}
                                >
                                  💫
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {member.feedback.map((fb, i) => (
                                    <span
                                      key={fb.word}
                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium animate-reveal-bounce ${getTagColor(
                                        i
                                      )}`}
                                      style={{
                                        animationDelay: `${i * 0.12}s`,
                                        opacity: 0,
                                      }}
                                    >
                                      {fb.word}
                                      {fb.count > 1 && (
                                        <span className="text-xs opacity-70 ml-0.5">
                                          ×{fb.count}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )
                          ) : (
                            <>
                              {/* Non-admin: always show feedback tags */}
                              {member.feedback.length === 0 ? (
                                <p className="text-text-muted text-sm">
                                  No feedback yet — be the first! ✨
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {member.feedback.map((fb, i) => (
                                    <span
                                      key={fb.word}
                                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-transform hover:scale-105 ${getTagColor(
                                        i
                                      )}`}
                                    >
                                      {fb.word}
                                      {fb.count > 1 && (
                                        <span className="text-xs opacity-70 ml-0.5">
                                          ×{fb.count}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}

                          {/* Always-visible feedback input for non-admin */}
                          {!isAdmin && (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                submitFeedback(member.id);
                              }}
                              className="mt-3"
                            >
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={currentWord}
                                  onChange={(e) =>
                                    updateFeedbackWord(
                                      member.id,
                                      e.target.value
                                    )
                                  }
                                  placeholder={
                                    hasVoted
                                      ? `Your word: "${member.myVote}" — type to change`
                                      : "One positive word..."
                                  }
                                  className="flex-1 px-3 py-2 rounded-lg border border-card-border bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
                                  maxLength={30}
                                />
                                <button
                                  type="submit"
                                  disabled={
                                    isSubmitting || !currentWord.trim()
                                  }
                                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                >
                                  {isSubmitting
                                    ? "..."
                                    : hasVoted
                                    ? "Update"
                                    : "Send ✨"}
                                </button>
                              </div>
                              {msg && (
                                <div
                                  className={`text-xs p-2 rounded-lg mt-2 animate-scale-in ${
                                    msg.type === "success"
                                      ? "bg-green-50 text-green-700 border border-green-200"
                                      : "bg-red-50 text-red-700 border border-red-200"
                                  }`}
                                >
                                  {msg.text}
                                </div>
                              )}
                            </form>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 text-center py-6 text-sm text-text-muted">
        Made with 💜 to spread positivity
      </footer>

      {/* QR Code Modal */}
      {showQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="glass-card rounded-2xl p-8 max-w-sm w-full text-center animate-scale-in shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-2">Scan to give feedback</h3>
            <p className="text-text-muted text-sm mb-6">
              Team members can scan this QR code on their phone to share
              anonymous positive feedback.
            </p>
            {loadingQr ? (
              <div className="w-[280px] h-[280px] mx-auto flex items-center justify-center">
                <p className="text-text-muted animate-pulse-soft">
                  Generating QR code...
                </p>
              </div>
            ) : qrData ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrData}
                  alt="QR Code for feedback link"
                  className="w-[280px] h-[280px] mx-auto rounded-xl"
                />
                <p className="text-xs text-text-muted mt-4 break-all">
                  {qrUrl}
                </p>
              </div>
            ) : (
              <p className="text-error text-sm">Failed to generate QR code</p>
            )}
            <button
              onClick={() => setShowQr(false)}
              className="mt-6 px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-all active:scale-[0.98]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
