import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import PhoneShell from "@/components/PhoneShell";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Setup from "@/pages/Setup";
import Game from "@/pages/Game";
import History from "@/pages/History";
import Profile from "@/pages/Profile";

function Shell({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const authRoutes = ["/login", "/register"];
  const showNav = !authRoutes.includes(pathname);
  const isLoggedIn = !!user && user !== false;
  return (
    <PhoneShell showNav={showNav} showHistory={isLoggedIn}>
      {children}
    </PhoneShell>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Shell><Landing /></Shell>} />
      <Route path="/login" element={<Shell><Login /></Shell>} />
      <Route path="/register" element={<Shell><Register /></Shell>} />
      <Route path="/play" element={<Shell><Setup /></Shell>} />
      <Route path="/play/setup" element={<Shell><Setup /></Shell>} />
      <Route path="/play/game" element={<Shell><Game /></Shell>} />
      <Route path="/history" element={<Shell><History /></Shell>} />
      <Route path="/profile" element={<Shell><Profile /></Shell>} />
      <Route path="*" element={<Shell><Landing /></Shell>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-center" richColors closeButton />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
