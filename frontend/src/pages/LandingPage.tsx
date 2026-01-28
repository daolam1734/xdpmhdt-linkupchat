import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { toast } from 'react-hot-toast';
import {
  MessageCircle,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Zap,
  Users,
  User,
  Mail,
  Lock,
  ArrowRight
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
  const [localLoading, setLocalLoading] = useState(false);

  const { login, signup, error: serverError } = useAuthStore();
  const { setActiveRoom } = useChatStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    
    const cleanUsername = username.trim();
    const cleanPassword = password; // Không trim password để bảo mật ký tự khoảng trắng nếu có

    // Basic Client-side Validation
    if (cleanUsername.length < 3) {
      setLocalError('Tên tài khoản phải có ít nhất 3 ký tự.');
      toast.error('Tên tài khoản quá ngắn');
      return;
    }
    if (cleanPassword.length < 6) {
      setLocalError('Mật khẩu phải có ít nhất 6 ký tự.');
      toast.error('Mật khẩu không đủ mạnh');
      return;
    }
    if (!isLogin && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Email không hợp lệ.');
      toast.error('Vui lòng kiểm tra định dạng email');
      return;
    }

    setLocalLoading(true);

    try {
      if (isLogin) {
        setActiveRoom(null);
        await login(cleanUsername, cleanPassword);
      } else {
        await signup({
          username: cleanUsername,
          password: cleanPassword,
          email: email.trim() || undefined,
          full_name: fullName.trim() || undefined
        });
        
        // Tự động đăng nhập sau khi đăng ký thành công
        setTimeout(async () => {
          try {
            setActiveRoom(null);
            await login(cleanUsername, cleanPassword);
          } catch (loginErr: any) {
            console.error('Auto-login failed:', loginErr);
            setIsLogin(true); // Chuyển về mode login nếu auto-login fail
            setLocalLoading(false);
          }
        }, 500);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.';
      setLocalError(errorMsg);
      toast.error(errorMsg);
      setLocalLoading(false);
    }
  };

  // Reset error when switching between Login and Signup
  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setLocalError('');
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
            <span className="text-xs font-bold uppercase tracking-widest">Hệ thống liên lạc LinkUp</span>
          </div>

          <h1 className="text-5xl font-black leading-tight mb-6">
            Kết nối mượt mà <br />
            <span className="text-blue-200">Trợ lý AI đồng hành.</span>
          </h1>

          <p className="text-lg text-blue-100/80 mb-12 leading-relaxed">
            LinkUp cung cấp giải pháp trò chuyện trực tuyến hiện đại, kết hợp giữa tương tác người-người và trợ lý ảo thông minh để tối ưu hóa trải nghiệm của bạn.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Users className="text-blue-300" size={20} />
              <h4 className="font-bold text-sm">Giao tiếp đa năng</h4>
              <p className="text-xs text-blue-100/60">Phòng chat nhóm và hội thoại cá nhân linh hoạt.</p>
            </div>
            <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Sparkles className="text-yellow-300" size={20} />
              <h4 className="font-bold text-sm">Hỗ trợ từ AI</h4>
              <p className="text-xs text-blue-100/60">Trợ lý LinkUp AI giải đáp và gợi ý thông minh.</p>
            </div>
            <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <Zap className="text-orange-300" size={20} />
              <h4 className="font-bold text-sm">Phản hồi tức thì</h4>
              <p className="text-xs text-blue-100/60">Thông báo thời gian thực giúp bạn không bỏ lỡ tin nhắn.</p>
            </div>
            <div className="flex flex-col space-y-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <ShieldCheck className="text-emerald-300" size={20} />
              <h4 className="font-bold text-sm">Quản trị minh bạch</h4>
              <p className="text-xs text-blue-100/60">Hệ thống báo cáo và bảo vệ quyền lợi người dùng.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Simple Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white sm:bg-slate-50 md:bg-white relative">
        {localLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center shadow-2xl shadow-blue-200 mb-8 animate-bounce">
              <MessageCircle size={40} className="text-white fill-white" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-8">LinkUp</h2>
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            </div>
          </div>
        ) : (
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
                onClick={() => toggleMode(true)}
                className={clsx(
                  "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
                  isLogin ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => toggleMode(false)}
                className={clsx(
                  "flex-1 py-3 text-sm font-bold rounded-xl transition-all",
                  !isLogin ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Đăng ký
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {(localError || serverError) && (
                <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-r-xl text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center">
                    <ShieldCheck size={16} className="mr-2 shrink-0" />
                    <p>{localError || serverError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase ml-1 tracking-wider">Tên tài khoản</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium"
                      placeholder="Nhập username của bạn"
                      required
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase ml-1 tracking-wider">Họ tên</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <Users size={18} />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-500 uppercase ml-1 tracking-wider">Email</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <Mail size={18} />
                        </div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-500 uppercase ml-1 tracking-wider">Mật khẩu</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-900 placeholder:text-slate-300 placeholder:font-medium"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Ghi nhớ đăng nhập</span>
                </label>
                {isLogin && (
                  <button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">Quên mật khẩu?</button>
                )}
              </div>

              <button
                type="submit"
                disabled={localLoading}
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center space-x-2 group"
              >
                <span>{isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản miễn phí'}</span>
                {!localLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
