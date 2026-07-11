import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { AVATARS } from "@/lib/avatars";
import { sounds, haptic } from "@/lib/sounds";
import { ArrowLeft } from "lucide-react";

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("🦊");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    sounds.tap(); haptic();
    try {
      const u = await register({ name: name.trim(), email: email.trim(), password, avatar });
      toast.success(`Hi ${u.name} ${u.avatar} — you're in!`);
      nav("/play/setup");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 pt-4 pb-24 slide-up">
      <Link to="/" className="inline-flex items-center text-sm text-[#6C7278] font-semibold" data-testid="back-btn">
        <ArrowLeft size={16} className="mr-1" /> Back
      </Link>
      <h1 className="font-display text-4xl font-black mt-5">Create your account.</h1>
      <p className="text-[#1A1C1E]/70 mt-1.5">Pick your emoji — it's your player mark.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <input className="ios-input" placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} required data-testid="register-name" />
        <input type="email" className="ios-input" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} required data-testid="register-email" />
        <input type="password" className="ios-input" placeholder="Password (6+ chars)" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={6} data-testid="register-password" />

        <div>
          <div className="text-xs uppercase tracking-[0.18em] font-bold text-[#6C7278] mb-2">Your emoji</div>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => { setAvatar(a); sounds.tap(); haptic(6); }}
                className={`emoji-chip ${avatar === a ? "selected" : ""}`}
                data-testid={`register-avatar-${a}`}
                aria-label={`avatar ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-pill btn-primary w-full disabled:opacity-60" data-testid="register-submit">
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6C7278] mt-6">
        Have an account?{" "}
        <Link to="/login" className="text-[#1A1C1E] font-semibold underline underline-offset-4" data-testid="link-login">Sign in</Link>
      </p>
    </div>
  );
}
