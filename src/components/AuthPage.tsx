import React, { useState } from "react";
import {
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
  UserCheck,
} from "lucide-react";
import { User } from "firebase/auth";
import {
  loginWithEmail,
  registerWithEmail,
  sendResetPassword,
  googleSignIn,
  loginAsGuest,
} from "../services/firebaseAuth";
import { AppLogo } from "./AppLogo";

interface Props {
  onAuthSuccess: (user: User) => void;
}

export const AuthPage: React.FC<Props> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");

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
      setSuccessMsg("Berhasil masuk! Menyiapkan aplikasi...");
      setTimeout(() => {
        onAuthSuccess(user);
      }, 400);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk. Periksa kembali email dan kata sandi Anda.");
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
    if (!email.trim()) {
      setErrorMsg("Harap masukkan alamat email yang valid.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Kata sandi minimal harus 6 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Konfirmasi kata sandi tidak cocok. Harap periksa kembali.");
      return;
    }
    if (!agreeTerms) {
      setErrorMsg("Anda harus menyetujui syarat & ketentuan untuk mendaftar.");
      return;
    }

    setLoading(true);
    try {
      const user = await registerWithEmail(
        name.trim(),
        email.trim(),
        password,
        phone.trim() || undefined
      );
      setSuccessMsg("Akun berhasil dibuat! Mengalihkan ke aplikasi...");
      setTimeout(() => {
        onAuthSuccess(user);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mendaftarkan akun. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const guestUser = loginAsGuest();
      setSuccessMsg("Masuk sebagai Tamu... Mengalihkan ke aplikasi...");
      setTimeout(() => {
        onAuthSuccess(guestUser);
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal masuk mode tamu.");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg("Harap masukkan email Anda untuk menerima instruksi reset kata sandi.");
      return;
    }

    setLoading(true);
    try {
      await sendResetPassword(email);
      setSuccessMsg("Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.");
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal mengirim email reset kata sandi.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setSuccessMsg(`Selamat datang, ${res.user.displayName || "Pengguna"}!`);
        setTimeout(() => {
          onAuthSuccess(res.user);
        }, 400);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Gagal masuk menggunakan Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c1017] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#151c2c] rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden my-4">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 p-7 text-white text-center">
          <div className="mx-auto w-14 h-14 mb-3">
            <AppLogo size={56} rounded="rounded-2xl" />
          </div>

          <h1 className="text-xl font-black tracking-tight">
            {mode === "login"
              ? "Masuk ke Akun Anda"
              : mode === "register"
              ? "Buat Akun Baru"
              : "Pemulihan Kata Sandi"}
          </h1>
          <p className="text-xs text-blue-100/90 mt-1 max-w-xs mx-auto">
            {mode === "login"
              ? "Kelola konsumsi BBM, servis, dan pengeluaran kendaraan secara rapi dan akurat"
              : mode === "register"
              ? "Daftar gratis untuk mulai mencatat dan memantau armada kendaraan Anda"
              : "Masukkan email terdaftar untuk menerima tautan pemulihan kata sandi"}
          </p>

          {/* Mode Switcher Tabs */}
          {mode !== "forgot" && (
            <div className="flex bg-black/20 p-1 rounded-xl mt-5 max-w-xs mx-auto backdrop-blur-xs">
              <button
                type="button"
                id="tab-auth-login"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  mode === "login"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                id="tab-auth-register"
                onClick={() => {
                  setMode("register");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                  mode === "register"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                Pendaftaran
              </button>
            </div>
          )}
        </div>

        {/* Form Container */}
        <div className="p-6 space-y-4">
          {/* Notification Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
              <div className="flex-1 leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Google Sign-in Shortcut (available on login & register) */}
          {mode !== "forgot" && (
            <>
              <button
                type="button"
                id="btn-google-auth-login"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-[#192233] dark:hover:bg-[#202b40] text-slate-800 dark:text-slate-100 text-xs font-bold transition flex items-center justify-center gap-3 shadow-2xs active:scale-98 disabled:opacity-50"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
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
                )}
                <span>
                  {mode === "login" ? "Masuk dengan Google" : "Daftar dengan Google"}
                </span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
                <span className="bg-white dark:bg-[#151c2c] px-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                  atau dengan email
                </span>
                <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              </div>
            </>
          )}

          {/* MODE: LOGIN */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#101622] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kata Sandi
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#101622] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
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
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Ingat saya</span>
                </label>
              </div>

              <button
                type="submit"
                id="btn-submit-login"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Masuk ke Akun</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: REGISTER */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Pratama"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#101622] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#101622] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#101622] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`flex-1 rounded-full transition-all duration-300 ${
                            step <= strengthScore
                              ? strengthColors[strengthScore]
                              : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-[10px] text-right font-medium text-slate-500">
                      Kekuatan: {strengthLabels[strengthScore]}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Konfirmasi Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang kata sandi"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#101622] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 mt-0.5"
                  />
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    Saya menyetujui Ketentuan Layanan &amp; Kebijakan Privasi aplikasi.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                id="btn-submit-register"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Daftar Akun Sekarang</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Masukkan alamat email terdaftar Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#101622] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-forgot"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Kirim Tautan Pemulihan</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition text-center"
              >
                ← Kembali ke Halaman Masuk
              </button>
            </form>
          )}

          {/* Quick Guest Access */}
          {mode !== "forgot" && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                id="btn-guest-mode-access"
                onClick={handleGuestLogin}
                className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/50 dark:bg-[#111724] dark:hover:bg-[#172033] text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-blue-500" />
                <span>Masuk Cepat Mode Tamu (Tanpa Akun)</span>
              </button>
            </div>
          )}

          {/* Footer security guarantee */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Data terlindungi dengan enkripsi Firebase &amp; Google Cloud</span>
          </div>
        </div>
      </div>
    </div>
  );
};
