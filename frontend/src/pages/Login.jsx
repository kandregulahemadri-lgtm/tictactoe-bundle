import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { sounds, haptic } from "@/lib/sounds";
import { ArrowLeft } from "lucide-react";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    sounds.tap(); haptic();
    try {
      const u = await login(email.trim(), password);
      toast.success(`Welcome back, ${u.name} ${u.avatar}`);
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
      <h1 className="font-display text-4xl font-black mt-5">Welcome back.</h1>
      <p className="text-[#1A1C1E]/70 mt-1.5">Sign in to keep your match history.</p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <input
          type="email"
          className="ios-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="login-email"
        />
        <input
          type="password"
          className="ios-input"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          data-testid="login-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-pill btn-primary w-full disabled:opacity-60"
          data-testid="login-submit"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm text-[#6C7278] mt-6">
        New here?{" "}
        <Link to="/register" className="text-[#1A1C1E] font-semibold underline underline-offset-4" data-testid="link-register">
          Create an account
        </Link>
      </p>
    </div>
  );
}
