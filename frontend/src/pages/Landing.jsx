import { Link, useNavigate } from "react-router-dom";
import { Sparkles, LogIn, PlayCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { sounds, haptic } from "@/lib/sounds";

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();

  const playAsGuest = () => {
    sounds.tap(); haptic();
    // Clear any prior guest identity; setup will collect it
    localStorage.removeItem("ttt_guest");
    nav("/play/setup?guest=1");
  };

  return (
    <div className="px-6 pt-4 pb-24 slide-up">
      {/* Hero */}
      <div className="pt-6">
        <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 glass text-xs font-semibold tracking-wide">
          <Sparkles size={14} className="text-[#FFB4A2]" />
          <span className="text-[#1A1C1E]/80">Two friends. One board.</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-black leading-[0.95] mt-5 text-[#1A1C1E]">
          Tap.<br />
          Play.<br />
          <span className="text-[#FFB4A2]">Win together.</span>
        </h1>
        <p className="mt-4 text-[#1A1C1E]/70 leading-relaxed">
          A cozy pass-and-play Tic Tac Toe for you and a friend — with your names, your emoji, and the sound of a good move.
        </p>
      </div>

      {/* Preview card */}
      <div className="mt-8 rounded-3xl glass p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[#FFE8DE] flex items-center justify-center text-lg">🦊</div>
            <div>
              <div className="text-[0.7rem] uppercase tracking-[0.18em] text-[#6C7278] font-bold">Turn</div>
              <div className="text-sm font-semibold">Fox is up</div>
            </div>
          </div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-[#6C7278] font-bold">
            Move 4
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {["🦊","","🐼","","🦊","","","🐼",""].map((v,i) => (
            <div key={i} className="game-cell !text-3xl" style={{ pointerEvents: "none" }}>{v}</div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="mt-8 space-y-3">
        <button
          onClick={playAsGuest}
          className="btn-pill btn-primary w-full"
          data-testid="landing-guest-btn"
        >
          <PlayCircle size={18} className="mr-2" />
          Play as Guest
        </button>
        {user ? (
          <button
            onClick={() => nav("/play/setup")}
            className="btn-pill btn-secondary w-full"
            data-testid="landing-continue-btn"
          >
            Continue as {user.name} {user.avatar}
          </button>
        ) : (
          <Link
            to="/login"
            className="btn-pill btn-secondary w-full"
            data-testid="landing-login-btn"
          >
            <LogIn size={18} className="mr-2" />
            Login / Sign up
          </Link>
        )}
      </div>

      <p className="text-center text-xs text-[#6C7278] mt-6">
        Guest games don't save. Sign in to keep match history & stats.
      </p>
    </div>
  );
}
