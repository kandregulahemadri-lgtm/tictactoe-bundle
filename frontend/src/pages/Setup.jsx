import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AVATARS } from "@/lib/avatars";
import { useAuth } from "@/context/AuthContext";
import { sounds, haptic } from "@/lib/sounds";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Setup() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const isGuest = params.get("guest") === "1";
  const { user } = useAuth();

  // Player X defaults: signed-in user (if any and not guest flow)
  const defaultX = useMemo(() => {
    if (!isGuest && user) return { name: user.name || "Player 1", avatar: user.avatar || "🦊" };
    return { name: "Player 1", avatar: "🦊" };
  }, [isGuest, user]);

  const [xName, setXName] = useState(defaultX.name);
  const [xAvatar, setXAvatar] = useState(defaultX.avatar);
  const [oName, setOName] = useState("Player 2");
  const [oAvatar, setOAvatar] = useState("🐼");

  const start = () => {
    if (!xName.trim() || !oName.trim()) return;
    if (xAvatar === oAvatar) {
      // Nudge but allow
    }
    sounds.tap(); haptic();
    const payload = {
      x: { name: xName.trim(), avatar: xAvatar },
      o: { name: oName.trim(), avatar: oAvatar },
      guest: isGuest || !user,
    };
    sessionStorage.setItem("ttt_match_setup", JSON.stringify(payload));
    nav("/play/game");
  };

  const PlayerCard = ({ label, name, setName, avatar, setAvatar, color, testPrefix }) => (
    <div className="rounded-3xl glass p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-[0.18em] font-bold text-[#6C7278]">{label}</div>
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center text-2xl"
          style={{ background: color }}
        >
          {avatar}
        </div>
      </div>
      <input
        className="ios-input"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        data-testid={`${testPrefix}-name`}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        {AVATARS.map((a) => (
          <button
            key={a}
            className={`emoji-chip ${avatar === a ? "selected" : ""}`}
            onClick={() => { setAvatar(a); sounds.tap(); haptic(6); }}
            data-testid={`${testPrefix}-avatar-${a}`}
            aria-label={`avatar ${a}`}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="px-6 pt-4 pb-24 slide-up">
      <Link to="/" className="inline-flex items-center text-sm text-[#6C7278] font-semibold" data-testid="back-btn">
        <ArrowLeft size={16} className="mr-1" /> Back
      </Link>
      <h1 className="font-display text-4xl font-black mt-5">Who's playing?</h1>
      <p className="text-[#1A1C1E]/70 mt-1.5">
        Pass the phone. Two players, two emojis.
      </p>

      <div className="mt-6 space-y-4">
        <PlayerCard
          label="Player X — goes first"
          name={xName} setName={setXName}
          avatar={xAvatar} setAvatar={setXAvatar}
          color="#FFE8DE" testPrefix="setup-x"
        />
        <PlayerCard
          label="Player O"
          name={oName} setName={setOName}
          avatar={oAvatar} setAvatar={setOAvatar}
          color="#D9F3E1" testPrefix="setup-o"
        />
      </div>

      <button onClick={start} className="btn-pill btn-primary w-full mt-6" data-testid="setup-start-btn">
        Start match <ArrowRight size={18} className="ml-2" />
      </button>
    </div>
  );
}
