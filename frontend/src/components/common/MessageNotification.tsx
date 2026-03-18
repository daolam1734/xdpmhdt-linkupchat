import React from 'react';
import { toast } from 'react-hot-toast';

interface MessageNotificationProps {
    t: any;
    senderName: string;
    senderAvatar?: string;
    content: string;
    onClick: () => void;
}

export const MessageNotification: React.FC<MessageNotificationProps> = ({ 
    t, 
    senderName, 
    senderAvatar, 
    content, 
    onClick 
}) => {
    return (
        <div
            className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-sm w-full bg-white dark:bg-[#242526] shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-10 border dark:border-[#3a3b3c] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a2b2e] transition-all transform hover:scale-[1.02] z-[9999]`}
            style={{ minHeight: '80px' }}
            onClick={() => {
                onClick();
                toast.dismiss(t.id);
            }}
        >
            <div className="flex-1 w-0 p-3">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <img
                            className="h-10 w-10 rounded-full object-cover border dark:border-gray-700"
                            src={senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=0068ff&color=fff`}
                            alt={senderName}
                        />
                    </div>
                    <div className="ml-3 flex-1 overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                            {senderName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate line-clamp-1">
                            {content}
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex border-l dark:border-[#3a3b3c]">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toast.dismiss(t.id);
                    }}
                    className="w-full border border-transparent rounded-none rounded-r-xl px-3 flex items-center justify-center text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    Đóng
                </button>
            </div>
        </div>
    );
};
