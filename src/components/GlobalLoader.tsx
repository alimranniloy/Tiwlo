import React, { useEffect, useState } from 'react';

export default function GlobalLoader({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'welcome'>('loading');

  useEffect(() => {
    // 2.2 seconds loading animation (matches ~1 cycle), then welcome text for 2 seconds
    const loadingTimer = setTimeout(() => {
      setPhase('welcome');
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 2000);
      return () => clearTimeout(completeTimer);
    }, 2200); // 2.2 sec loading

    return () => clearTimeout(loadingTimer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden flex items-center justify-center min-h-screen min-w-[100vw]">
      {/* Light blue smoke background effect */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] bg-blue-100/40 rounded-full blur-[100px] opacity-80"></div>
      </div>

      {phase === 'loading' && (
        <div className="relative w-full h-full transform scale-[0.5] sm:scale-[0.6]">
          <style>{`
            .bouncing-container {
              width: 200px;
              height: 200px;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              margin: auto;
              filter: url("#goo");
              animation: rotate-move 2s ease-in-out infinite;
            }

            .dot {
              width: 70px;
              height: 70px;
              border-radius: 50%;
              background-color: #000;
              position: absolute;
              top: 0;
              bottom: 0;
              left: 0;
              right: 0;
              margin: auto;
            }

            .dot-3 {
              background-color: #ff1717;
              animation: dot-3-move 2s ease infinite, index 6s ease infinite;
            }

            .dot-2 {
              background-color: #0051ff;
              animation: dot-2-move 2s ease infinite, index 6s -4s ease infinite;
            }

            .dot-1 {
              background-color: #ffc400;
              animation: dot-1-move 2s ease infinite, index 6s -2s ease infinite;
            }

            @keyframes dot-3-move {
              20% { transform: scale(1); }
              45% { transform: translateY(-18px) scale(0.45); }
              60% { transform: translateY(-90px) scale(0.45); }
              80% { transform: translateY(-90px) scale(0.45); }
              100% { transform: translateY(0px) scale(1); }
            }

            @keyframes dot-2-move {
              20% { transform: scale(1); }
              45% { transform: translate(-16px, 12px) scale(0.45); }
              60% { transform: translate(-80px, 60px) scale(0.45); }
              80% { transform: translate(-80px, 60px) scale(0.45); }
              100% { transform: translateY(0px) scale(1); }
            }

            @keyframes dot-1-move {
              20% { transform: scale(1); }
              45% { transform: translate(16px, 12px) scale(0.45); }
              60% { transform: translate(80px, 60px) scale(0.45); }
              80% { transform: translate(80px, 60px) scale(0.45); }
              100% { transform: translateY(0px) scale(1); }
            }

            @keyframes rotate-move {
              55% { transform: translate(-50%, -50%) rotate(0deg); }
              80% { transform: translate(-50%, -50%) rotate(360deg); }
              100% { transform: translate(-50%, -50%) rotate(360deg); }
            }

            @keyframes index {
              0%, 100% { z-index: 3; }
              33.3% { z-index: 2; }
              66.6% { z-index: 1; }
            }
          `}</style>

          <div className="bouncing-container">
            <div className="dot dot-1"></div>
            <div className="dot dot-2"></div>
            <div className="dot dot-3"></div>
          </div>

          <svg width="0" height="0" className="absolute hidden">
            <defs>
              <filter id="goo">
                <feGaussianBlur result="blur" stdDeviation="10" in="SourceGraphic" />
                <feColorMatrix
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7"
                  mode="matrix"
                  in="blur"
                />
              </filter>
            </defs>
          </svg>
        </div>
      )}

      {phase === 'welcome' && (
        <div className="absolute flex items-center justify-center text-blue-600 font-bold text-2xl tracking-tight">
          Welcome <span className="ml-2">👋</span>
        </div>
      )}
    </div>
  );
}
