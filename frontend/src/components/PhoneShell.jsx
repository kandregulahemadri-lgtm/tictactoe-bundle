import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, History, User, Gamepad2 } from "lucide-react";

function StatusBar() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  return (
    <div className="status-bar">
      <span>{hh}:{mm}</span>
      <div className="flex items-center gap-1.5 text-[0.75rem]">
        <span>•••</span>
        <span>◧</span>
        <span>▮▮▮</span>
      </div>
    </div>
  );
}

function BottomNav({ showHistory }) {
  const { pathname } = useLocation();
  const link = (to, label, Icon, testid) => (
    <Link
      to={to}
      data-testid={testid}
      className={pathname === to || (to === "/play" && pathname.startsWith("/play")) ? "active" : ""}
    >
      <Icon size={16} className="mr-1.5" />
      {label}
    </Link>
  );
  return (
    <nav className="bottom-nav" data-testid="bottom-nav">
      {link("/", "Home", Home, "nav-home")}
      {link("/play", "Play", Gamepad2, "nav-play")}
      {showHistory && link("/history", "History", History, "nav-history")}
      {link("/profile", "Profile", User, "nav-profile")}
    </nav>
  );
}

export default function PhoneShell({ children, showNav = true, showHistory = false }) {
  return (
    <>
      <div className="ambient-bg">
        <div className="blob-mint" />
      </div>
      <div className="phone-shell" data-testid="phone-shell">
        <StatusBar />
        <div className="phone-inner">{children}</div>
        {showNav && <BottomNav showHistory={showHistory} />}
      </div>
    </>
  );
}
