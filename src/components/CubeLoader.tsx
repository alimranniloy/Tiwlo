import React from 'react';

type CubeLoaderProps = {
  screen?: boolean;
  className?: string;
  label?: string;
};

export default function CubeLoader({ screen = false, className = '', label = 'Loading' }: CubeLoaderProps) {
  return (
    <div
      className={`${screen ? 'min-h-screen bg-white' : 'min-h-[46vh]'} grid place-items-center overflow-hidden ${className}`}
      role="status"
      aria-label={label}
    >
      <style>{`
        .tiwlo-cube-loader-wrap {
          width: 150px;
          height: 150px;
          display: grid;
          place-items: center;
          transform: translateY(-8px) scale(0.52);
          transform-origin: center;
        }

        @media (max-width: 480px) {
          .tiwlo-cube-loader-wrap {
            transform: translateY(-4px) scale(0.46);
          }
        }

        .tiwlo-cube-loader {
          --duration: 3s;
          --primary: rgba(39, 94, 254, 1);
          --primary-light: #2f71ff;
          --primary-rgba: rgba(39, 94, 254, 0);
          width: 200px;
          height: 320px;
          position: relative;
          transform-style: preserve-3d;
        }

        .tiwlo-cube-loader:before,
        .tiwlo-cube-loader:after {
          --r: 20.5deg;
          content: "";
          width: 320px;
          height: 140px;
          position: absolute;
          right: 32%;
          bottom: -11px;
          background: #ffffff;
          transform: translateZ(200px) rotate(var(--r));
          animation: tiwlo-loader-mask var(--duration) linear forwards infinite;
        }

        .tiwlo-cube-loader:after {
          --r: -20.5deg;
          right: auto;
          left: 32%;
        }

        .tiwlo-cube-loader .ground {
          position: absolute;
          left: -50px;
          bottom: -120px;
          transform-style: preserve-3d;
          transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1);
        }

        .tiwlo-cube-loader .ground div {
          width: 200px;
          height: 200px;
          background: linear-gradient(45deg, var(--primary) 0%, var(--primary) 50%, var(--primary-light) 50%, var(--primary-light) 100%);
          transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0);
          transform-style: preserve-3d;
          animation: tiwlo-loader-ground var(--duration) linear forwards infinite;
        }

        .tiwlo-cube-loader .ground div:before,
        .tiwlo-cube-loader .ground div:after {
          --rx: 90deg;
          --ry: 0deg;
          --x: 44px;
          --y: 162px;
          --z: -50px;
          content: "";
          width: 156px;
          height: 300px;
          opacity: 0;
          background: linear-gradient(var(--primary), var(--primary-rgba));
          position: absolute;
          transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y)) translateZ(var(--z));
          animation: tiwlo-loader-ground-shine var(--duration) linear forwards infinite;
        }

        .tiwlo-cube-loader .ground div:after {
          --rx: 90deg;
          --ry: 90deg;
          --x: 0;
          --y: 177px;
          --z: 150px;
        }

        .tiwlo-cube-loader .box {
          --x: 0;
          --y: 0;
          position: absolute;
          animation: var(--duration) linear forwards infinite;
          transform: translate(var(--x), var(--y));
        }

        .tiwlo-cube-loader .box div {
          width: 48px;
          height: 48px;
          background-color: var(--primary);
          position: relative;
          transform-style: preserve-3d;
          animation: var(--duration) ease forwards infinite;
          transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0);
        }

        .tiwlo-cube-loader .box div:before,
        .tiwlo-cube-loader .box div:after {
          --rx: 90deg;
          --ry: 0deg;
          --z: 24px;
          --y: -24px;
          --x: 0;
          content: "";
          position: absolute;
          width: inherit;
          height: inherit;
          background-color: inherit;
          filter: brightness(var(--b, 1.2));
          transform: rotateX(var(--rx)) rotateY(var(--ry)) translate(var(--x), var(--y)) translateZ(var(--z));
        }

        .tiwlo-cube-loader .box div:after {
          --rx: 0deg;
          --ry: 90deg;
          --x: 24px;
          --y: 0;
          --b: 1.4;
        }

        .tiwlo-cube-loader .box.box0 { --x: -220px; --y: -120px; left: 58px; top: 108px; animation-name: tiwlo-box-move0; }
        .tiwlo-cube-loader .box.box1 { --x: -260px; --y: 120px; left: 25px; top: 120px; animation-name: tiwlo-box-move1; }
        .tiwlo-cube-loader .box.box2 { --x: 120px; --y: -190px; left: 58px; top: 64px; animation-name: tiwlo-box-move2; }
        .tiwlo-cube-loader .box.box3 { --x: 280px; --y: -40px; left: 91px; top: 120px; animation-name: tiwlo-box-move3; }
        .tiwlo-cube-loader .box.box4 { --x: 60px; --y: 200px; left: 58px; top: 132px; animation-name: tiwlo-box-move4; }
        .tiwlo-cube-loader .box.box5 { --x: -220px; --y: -120px; left: 25px; top: 76px; animation-name: tiwlo-box-move5; }
        .tiwlo-cube-loader .box.box6 { --x: -260px; --y: 120px; left: 91px; top: 76px; animation-name: tiwlo-box-move6; }
        .tiwlo-cube-loader .box.box7 { --x: -240px; --y: 200px; left: 58px; top: 87px; animation-name: tiwlo-box-move7; }

        .tiwlo-cube-loader .box0 div { animation-name: tiwlo-box-scale0; }
        .tiwlo-cube-loader .box1 div { animation-name: tiwlo-box-scale1; }
        .tiwlo-cube-loader .box2 div { animation-name: tiwlo-box-scale2; }
        .tiwlo-cube-loader .box3 div { animation-name: tiwlo-box-scale3; }
        .tiwlo-cube-loader .box4 div { animation-name: tiwlo-box-scale4; }
        .tiwlo-cube-loader .box5 div { animation-name: tiwlo-box-scale5; }
        .tiwlo-cube-loader .box6 div { animation-name: tiwlo-box-scale6; }
        .tiwlo-cube-loader .box7 div { animation-name: tiwlo-box-scale7; }

        @keyframes tiwlo-box-move0 { 12% { transform: translate(var(--x), var(--y)); } 25%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-move1 { 16% { transform: translate(var(--x), var(--y)); } 29%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-move2 { 20% { transform: translate(var(--x), var(--y)); } 33%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-move3 { 24% { transform: translate(var(--x), var(--y)); } 37%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-move4 { 28% { transform: translate(var(--x), var(--y)); } 41%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-move5 { 32% { transform: translate(var(--x), var(--y)); } 45%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-move6 { 36% { transform: translate(var(--x), var(--y)); } 49%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-move7 { 40% { transform: translate(var(--x), var(--y)); } 53%, 52% { transform: translate(0, 0); } 80% { transform: translate(0, -32px); } 90%, 100% { transform: translate(0, 188px); } }
        @keyframes tiwlo-box-scale0 { 6% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 14%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-box-scale1 { 10% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 18%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-box-scale2 { 14% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 22%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-box-scale3 { 18% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 26%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-box-scale4 { 22% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 30%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-box-scale5 { 26% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 34%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-box-scale6 { 30% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 38%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-box-scale7 { 34% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(0); } 42%, 100% { transform: rotateY(-47deg) rotateX(-15deg) rotateZ(15deg) scale(1); } }
        @keyframes tiwlo-loader-ground { 0%, 65% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0); } 75%, 90% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(1); } 100% { transform: rotateX(90deg) rotateY(0deg) translate(-48px, -120px) translateZ(100px) scale(0); } }
        @keyframes tiwlo-loader-ground-shine { 0%, 70% { opacity: 0; } 75%, 87% { opacity: 0.2; } 100% { opacity: 0; } }
        @keyframes tiwlo-loader-mask { 0%, 65% { opacity: 0; } 66%, 100% { opacity: 1; } }
      `}</style>
      <div className="tiwlo-cube-loader-wrap">
        <div className="tiwlo-cube-loader">
          <div className="box box0"><div /></div>
          <div className="box box1"><div /></div>
          <div className="box box2"><div /></div>
          <div className="box box3"><div /></div>
          <div className="box box4"><div /></div>
          <div className="box box5"><div /></div>
          <div className="box box6"><div /></div>
          <div className="box box7"><div /></div>
          <div className="ground"><div /></div>
        </div>
      </div>
    </div>
  );
}
