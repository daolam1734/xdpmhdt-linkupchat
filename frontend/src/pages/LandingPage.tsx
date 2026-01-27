import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  MessageCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  Smartphone,
  Globe,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  Star
} from 'lucide-react';
import { clsx } from 'clsx';

export const LandingPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [localLoading, setLocalLoading] = useState(false);

  const { login, signup, error: serverError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMsg('');
    setLocalLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await signup({
          username,
          password,
          email: email || undefined,
          full_name: fullName || undefined
        });
        setSuccessMsg('Đăng ký thành công! Đang đăng nhập...');
        setTimeout(async () => {
          await login(username, password);
        }, 1000);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Left Side: Marketing/Vision */}
      <div className="hidden md:flex flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[10%] left-[10%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-8 inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
            <Sparkles size={16} className="text-yellow-300" />
            <span className="text-xs font-bold uppercase tracking-widest">Nền tảng chat thế hệ mới</span>
          </div>

          <h1 className="text-5xl font-black leading-tight mb-6">
            Kết nối mọi người <br />
            <span className="text-blue-200">với sức mạnh AI.</span>
          </h1>

          <p className="text-lg text-blue-100/80 mb-12 leading-relaxed">
            LinkUp mang đến trải nghiệm nhắn tin bảo mật, tốc độ cao và tích hợp trí tuệ nhân tạo giúp bạn tối ưu hóa công việc.
          </p>

          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <ShieldCheck className="text-blue-300" />
              <h4 className="font-bold text-sm">Bảo mật</h4>
              <p className="text-xs text-blue-100/60">Mã hóa đầu cuối</p>
            </div>
            <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Zap className="text-yellow-300" />
              <h4 className="font-bold text-sm">Tốc độ</h4>
              <p className="text-xs text-blue-100/60">Không độ trễ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Simple Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white sm:bg-slate-50 md:bg-white relative">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="text-center">
            <div className="hidden md:flex justify-center mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-blue-200 transform -rotate-12 transition-transform hover:rotate-0 cursor-pointer">
                <MessageCircle size={36} className="text-white fill-white" />
              </div>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {isLogin ? 'Đăng nhập LinkUp' : 'Đăng ký tài khoản'}
            </h2>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => setIsLogin(true)}
              className={clsx(
                "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
                isLogin ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={clsx(
                "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
                !isLogin ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(localError || serverError) && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center">
                <span className="mr-2"></span>
                {localError || serverError}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase ml-1">Tên tài khoản</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900"
                  placeholder="Username"
                  required
                />
              </div>

              {!isLogin && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">Họ tên</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase ml-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase ml-1">Mật khẩu</label>
                <div className="relative group">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[20px] focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900"
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-2"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={localLoading}
              className="w-full bg-blue-600 text-white font-black py-5 rounded-[22px] shadow-lg hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-70"
            >
              {localLoading ? 'XỬ LÝ...' : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
