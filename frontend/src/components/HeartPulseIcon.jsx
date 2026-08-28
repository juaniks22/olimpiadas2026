import React from 'react';

export default function HeartPulseIcon({ className = '', size = 20, color = 'currentColor', strokeWidth = 2, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Top curves of the heart */}
      <path d="M 2.8 11.2 C 1.6 7.8 3.4 3.5 7.5 3.5 C 9.8 3.5 11.2 4.9 12 6.1 C 12.8 4.9 14.2 3.5 16.5 3.5 C 20.6 3.5 22.4 7.8 21.2 11.2" />
      {/* Heartbeat pulse waveform */}
      <path d="M 2 12 h 3.2 l 1.8 -3.2 l 2.2 6.4 l 1.8 -9.6 l 2 12.4 l 1.8 -6 l 1.2 2 h 5.8" />
      {/* Bottom curves of the heart converging to the tip */}
      <path d="M 3.2 13.8 C 4.6 17.8 8.2 20.6 12 21.8 C 15.8 20.6 19.4 17.8 20.8 13.8" />
    </svg>
  );
}
