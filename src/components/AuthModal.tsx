import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { User } from "firebase/auth";
import {
  loginWithEmail,
  registerWithEmail,
  sendResetPassword,
  googleSignIn,
} from "../services/firebaseAuth";
import { isNativePlatform } from "../services/firebase";
import { AppLogo } from "./AppLogo";
import { useAndroidBackButton } from "../hooks/useAndroidBackButton";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialMode = "login",
  onAuthSuccess,
}) => {
  useAndroidBackButton({ isOpen, onClose, id: "auth_modal" });

  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Status & states
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isNative = isNativePlatform();

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; // 0 to 4
  };

  const strengthScore = getPasswordStrength(password);
  const strengthLabels = ["Sangat Lemah", "Lemah", "Cukup", "Kuat", "Sangat Kuat"];
  const strengthColors = [
    "bg-red-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-emerald-500",
    "bg-blue-600",
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg("Harap masukkan alamat email dan kata sandi Anda.");
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithEmail(email, password);
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setErrorMsg("Harap masukkan nama lengkap Anda.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Harap masukkan alamat email yang valid.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal harus 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok dengan kata sandi.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("Harap setujui Syarat & Ketentuan untuk melanjutkan.");
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithEmail(name, email, password, phone);
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "Pendaftaran gagal. Silakan coba beberapa saat lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Harap masukkan alamat email Anda yang terdaftar.");
      return;
    }

    setLoading(true);
    try {
      await sendResetPassword(email);
      setSuccessMsg(
        "Tautan pemulihan kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam."
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal mengirim email reset. Pastikan email Anda terdaftar.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result?.user) {
        onAuthSuccess(result.user);
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setErrorMsg("Gagal masuk dengan Google. Silakan coba kembali atau gunakan email.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-white dark:bg-[#151c2c] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 transition-all"
      >
        {/* Modal Top Header Banner */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-6 pt-6 pb-5 text-white">
          <button
            type="button"
            id="close-auth-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition focus:outline-none"
            title="Tutup (Lanjutkan Offline)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <AppLogo size={48} rounded="rounded-2xl" />
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-lg font-extrabold tracking-tight">DigiFuel ID</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/40 text-blue-100 border border-white/20">
                  Akun Cloud
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5">
                {mode === "login"
                  ? "Masuk untuk sinkronisasi data & multi-perangkat"
                  : mode === "register"
                  ? "Daftar akun baru untuk simpan riwayat & kendaraan"
                  : "Pemulihan kata sandi akun Anda"}
              </p>
            </div>
          </div>

          {/* Segmented Switcher for Login / Register */}
          {mode !== "forgot" && (
            <div className="mt-5 grid grid-cols-2 p-1 bg-black/20 rounded-xl border border-white/10 text-xs font-semibold">
              <button
                type="button"
                id="tab-login"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  mode === "login"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-blue-100 hover:text-white"
                }`}
              >
                Masuk ke Akun
              </button>
              <button
                type="button"
                id="tab-register"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  mode === "register"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-blue-100 hover:text-white"
                }`}
              >
                Pendaftaran Baru
              </button>
            </div>
          )}
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-4">
          {/* Error Message Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Success Message Banner */}
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* 1. LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Akun
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    id="login-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Lupa Kata Sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    id="login-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi"
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Ingat saya</span>
                </label>
              </div>

              <button
                type="submit"
                id="btn-submit-login"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 leading-relaxed">
                Satu akun untuk semua perangkat — daftar sekali di web, lalu masuk dengan email & sandi yang sama di HP Android mana pun.
              </p>
            </form>
          )}

          {/* 2. REGISTRATION FORM */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    id="register-name-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    id="register-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@gmail.com"
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  No. HP / WhatsApp <span className="text-[10px] text-slate-400 font-normal">(Opsional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    id="register-phone-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      id="register-password-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Konfirmasi Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      id="register-confirm-password-input"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi"
                      className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Kekuatan Sandi:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {strengthLabels[strengthScore]}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          strengthScore >= step ? strengthColors[strengthScore] : "bg-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Terms checkbox */}
              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                  Saya setuju dengan{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">Syarat & Ketentuan</span>{" "}
                  serta kebijakan penyimpanan data kendaraan secara aman.
                </span>
              </label>

              <button
                type="submit"
                id="btn-submit-register"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-60 active:scale-98"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Daftar Akun Sekarang</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* 3. FORGOT PASSWORD FORM */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Masukkan alamat email yang terdaftar. Kami akan mengirimkan instruksi untuk mengatur ulang
                kata sandi Anda.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Akun Anda
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full bg-slate-50 dark:bg-[#101622] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
                >
                  Kembali ke Masuk
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Kirim Tautan Reset</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Divider: atau login dengan */}
          {mode !== "forgot" && !isNative && (
            <>
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="px-2 bg-white dark:bg-[#151c2c] text-slate-400">
                    atau lanjutkan dengan
                  </span>
                </div>
              </div>

              {/* Google 1-Click Sign-In Button */}
              <button
                type="button"
                id="btn-auth-google"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full py-2.5 px-4 bg-white dark:bg-[#111724] hover:bg-slate-50 dark:hover:bg-[#182133] border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl shadow-2xs hover:shadow-xs transition flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-60"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-700 dark:border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {/* Google SVG Logo */}
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Masuk Cepat dengan Google</span>
                  </>
                )}
              </button>

              {/* Guest / Offline Mode */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  id="btn-continue-guest"
                  onClick={onClose}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition underline underline-offset-2"
                >
                  Lanjutkan sebagai Tamu (Data tersimpan di perangkat ini)
                </button>
              </div>
            </>
          )}
          {mode !== "forgot" && isNative && (
            <>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                Di aplikasi Android native, masuk dengan <b>Email & Kata Sandi</b>. Akun yang sama di HP lain akan menampilkan data yang sama dan tersinkron otomatis via Cloud Vault.
              </div>
              <div className="text-center pt-2">
                <button
                  type="button"
                  id="btn-continue-guest"
                  onClick={onClose}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition underline underline-offset-2"
                >
                  Lanjutkan sebagai Tamu (Data tersimpan di perangkat ini)
                </button>
              </div>
            </>
          )}

          {/* Security badge at bottom */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Koneksi aman terenkripsi SSL 256-bit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
