import { useState, useEffect, useRef } from 'react';

type CodeCreaturesProps = {
  isTyping?: boolean;
  focusedField?: 'username' | 'password' | null;
  showPassword?: boolean;
  submitting?: boolean;
  loginSuccess?: boolean;
};

// ── EyeBall: white sclera + dark pupil, tracks mouse ──
function EyeBall({
  size = 20,
  pupilSize = 8,
  isBlinking = false,
  forceLookX,
  forceLookY,
}: {
  size?: number;
  pupilSize?: number;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceLookX !== undefined && forceLookY !== undefined) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return;
      const rect = eyeRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxOff = (size - pupilSize) / 2 - 1;
      const scale = Math.min(maxOff / (dist || 1), 1);
      setOffset({ x: dx * scale, y: dy * scale });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size, pupilSize, forceLookX, forceLookY]);

  const px = forceLookX ?? offset.x;
  const py = forceLookY ?? offset.y;

  return (
    <div
      ref={eyeRef}
      className="rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0"
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        transition: 'height 0.1s ease',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full bg-stone-900"
          style={{
            width: pupilSize,
            height: pupilSize,
            transform: `translate(${px}px, ${py}px)`,
            transition: 'transform 0.12s ease-out',
          }}
        />
      )}
    </div>
  );
}

// ── Codey: tall purple rectangle with eyes ──
function Codey({
  isTyping,
  focusedField,
  loginSuccess,
  isBlinking,
}: {
  isTyping: boolean;
  focusedField: 'username' | 'password' | null;
  loginSuccess: boolean;
  isBlinking: boolean;
}) {
  const [jump, setJump] = useState(false);

  useEffect(() => {
    if (loginSuccess) {
      setJump(true);
      const t = setTimeout(() => setJump(false), 600);
      return () => clearTimeout(t);
    }
  }, [loginSuccess]);

  const isPassword = focusedField === 'password';
  const height = isTyping ? 200 : 170;
  const skew = isTyping ? -6 : 0;
  const rotateY = isPassword ? 180 : 0;
  const eyeLeft = isPassword ? 14 : 22;
  const eyeTop = isPassword ? 28 : 32;

  return (
    <div
      style={{
        width: 80,
        height,
        backgroundColor: '#818CF8',
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        transformOrigin: 'bottom center',
        transform: `scaleY(${isTyping ? 1.05 : 1}) skewX(${skew}deg) rotateY(${rotateY}deg) ${jump ? 'translateY(-16px)' : ''}`,
        transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="absolute flex gap-3"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.5s ease' }}
      >
        <EyeBall size={16} pupilSize={7} isBlinking={isBlinking} forceLookX={isPassword ? -4 : undefined} forceLookY={isPassword ? -3 : undefined} />
        <EyeBall size={16} pupilSize={7} isBlinking={isBlinking} forceLookX={isPassword ? -4 : undefined} forceLookY={isPassword ? -3 : undefined} />
      </div>
    </div>
  );
}

// ── Semicolon: shorter orange rounded rectangle ──
function Semicolon({
  isTyping,
  showPassword,
  submitting,
  isBlinking,
}: {
  isTyping: boolean;
  showPassword: boolean;
  submitting: boolean;
  isBlinking: boolean;
}) {
  const tilt = isTyping ? 10 : 0;
  const eyeLeft = showPassword ? 12 : 18;
  const eyeTop = showPassword ? 22 : 26;

  return (
    <div
      style={{
        width: 65,
        height: 120,
        backgroundColor: '#FB923C',
        borderRadius: '32px 32px 0 0',
        position: 'relative',
        transformOrigin: 'bottom center',
        transform: `rotate(${tilt}deg)`,
        transition: 'transform 0.4s ease',
        animation: submitting ? 'shake 0.12s infinite' : undefined,
      }}
    >
      <div
        className="absolute flex gap-2"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.4s ease' }}
      >
        <EyeBall size={13} pupilSize={6} isBlinking={isBlinking} forceLookX={showPassword ? 4 : undefined} forceLookY={showPassword ? 3 : undefined} />
        <EyeBall size={13} pupilSize={6} isBlinking={isBlinking} forceLookX={showPassword ? 4 : undefined} forceLookY={showPassword ? 3 : undefined} />
      </div>
      {/* Peek indicator */}
      {showPassword && (
        <div className="absolute -right-3 top-4 text-[10px] animate-pulse select-none">👀</div>
      )}
    </div>
  );
}

// ── Cursor: small green circle ──
function Cursor({
  isTyping,
  focusedField,
  loginSuccess,
}: {
  isTyping: boolean;
  focusedField: 'username' | 'password' | null;
  loginSuccess: boolean;
}) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (loginSuccess) {
      setParticles(Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 50,
        y: (Math.random() - 0.5) * 50,
      })));
      const t = setTimeout(() => setParticles([]), 800);
      return () => clearTimeout(t);
    }
  }, [loginSuccess]);

  const translateY = focusedField === 'password' ? 10 : focusedField === 'username' ? -10 : 0;

  return (
    <div
      className="relative"
      style={{
        width: 40,
        height: 40,
        backgroundColor: '#34D399',
        borderRadius: '50%',
        transform: `translateY(${translateY}px)`,
        transition: 'transform 0.4s ease',
        animation: isTyping ? 'cursorBlink 0.3s step-end infinite' : 'cursorBlink 1s step-end infinite',
      }}
    >
      {/* Simple face */}
      <div className="absolute flex gap-1.5" style={{ left: 9, top: 12 }}>
        <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
        <div className="w-1.5 h-1.5 rounded-full bg-stone-900" />
      </div>
      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-300"
          style={{
            left: '50%',
            top: '50%',
            animation: 'particle 0.6s ease-out forwards',
            '--tx': `${p.x}px`,
            '--ty': `${p.y}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Main component ──
export default function CodeCreatures({
  isTyping = false,
  focusedField = null,
  showPassword = false,
  submitting = false,
  loginSuccess = false,
}: CodeCreaturesProps) {
  const [blink1, setBlink1] = useState(false);
  const [blink2, setBlink2] = useState(false);

  // Codey blink
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const sched = () => {
      t = setTimeout(() => {
        setBlink1(true);
        setTimeout(() => { setBlink1(false); sched(); }, 150);
      }, 3000 + Math.random() * 4000);
    };
    sched();
    return () => clearTimeout(t);
  }, []);

  // Semicolon blink
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const sched = () => {
      t = setTimeout(() => {
        setBlink2(true);
        setTimeout(() => { setBlink2(false); sched(); }, 150);
      }, 3500 + Math.random() * 3500);
    };
    sched();
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(10deg); }
          25% { transform: translateX(-2px) rotate(8deg); }
          75% { transform: translateX(2px) rotate(12deg); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes particle {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)); opacity: 0; }
        }
      `}</style>

      <div className="flex items-end gap-4 select-none">
        <Codey isTyping={isTyping} focusedField={focusedField} loginSuccess={loginSuccess} isBlinking={blink1} />
        <Semicolon isTyping={isTyping} showPassword={showPassword} submitting={submitting} isBlinking={blink2} />
        <Cursor isTyping={isTyping} focusedField={focusedField} loginSuccess={loginSuccess} />
      </div>
    </>
  );
}
