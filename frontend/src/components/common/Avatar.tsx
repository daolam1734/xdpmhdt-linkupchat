import React from 'react';
import { clsx } from 'clsx';

interface AvatarProps {
    name: string;
    url?: string;
    isOnline?: boolean;
    isBot?: boolean;
    size?: "sm" | "md" | "lg" | "xl";
}

export const Avatar: React.FC<AvatarProps> = ({ name, url, isOnline, isBot, size = "md" }) => {
    const getBgColor = (text: string) => {
        const colors = [
            "bg-[#0084FF]",
            "bg-[#833AB4]",
            "bg-[#FF0080]",
            "bg-[#21BA45]",
            "bg-[#FBBD08]",
            "bg-[#E03997]"
        ];
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            hash = text.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const initials = (name || '?')
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    
    const bgColor = getBgColor(name || '?');
    
    const sizeClasses = {
        sm: "w-[28px] h-[28px] text-[10px]",
        md: "w-[36px] h-[36px] text-xs",
        lg: "w-[48px] h-[48px] text-[15px]",
        xl: "w-[80px] h-[80px] text-[24px]"
    };

    return (
        <div className={clsx(
            "relative flex-shrink-0",
            isBot && "p-[1.5px] rounded-full bg-gradient-to-tr from-[#833AB4] via-[#FF0080] to-[#FBBD08] shadow-md transition-transform duration-300 hover:scale-105"
        )}>
            {url ? (
                <img 
                    src={url} 
                    alt={name}
                    className={clsx(
                        "rounded-full object-cover shadow-sm ring-1 ring-black/5",
                        sizeClasses[size],
                        isBot && "border-2 border-white bg-white"
                    )}
                />
            ) : (
                <div className={clsx(
                    "rounded-full flex items-center justify-center font-bold text-white shadow-sm ring-1 ring-black/5",
                    isBot ? "bg-gradient-to-br from-[#405DE6] via-[#E1306C] to-[#F77737] border-2 border-white" : bgColor,
                    sizeClasses[size]
                )}>
                    {initials}
                </div>
            )}
            {isOnline && (
                <div className={clsx(
                    "absolute bottom-0 right-0 bg-[#31A24C] rounded-full border-2 border-white ring-1 ring-black/5",
                    size === 'lg' ? "w-3.5 h-3.5" : "w-3 h-3"
                )} />
            )}
        </div>
    );
};
