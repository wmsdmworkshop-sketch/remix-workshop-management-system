import React from 'react';

export default function FunnySpinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 120 120" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <style>{`
        .spanner {
          transform-origin: 72px 56px;
          animation: wrench-crank 1s ease-in-out infinite;
        }
        .steam-1 {
          transform-origin: 35px 40px;
          animation: puff-steam 1.6s ease-in-out infinite;
        }
        .steam-2 {
          transform-origin: 75px 45px;
          animation: puff-steam 1.6s ease-in-out infinite 0.5s;
        }
        .headlights {
          animation: blink-eyes 2.5s steps(2, start) infinite;
        }
        @keyframes wrench-crank {
          0% { transform: rotate(0deg); }
          30% { transform: rotate(-35deg); }
          60% { transform: rotate(15deg); }
          80% { transform: rotate(-10deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes puff-steam {
          0% { transform: translate(0, 0) scale(0.4); opacity: 0; }
          40% { opacity: 0.8; }
          100% { transform: translate(-15px, -20px) scale(1.4); opacity: 0; }
        }
        @keyframes blink-eyes {
          0%, 92%, 100% { opacity: 1; }
          96% { opacity: 0.15; }
        }
      `}</style>
      
      {/* Small subtle background to make it visible anywhere */}
      <circle cx="60" cy="60" r="58" fill="#f8fafc" opacity="0.8" />

      {/* Wheel outlines */}
      <rect x="23" y="98" width="16" height="14" fill="#0f172a" rx="3" />
      <rect x="81" y="98" width="16" height="14" fill="#0f172a" rx="3" />

      {/* Car Body */}
      <path d="M 15 85 C 15 75, 25 65, 40 65 L 80 65 C 95 65, 105 75, 105 85 L 105 100 L 15 100 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="3" />

      {/* Grille and Headlights */}
      <rect x="38" y="78" width="44" height="16" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="2" />
      <circle cx="30" cy="78" r="8" fill="#fef08a" className="headlights" stroke="#ca8a04" strokeWidth="2" />
      <circle cx="90" cy="78" r="8" fill="#fef08a" className="headlights" stroke="#ca8a04" strokeWidth="2" />

      {/* Open Hood */}
      <path d="M 38 65 L 20 40 L 100 40 L 82 65 Z" fill="#7f1d1d" stroke="#991b1b" strokeWidth="2" />
      
      {/* Engine internals */}
      <rect x="38" y="50" width="44" height="15" fill="#475569" rx="2" />
      <circle cx="46" cy="57" r="3" fill="#ef4444" />
      <circle cx="56" cy="57" r="3" fill="#eab308" />
      <circle cx="66" cy="57" r="3" fill="#10b981" />

      {/* Puff of Steam / Smoke */}
      <circle cx="35" cy="40" r="6" fill="#cbd5e1" className="steam-1" opacity="0" />
      <circle cx="30" cy="30" r="8" fill="#e2e8f0" className="steam-1" opacity="0" />
      <circle cx="75" cy="45" r="5" fill="#cbd5e1" className="steam-2" opacity="0" />
      <circle cx="82" cy="35" r="7" fill="#e2e8f0" className="steam-2" opacity="0" />

      {/* Cartoon Mechanic Head */}
      <circle cx="60" cy="35" r="13" fill="#fed7aa" stroke="#c2410c" strokeWidth="2" />
      {/* Cap */}
      <path d="M 46 32 C 46 22, 74 22, 74 32 Z" fill="#2563eb" />
      <path d="M 52 25 L 78 28 L 74 33 Z" fill="#1d4ed8" />
      {/* Eyes */}
      <circle cx="54" cy="35" r="2.5" fill="#0f172a" />
      <circle cx="66" cy="35" r="2.5" fill="#0f172a" />
      {/* Smile */}
      <path d="M 55 41 Q 60 45, 65 41" stroke="#0f172a" strokeWidth="1.5" fill="none" />

      {/* Mechanic's Arm and Spanner */}
      <path d="M 73 38 Q 85 44, 75 56" fill="none" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />
      <g className="spanner">
        <line x1="72" y1="56" x2="92" y2="76" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
        <circle cx="72" cy="56" r="6" fill="#94a3b8" />
        <path d="M 68 52 L 74 58" stroke="#475569" strokeWidth="2.5" />
        <circle cx="92" cy="76" r="6" fill="#94a3b8" />
        <path d="M 88 72 L 94 78" stroke="#475569" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
