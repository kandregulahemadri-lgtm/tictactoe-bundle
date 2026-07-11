// Web Audio API-based sound effects. Zero assets.
let ctx = null;
function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone({ freq = 440, duration = 0.12, type = "sine", gain = 0.08, when = 0 }) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sounds = {
  tap() {
    tone({ freq: 620, duration: 0.08, type: "triangle", gain: 0.06 });
  },
  place(player) {
    // X gets a lower ping, O a higher ping
    tone({ freq: player === "X" ? 520 : 720, duration: 0.12, type: "sine", gain: 0.09 });
  },
  win() {
    tone({ freq: 523.25, duration: 0.18, gain: 0.1, when: 0.0 });     // C5
    tone({ freq: 659.25, duration: 0.18, gain: 0.1, when: 0.12 });    // E5
    tone({ freq: 783.99, duration: 0.28, gain: 0.11, when: 0.24 });   // G5
  },
  draw() {
    tone({ freq: 330, duration: 0.16, gain: 0.08 });
    tone({ freq: 262, duration: 0.22, gain: 0.08, when: 0.14 });
  },
};

export function haptic(ms = 12) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(ms); } catch (_) {}
  }
}
