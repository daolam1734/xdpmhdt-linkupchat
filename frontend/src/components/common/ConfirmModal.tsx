import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = 'Xác nhận', 
    cancelText = 'Hủy',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-amber-500 hover:bg-amber-600',
        info: 'bg-blue-600 hover:bg-blue-700'
    };

    const iconColors = {
        danger: 'text-red-600 bg-red-50',
        warning: 'text-amber-500 bg-amber-50',
        info: 'text-blue-600 bg-blue-50'
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className={`p-3 rounded-full ${iconColors[type]}`}>
                            <AlertCircle size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    </div>
                    
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex space-x-3">
                        <button 
                            onClick={onCancel}
                            className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button 
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }}
                            className={`flex-1 py-2.5 px-4 ${colors[type]} text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-200`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
