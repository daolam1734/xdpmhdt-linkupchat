import React from 'react';
import { MessageCircle, Bot, Users, Zap, ArrowRight, Heart, Star, Sparkles, Globe } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin }) => {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <MessageCircle size={24} className="text-white fill-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">LinkUp</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-slate-600 font-medium text-sm">
              <a href="#features" className="hover:text-blue-600 transition-colors">Tính năng</a>
              <a href="#about" className="hover:text-blue-600 transition-colors">Về chúng tôi</a>
              <a href="#ai" className="hover:text-blue-600 transition-colors">LinkUp AI</a>
              <button onClick={onLogin} className="px-5 py-2 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-50 transition-all font-semibold">
                Đăng nhập
              </button>
              <button onClick={onStart} className="px-5 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 font-semibold">
                Tham gia ngay
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-6 animate-fade-in">
            <Sparkles size={14} />
            <span>THẾ HỆ MẠNG XÃ HỘI MỚI</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 leading-tight mb-6">
            Kết nối cộng đồng <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Vượt xa giới hạn</span>
          </h1>
          <p className="max-w-2xl mx-auto text-slate-600 text-lg md:text-xl mb-10 leading-relaxed">
            LinkUp không chỉ là một ứng dụng chat. Đây là nơi bạn xây dựng cộng đồng, 
            trò chuyện thời gian thực và trải nghiệm sức mạnh của AI trong mọi cuộc hội thoại.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 font-bold text-lg flex items-center justify-center gap-2 group"
            >
              Bắt đầu miễn phí
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="flex items-center -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center overflow-hidden`}>
                  <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                </div>
              ))}
              <span className="pl-4 text-slate-500 text-sm font-medium">+1,200 người đã tham gia</span>
            </div>
          </div>
          
          {/* Hero Preview */}
          <div className="mt-16 mx-auto max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-white p-2">
            <div className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center relative group overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&q=80&w=2000" 
                  alt="App Interface" 
                  className="w-full h-full object-cover rounded-xl opacity-90 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                <div className="absolute bottom-10 left-10 text-left text-white drop-shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-sm font-semibold">Cửa sổ LinkUp Chat</span>
                  </div>
                  <h3 className="text-2xl font-bold">Giao diện hiện đại & mượt mà</h3>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Gói gọn mọi nhu cầu trong một nền tảng</h2>
            <p className="text-slate-500 max-w-xl mx-auto">Chúng tôi xây dựng các công cụ mạnh mẽ nhất để giúp bạn giao tiếp và làm việc hiệu quả hơn.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ">
            {/* Real-time Chat */}
            <div className="p-8 rounded-3xl bg-blue-50/50 border border-blue-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-100 text-white group-hover:scale-110 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Chat Thời Gian Thực</h3>
              <p className="text-slate-600">Luồng tin nhắn siêu tốc, hỗ trợ file lớn, thu hồi tin nhắn và đồng bộ hóa tức thì trên mọi thiết bị.</p>
            </div>

            {/* AI Assistant */}
            <div className="p-8 rounded-3xl bg-purple-50/50 border border-purple-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-100 text-white group-hover:scale-110 transition-transform">
                <Bot size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Siêu Trí Tuệ AI</h3>
              <p className="text-slate-600">Integrate Google Gemini 1.5 Flash. Tóm tắt cuộc thảo luận, viết lại tin nhắn hoặc giải đáp mọi thắc mắc ngay trong app.</p>
            </div>

            {/* Community */}
            <div className="p-8 rounded-3xl bg-indigo-50/50 border border-indigo-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-100 text-white group-hover:scale-110 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Nhóm & Cộng Đồng</h3>
              <p className="text-slate-600">Tạo không gian riêng cho gia đình, bạn bè hoặc team công việc với quyền quản trị nâng cao.</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Special Feature */}
      <section id="ai" className="py-24 bg-slate-900 relative overflow-hidden">
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-full bg-purple-600/10 blur-[120px] rounded-full"></div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 order-2 md:order-1">
             <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-4 mb-6 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white italic">AI</div>
                  <div>
                    <h4 className="text-white font-bold">LinkUp Assistant</h4>
                    <span className="text-blue-400 text-xs">Đang hoạt động • Gemini 1.5 Flash</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-2xl text-slate-300 text-sm italic">
                    "@ai Bạn có thể tóm tắt lại các ý chính trong buổi họp hôm nay không?"
                  </div>
                  <div className="bg-blue-600/20 p-4 rounded-2xl text-blue-100 text-sm border border-blue-600/30">
                    <p className="font-bold mb-1">LinkUp Assistant:</p>
                    Tất nhiên! Đây là 3 điểm mấu chốt: <br />
                    1. Triển khai Landing page trong tuần này. <br />
                    2. Tối ưu hóa Database MongoDB. <br />
                    3. Mở rộng tính năng LinkUp Memory.
                  </div>
                </div>
             </div>
          </div>
          <div className="flex-1 order-1 md:order-2">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">Trải nghiệm Chat mang hơi thở Tương lai</h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              LinkUp AI được tích hợp trực tiếp để giúp bạn không bao giờ bỏ lỡ thông tin quan trọng. 
              Nó còn hỗ trợ dịch thuật 50+ ngôn ngữ tức thì ngay trong khung chat của bạn.
            </p>
            <ul className="space-y-4 text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center"><Zap size={14} className="text-white" /></div>
                Phản hồi cực nhanh dưới 1.5 giây
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center"><Heart size={14} className="text-white" /></div>
                Cá nhân hóa theo sở thích (LinkUp Memory)
              </li>
              <li className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center"><Globe size={14} className="text-white" /></div>
                Hỗ trợ đa ngôn ngữ không rào cản
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto rounded-[3rem] bg-gradient-to-r from-blue-600 to-indigo-700 p-12 md:p-16 text-center text-white shadow-2xl shadow-blue-300 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 blur-3xl -ml-16 -mt-16"></div>
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 blur-3xl -mr-16 -mb-16"></div>
          
          <h2 className="text-4xl font-bold mb-6">Sẵn sàng để bắt đầu chưa?</h2>
          <p className="text-blue-100 text-lg mb-10 opacity-90">
            Gia nhập LinkUp ngay hôm nay và trải nghiệm cách kết nối hoàn toàn mới. 
            Hoàn toàn miễn phí cho tất cả mọi người.
          </p>
          <button 
            onClick={onStart}
            className="px-10 py-5 bg-white text-blue-600 rounded-2xl hover:bg-slate-50 transition-all font-extrabold text-xl shadow-lg"
          >
            Tạo tài khoản ngay
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8 text-slate-500">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-blue-600" />
            <span className="font-bold text-slate-900">LinkUp</span>
            <span className="text-sm">© 2026. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-blue-600">Điều khoản</a>
            <a href="#" className="hover:text-blue-600">Bảo mật</a>
            <a href="#" className="hover:text-blue-600">Cookie</a>
          </div>
          <div className="flex gap-4">
             {/* Simple social icons placeholders */}
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer"><Users size={16} /></div>
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer"><Zap size={16} /></div>
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all cursor-pointer"><Star size={16} /></div>
          </div>
        </div>
      </footer>
    </div>
  );
};
