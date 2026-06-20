import React from 'react'

interface VerifiedBadgeProps {
  className?: string
  title?: string
}

export const VerifiedBadge = ({ className = "w-4 h-4", title = "Tasdiqlangan PRO hisob" }: VerifiedBadgeProps) => {
  return (
    <span className={`inline-flex items-center justify-center relative group/badge ${className}`} title={title}>
      {/* Background Ambient Glow */}
      <span className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 rounded-full blur-[2px] opacity-70 group-hover/badge:opacity-90 group-hover/badge:blur-[3px] transition-all duration-300" />
      
      {/* Outer SVG star shape */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-transform duration-300 group-hover/badge:scale-110"
      >
        <defs>
          <linearGradient id="cyber-badge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" /> {/* Cyan */}
            <stop offset="50%" stopColor="#3B82F6" /> {/* Blue */}
            <stop offset="100%" stopColor="#8B5CF6" /> {/* Violet */}
          </linearGradient>
        </defs>
        {/* Futuristic 8-Pointed Star / Premium badge shape */}
        <path
          d="M12 2L14.85 6.35L19.8 4.8L18.25 9.75L22 12L18.25 14.25L19.8 19.2L14.85 17.65L12 22L9.15 17.65L4.2 19.2L5.75 14.25L2 12L5.75 9.75L4.2 4.8L9.15 6.35L12 2Z"
          fill="url(#cyber-badge-grad)"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Sparkle/Star in the center instead of standard tick mark */}
        <path
          d="M12 7.5L13.1 10.9L16.5 12L13.1 13.1L12 16.5L10.9 13.1L7.5 12L10.9 10.9L12 7.5Z"
          fill="#FFFFFF"
        />
      </svg>
    </span>
  )
}
export default VerifiedBadge
