import React from 'react';
import { TrendingUp, FileText } from 'lucide-react';
import type { ReportsTabProps } from './types';

export const ReportsTab: React.FC<ReportsTabProps> = ({ stats }) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Báo cáo vi phạm</h5>
                    <div className="text-3xl font-black text-slate-900">{stats.unhandled_reports}</div>
                    <p className={stats.unhandled_reports > 0 ? "text-rose-500 text-xs mt-1 font-bold" : "text-emerald-500 text-xs mt-1 font-bold"}>
                        {stats.unhandled_reports > 0 ? `Cần xử lý gấp` : "An toàn tuyệt đối"}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Người dùng / Tuần</h5>
                    <div className="text-3xl font-black text-slate-900">+{stats.new_users_7d}</div>
                    <p className="text-blue-500 text-xs mt-1 font-bold">Tăng trưởng ổn định</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Trạng thái AI</h5>
                    <div className="text-3xl font-black text-slate-900">Active</div>
                    <p className="text-emerald-500 text-xs mt-1 font-bold">Model: Flash</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h5 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Dung lượng DB</h5>
                    <div className="text-3xl font-black text-slate-900">{stats.db_size_mb} MB</div>
                    <p className="text-slate-400 text-xs mt-1 font-bold">M0 Free Cluster</p>
                </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
                <TrendingUp size={64} className="text-slate-100 mb-6" />
                <h3 className="text-xl font-bold text-slate-800">Trung tâm phân tích dữ liệu</h3>
                <p className="text-slate-500 mt-2 max-w-sm text-center">Các chức năng báo cáo chuyên sâu đang được phát triển và sẽ sớm ra mắt trong bản cập nhật tiếp theo.</p>
                <button className="mt-8 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center space-x-2">
                    <FileText size={18} />
                    <span>Xuất báo cáo PDF</span>
                </button>
            </div>
        </div>
    );
};
