import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Eye, EyeOff, CheckCircle2, MessageCircle } from 'lucide-react';

export const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState('');
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
                await signup(username, password);
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
        <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 font-sans">
            <div className="mb-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-[#0064FF] to-[#00B2FF] rounded-3xl flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
                    <MessageCircle size={48} className="text-white fill-white" />
                </div>
                <h1 className="text-4xl font-extrabold text-[#050505] tracking-tight">LinkUp</h1>
                <p className="text-gray-500 font-medium mt-2">Nơi mọi cuộc trò chuyện bắt đầu</p>
            </div>

            <div className="max-w-[400px] w-full bg-white rounded-2xl shadow-[0_12px_28px_0_rgba(0,0,0,0.2),0_2px_4px_0_rgba(0,0,0,0.1)] overflow-hidden border border-white">
                <div className="p-6 text-center border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">
                        {isLogin ? 'Chào mừng bạn quay lại' : 'Tạo tài khoản mới'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        {isLogin ? 'Đăng nhập để bắt đầu kết nối' : 'Kết nối với bạn bè và AI'}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {(localError || serverError) && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100 flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />
                            <span>{localError || serverError}</span>
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl text-xs font-semibold border border-emerald-100 flex items-center space-x-2">
                            <CheckCircle2 size={14} className="flex-shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0084FF] focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                placeholder="Tên người dùng hoặc email"
                                required
                            />
                        </div>
                        
                        <div className="relative group">
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#0084FF] focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-800 placeholder:text-gray-400"
                                placeholder="Mật khẩu"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="pt-2">
                        <button 
                            type="submit"
                            disabled={localLoading}
                            className="w-full bg-[#0084FF] text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-[#0073E6] transition-all flex items-center justify-center space-x-2 active:scale-[0.98] disabled:opacity-70"
                        >
                            <span>{localLoading ? 'ĐANG XỬ LÝ...' : (isLogin ? 'Đăng nhập' : 'Tạo tài khoản')}</span>
                        </button>
                    </div>

                    <div className="text-center pt-2">
                        <button 
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setLocalError('');
                                setSuccessMsg('');
                            }}
                            className="text-[14px] text-[#0084FF] font-semibold hover:underline"
                        >
                            {isLogin ? 'Bạn chưa có tài khoản?' : 'Bạn đã có tài khoản rồi?'}
                        </button>
                    </div>
                </form>
            </div>
            
            <div className="mt-8 text-gray-500 text-sm font-medium">
                © 2024 Messenger AI Pro
            </div>
        </div>
    );
};
