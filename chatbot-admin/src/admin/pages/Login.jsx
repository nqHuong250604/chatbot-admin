import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, ArrowRight, Loader2, RefreshCcw } from "lucide-react";
import { authService } from "../services/authService";
import { useAuth } from "../components/Auth/AuthContext";
import toast from "react-hot-toast";
import logo from "../../assets/logo.svg";

const Login = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.error("Vui lòng nhập email");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.requestOtp(email);
      if (response.ok) {
        toast.success(response.message || "Mã OTP đã được gửi!");
        setStep(2);
        setTimer(60); // 60s resend cooldown
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Không thể gửi OTP. Thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOtp(email, otp);
      if (response.ok) {
        login(response.user, response.access_token);
        toast.success("Đăng nhập thành công!");
        navigate("/admin/dashboard");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Mã OTP không chính xác");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden font-sans text-slate-900">
      {/* Premium Mesh Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-100/50 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100/50 blur-[120px] rounded-full animate-pulse delay-700" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-rose-50/50 blur-[80px] rounded-full animate-pulse delay-1000" />

      {/* Top Left Logo Wrapper */}
      <div className="absolute top-10 left-10 flex items-center gap-4 z-20 animate-in fade-in slide-in-from-left-8 duration-1000 text-left">
        <img
          src={logo}
          alt="logo"
          className="h-20 w-auto object-contain drop-shadow-2xl active:scale-95 transition-transform"
        />
        <div className="flex flex-col">
          <span className="text-slate-900 font-bold tracking-tight text-xl leading-none">
            Trạng Nguyên AI
          </span>
          <span className="text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] mt-1.5 opacity-70">
            Hệ thống Quản trị Dashboard
          </span>
        </div>
      </div>

      <div className="w-full max-w-md p-8 z-10">
        <div className="bg-white/80 backdrop-blur-2xl border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[2.5rem] p-10">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-[2rem] mb-6 border border-blue-100/50">
              <ShieldCheck className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Admin Login</h1>
            <p className="text-slate-500 text-sm font-medium">Chào mừng trở lại với Trạng Nguyên AI</p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Email đăng nhập
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full pl-12 pr-5 py-4.5 bg-slate-50/50 border border-slate-200/60 rounded-[1.5rem] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              {email.trim() && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full group bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] py-5 rounded-[1.5rem] shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70 animate-in fade-in zoom-in duration-300 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Gửi mã xác thực
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              )}
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="text-center space-y-2">
                <p className="text-sm font-medium text-slate-600">
                  Một mã 6 chữ số đã được gửi đến
                </p>
                <p className="inline-flex px-3 py-1 bg-blue-50 text-blue-600 text-[13px] font-bold rounded-lg border border-blue-100">
                  {email}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="w-full tracking-[1em] text-center text-3xl font-black py-5 bg-slate-50/50 border border-slate-200/60 rounded-[1.5rem] text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[11px] py-5 rounded-[1.5rem] shadow-2xl shadow-slate-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Xác nhận & Đăng nhập"}
                </button>

                <div className="text-center">
                  {timer > 0 ? (
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Gửi lại mã sau {timer}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={loading}
                      className="text-xs text-blue-600 hover:text-blue-700 font-black uppercase tracking-widest flex items-center justify-center gap-2 w-full transition-colors cursor-pointer"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Gửi lại OTP ngay
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Thay đổi địa chỉ email?
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-center mt-12 text-slate-300 text-[10px] tracking-[0.2em] uppercase font-black">
          Trạng Nguyên AI Dashboard v2.0
        </p>
      </div>
    </div>
  );
};

export default Login;
