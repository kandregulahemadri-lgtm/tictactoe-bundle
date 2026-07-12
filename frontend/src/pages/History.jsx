import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, Trophy, Users } from "lucide-react";

export default function History() {
  const { user, authAttempted } = useAuth();
  const [matches, setMatches] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      return;
    }

    let isMounted = true;
    const loadMatches = async () => {
      try {
        const response = await api.get("/matches");
        if (isMounted) {
          setMatches(response.data || []);
          setLoadError(false);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(true);
          setMatches([]);
        }
      }
    };

    loadMatches();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (user === null && !authAttempted) return null;
  if (user === false) {
    return (
      <div className="px-6 pt-6 pb-24 slide-up">
        <h1 className="font-display text-4xl font-black">History</h1>
        <p className="text-[#1A1C1E]/70 mt-2">Sign in to keep a record of your matches.</p>
        <Link to="/login" className="btn-pill btn-primary w-full mt-6" data-testid="history-login-cta">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="px-6 pt-4 pb-24 slide-up">
      <Link to="/" className="inline-flex items-center text-sm text-[#6C7278] font-semibold" data-testid="back-btn">
        <ArrowLeft size={16} className="mr-1" /> Back
      </Link>
      <h1 className="font-display text-4xl font-black mt-5">Match history</h1>
      <p className="text-[#1A1C1E]/70 mt-1.5">
        {loadError ? "We couldn’t load your history right now." : `Your last ${matches?.length ?? 0} game${(matches?.length ?? 0) === 1 ? "" : "s"}.`}
      </p>

      <div className="mt-6 space-y-2.5" data-testid="history-list">
        {matches === null && (
          <div className="text-sm text-[#6C7278]">Loading…</div>
        )}
        {matches !== null && matches.length === 0 && !loadError && (
          <div className="rounded-2xl glass p-6 text-center">
            <Users className="mx-auto text-[#6C7278]" size={20} />
            <div className="mt-2 text-sm text-[#6C7278]">No matches yet. Play one!</div>
            <Link to="/play/setup" className="btn-pill btn-primary mt-4 inline-flex" data-testid="history-empty-play">Start a match</Link>
          </div>
        )}
        {matches?.map((m) => {
          const date = new Date(m.created_at);
          const isDraw = m.winner === "DRAW";
          const winnerName = isDraw ? "Draw" : m.winner === "X" ? m.player_x_name : m.player_o_name;
          const winnerAvatar = isDraw ? "🤝" : m.winner === "X" ? m.player_x_avatar : m.player_o_avatar;
          return (
            <div key={m.id} className="rounded-2xl bg-white/80 border border-white p-4 flex items-center gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
              <div className="h-11 w-11 rounded-full bg-[#FFE8DE] flex items-center justify-center text-xl shrink-0">
                {winnerAvatar}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {m.player_x_avatar} {m.player_x_name}  <span className="text-[#6C7278]">vs</span>  {m.player_o_avatar} {m.player_o_name}
                </div>
                <div className="text-xs text-[#6C7278] mt-0.5">
                  {isDraw ? "Draw" : `${winnerName} won`} · {m.moves} moves · {m.duration_seconds}s
                </div>
              </div>
              <div className="text-xs text-[#6C7278] shrink-0 text-right">
                {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                <div className="text-[10px]">{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </div>
              {!isDraw && <Trophy size={14} className="text-[#FFB4A2]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
