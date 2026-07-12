import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, RotateCcw, Home, Trophy } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { sounds, haptic } from "@/lib/sounds";

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function calcWinner(cells) {
  for (const line of WIN_LINES) {
    const [a,b,c] = line;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return { winner: cells[a], line };
    }
  }
  if (cells.every(Boolean)) return { winner: "DRAW", line: [] };
  return null;
}

function Confetti() {
  const colors = ["#FFB4A2", "#B7E4C7", "#C8B6FF", "#A0C4FF", "#FFD6A5"];
  const bits = Array.from({ length: 24 }).map((_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    color: colors[i % colors.length],
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti"
          style={{
            left: `${b.left}%`,
            top: "-20px",
            background: b.color,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function Game() {
  const nav = useNavigate();
  const { user } = useAuth();

  const setup = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("ttt_match_setup")); }
    catch { return null; }
  }, []);

  useEffect(() => {
    if (!setup) nav("/play/setup");
  }, [setup, nav]);

  const [cells, setCells] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [session, setSession] = useState({ X: 0, O: 0, DRAW: 0 });
  const [result, setResult] = useState(null); // { winner, line }
  const [savedThisRound, setSavedThisRound] = useState(false);
  const [pendingMatchPayload, setPendingMatchPayload] = useState(null);
  const startTsRef = useRef(Date.now());
  const movesRef = useRef(0);

  useEffect(() => {
    if (!pendingMatchPayload || !user || user === false || savedThisRound) return;

    const payload = pendingMatchPayload;
    setPendingMatchPayload(null);

    api.post("/matches", payload)
      .then(() => setSavedThisRound(true))
      .catch((error) => {
        console.error("Failed to save match history", error);
        setPendingMatchPayload(payload);
      });
  }, [pendingMatchPayload, user, savedThisRound]);

  if (!setup) return null;
  const players = { X: setup.x, O: setup.o };
  const isGuest = setup.guest || user === false || user === null;

  const place = (i) => {
    if (cells[i] || result) return;
    const next = cells.slice();
    next[i] = turn;
    setCells(next);
    movesRef.current += 1;
    sounds.place(turn); haptic(8);
    const r = calcWinner(next);
    if (r) {
      setResult(r);
      if (r.winner === "DRAW") {
        sounds.draw();
        setSession((s) => ({ ...s, DRAW: s.DRAW + 1 }));
      } else {
        setTimeout(() => sounds.win(), 100);
        haptic([10, 40, 20]);
        setSession((s) => ({ ...s, [r.winner]: s[r.winner] + 1 }));
      }
      if (!isGuest && user) {
        const duration = Math.max(1, Math.round((Date.now() - startTsRef.current) / 1000));
        setPendingMatchPayload({
          player_x_name: players.X.name,
          player_x_avatar: players.X.avatar,
          player_o_name: players.O.name,
          player_o_avatar: players.O.avatar,
          winner: r.winner,
          moves: movesRef.current,
          duration_seconds: duration,
        });
      }
    } else {
      setTurn(turn === "X" ? "O" : "X");
    }
  };

  const rematch = () => {
    sounds.tap(); haptic();
    setCells(Array(9).fill(null));
    // Loser goes first next round; on draw, alternate starter
    const nextStarter = result?.winner === "DRAW" ? (turn === "X" ? "O" : "X") : (result?.winner === "X" ? "O" : "X");
    setTurn(nextStarter || "X");
    setResult(null);
    setSavedThisRound(false);
    setPendingMatchPayload(null);
    startTsRef.current = Date.now();
    movesRef.current = 0;
  };

  const current = players[turn];

  return (
    <div className="px-5 pt-4 pb-24 slide-up relative">
      <div className="flex items-center justify-between">
        <Link to="/play/setup" className="inline-flex items-center text-sm text-[#6C7278] font-semibold" data-testid="game-back-btn">
          <ArrowLeft size={16} className="mr-1" /> Setup
        </Link>
        <div className="text-xs uppercase tracking-[0.18em] font-bold text-[#6C7278]">
          {isGuest ? "Guest match" : "Saved match"}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className={`rounded-2xl p-3 glass ${turn === "X" && !result ? "ring-2 ring-[#FFB4A2]" : ""}`} data-testid="scoreboard-x">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[#FFE8DE] flex items-center justify-center text-lg">{players.X.avatar}</div>
            <div className="min-w-0">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#6C7278]">Player X</div>
              <div className="text-sm font-semibold truncate">{players.X.name}</div>
            </div>
          </div>
          <div className="font-display text-3xl font-black mt-2">{session.X}</div>
        </div>
        <div className="rounded-2xl p-3 glass flex flex-col items-center justify-center">
          <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#6C7278]">Draws</div>
          <div className="font-display text-3xl font-black">{session.DRAW}</div>
        </div>
        <div className={`rounded-2xl p-3 glass ${turn === "O" && !result ? "ring-2 ring-[#B7E4C7]" : ""}`} data-testid="scoreboard-o">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-[#D9F3E1] flex items-center justify-center text-lg">{players.O.avatar}</div>
            <div className="min-w-0">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#6C7278]">Player O</div>
              <div className="text-sm font-semibold truncate">{players.O.name}</div>
            </div>
          </div>
          <div className="font-display text-3xl font-black mt-2">{session.O}</div>
        </div>
      </div>

      {/* Turn indicator */}
      {!result && (
        <div className="mt-5 flex items-center justify-center gap-2">
          <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
            {current.avatar}
          </div>
          <div className="text-sm font-semibold">
            <span className="text-[#6C7278]">Your turn,</span> {current.name}
          </div>
        </div>
      )}

      {/* Board */}
      <div className="mt-5 rounded-3xl glass p-4">
        <div className="grid grid-cols-3 gap-2.5">
          {cells.map((v, i) => (
            <button
              key={i}
              onClick={() => place(i)}
              className={`game-cell ${result?.line?.includes(i) ? "win" : ""}`}
              data-testid={`cell-${i}`}
              disabled={!!v || !!result}
              aria-label={`cell ${i}`}
            >
              {v && (
                <span className="pop-in">{players[v].avatar}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Result modal */}
      {result && (
        <div className="mt-6 relative rounded-3xl glass-strong p-6 slide-up" data-testid="result-modal">
          {result.winner !== "DRAW" && <Confetti />}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#FFE8DE] flex items-center justify-center text-2xl">
              {result.winner === "DRAW" ? "🤝" : players[result.winner].avatar}
            </div>
            <div>
              <div className="text-[0.7rem] uppercase tracking-[0.18em] font-bold text-[#6C7278]">
                {result.winner === "DRAW" ? "It's a draw" : "Winner"}
              </div>
              <div className="font-display text-2xl font-black">
                {result.winner === "DRAW" ? "Well played, both of you." : `${players[result.winner].name} wins!`}
              </div>
            </div>
          </div>
          {!isGuest && result.winner !== "DRAW" && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#6C7278] font-semibold">
              <Trophy size={12} /> {savedThisRound ? "Saved to your history" : "Saving to your history…"}
            </div>
          )}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={rematch} className="btn-pill btn-primary" data-testid="rematch-btn">
              <RotateCcw size={16} className="mr-1.5" /> Rematch
            </button>
            <button onClick={() => nav("/")} className="btn-pill btn-secondary" data-testid="home-btn">
              <Home size={16} className="mr-1.5" /> Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
