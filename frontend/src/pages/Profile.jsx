import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AVATARS } from "@/lib/avatars";
import { toast } from "sonner";
import { LogOut, Save, ArrowLeft } from "lucide-react";
import { sounds, haptic } from "@/lib/sounds";

export default function Profile() {
  const nav = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const [stats, setStats] = useState(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🦊");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatar);
      api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
    }
  }, [user]);

  if (user === null) return null;
  if (user === false) {
    return (
      <div className="px-6 pt-6 pb-24 slide-up">
        <h1 className="font-display text-4xl font-black">Profile</h1>
        <p className="text-[#1A1C1E]/70 mt-2">Sign in to track your stats and personalize your player.</p>
        <div className="mt-6 space-y-3">
          <Link to="/login" className="btn-pill btn-primary w-full" data-testid="profile-login-btn">Sign in</Link>
          <Link to="/register" className="btn-pill btn-secondary w-full" data-testid="profile-register-btn">Create account</Link>
        </div>
      </div>
    );
  }

  const save = async () => {
    setSaving(true);
    sounds.tap(); haptic();
    try {
      await updateProfile({ name: name.trim(), avatar });
      toast.success("Profile updated");
    } catch (_) {
      toast.error("Couldn't update profile");
    } finally {
      setSaving(false);
    }
  };

  const doLogout = async () => {
    await logout();
    toast("Signed out");
    nav("/");
  };

  return (
    <div className="px-6 pt-4 pb-24 slide-up">
      <Link to="/" className="inline-flex items-center text-sm text-[#6C7278] font-semibold" data-testid="back-btn">
        <ArrowLeft size={16} className="mr-1" /> Back
      </Link>
      <div className="mt-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-[#FFE8DE] flex items-center justify-center text-3xl">
          {avatar}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-black truncate">{user.name}</h1>
          <div className="text-sm text-[#6C7278] truncate">{user.email}</div>
        </div>
      </div>

      {/* Stats bento */}
      <div className="mt-6 grid grid-cols-4 gap-2.5">
        <div className="col-span-2 rounded-2xl glass p-4">
          <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#6C7278]">Total games</div>
          <div className="font-display text-4xl font-black mt-1">{stats?.total ?? "—"}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#FFE8DE" }}>
          <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#1A1C1E]/70">X wins</div>
          <div className="font-display text-3xl font-black mt-1">{stats?.x_wins ?? "—"}</div>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#D9F3E1" }}>
          <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#1A1C1E]/70">O wins</div>
          <div className="font-display text-3xl font-black mt-1">{stats?.o_wins ?? "—"}</div>
        </div>
        <div className="col-span-2 rounded-2xl glass p-4">
          <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#6C7278]">Draws</div>
          <div className="font-display text-3xl font-black mt-1">{stats?.draws ?? "—"}</div>
        </div>
        <div className="col-span-2 rounded-2xl p-4" style={{ background: "#E7DEFF" }}>
          <div className="text-[0.65rem] uppercase tracking-[0.18em] font-bold text-[#1A1C1E]/70">Decisive rate</div>
          <div className="font-display text-3xl font-black mt-1">{stats?.win_rate ?? "—"}%</div>
        </div>
      </div>

      {/* Edit */}
      <div className="mt-6 rounded-3xl glass p-5">
        <div className="text-xs uppercase tracking-[0.18em] font-bold text-[#6C7278]">Edit profile</div>
        <input
          className="ios-input mt-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          data-testid="profile-name-input"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => { setAvatar(a); sounds.tap(); haptic(6); }}
              className={`emoji-chip ${avatar === a ? "selected" : ""}`}
              data-testid={`profile-avatar-${a}`}
              aria-label={`avatar ${a}`}
            >
              {a}
            </button>
          ))}
        </div>
        <button onClick={save} disabled={saving} className="btn-pill btn-primary w-full mt-5 disabled:opacity-60" data-testid="profile-save-btn">
          <Save size={16} className="mr-1.5" /> {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <button onClick={doLogout} className="btn-pill btn-ghost w-full mt-4 text-[#c1442e]" data-testid="profile-logout-btn">
        <LogOut size={16} className="mr-1.5" /> Sign out
      </button>
    </div>
  );
}
