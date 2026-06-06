import { useState, useEffect, useRef, useCallback } from 'react';

type CodeCreaturesProps = {
  isTyping?: boolean;
  focusedField?: 'username' | 'password' | null;
  showPassword?: boolean;
  submitting?: boolean;
  loginSuccess?: boolean;
};

// ── EyeBall: tracks mouse position ──
function EyeBall({ size = 10, pupilSize = 5 }: { size?: number; pupilSize?: number }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current) return;
      const rect = eyeRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxOffset = (size - pupilSize) / 2;
      const scale = Math.min(maxOffset / (dist || 1), 1);
      setOffset({ x: dx * scale, y: dy * scale });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [size, pupilSize]);

  // Random blink every 3-7s
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      const delay = 3000 + Math.random() * 4000;
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 150);
      }, delay);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div
      ref={eyeRef}
      className="rounded-full bg-white flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {blink ? (
        <div className="w-full h-0.5 bg-current rounded-full" />
      ) : (
        <div
          className="rounded-full bg-stone-900"
          style={{
            width: pupilSize,
            height: pupilSize,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
}

// ── Codey: purple bracket person `{ }` ──
function Codey({
  isTyping,
  focusedField,
  loginSuccess,
}: {
  isTyping: boolean;
  focusedField: 'username' | 'password' | null;
  loginSuccess: boolean;
}) {
  const [jump, setJump] = useState(false);

  useEffect(() => {
    if (loginSuccess) {
      setJump(true);
      const timer = setTimeout(() => setJump(false), 600);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess]);

  const isPasswordFocused = focusedField === 'password';
  const bodyScaleY = isTyping ? 1.12 : 1;
  const bodyTilt = isTyping ? -5 : 0;
  const rotateY = isPasswordFocused ? 180 : 0;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        transform: `scaleY(${bodyScaleY}) rotate(${bodyTilt}deg) rotateY(${rotateY}deg) ${jump ? 'translateY(-20px)' : 'translateY(0)'}`,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Left bracket `{` */}
      <div className="text-indigo-400 text-5xl font-bold leading-none select-none" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {'{'}
      </div>
      {/* Face area */}
      <div className="flex items-center gap-2 -my-1">
        <EyeBall size={12} pupilSize={6} />
        <EyeBall size={12} pupilSize={6} />
      </div>
      {/* Right bracket `}` */}
      <div className="text-indigo-400 text-5xl font-bold leading-none select-none" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {'}'}
      </div>
    </div>
  );
}

// ── Semicolon: orange semicolon sprite `;` ──
function Semicolon({
  isTyping,
  showPassword,
  submitting,
}: {
  isTyping: boolean;
  showPassword: boolean;
  submitting: boolean;
}) {
  const headTilt = isTyping ? 15 : 0;
  const shake = submitting;

  return (
    <div
      className="relative flex flex-col items-center"
      style={{
        transform: `rotate(${headTilt}deg)`,
        transition: 'transform 0.3s ease',
        animation: shake ? 'shake 0.15s infinite' : undefined,
      }}
    >
      {/* Top dot */}
      <div
        className="w-3.5 h-3.5 rounded-full bg-orange-400"
        style={{ marginBottom: -2 }}
      />
      {/* Eyes on the dot */}
      <div className="absolute top-1 flex items-center gap-1.5">
        <EyeBall size={8} pupilSize={4} />
        <EyeBall size={8} pupilSize={4} />
      </div>
      {/* Tail */}
      <div
        className="text-orange-400 text-4xl font-bold leading-none select-none -mt-2"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        ,
      </div>
      {/* Peek indicator when password visible */}
      {showPassword && (
        <div className="absolute -right-4 top-0 text-xs text-orange-300 animate-pulse select-none">
          👀
        </div>
      )}
    </div>
  );
}

// ── Cursor: green blinking cursor `>_` ──
function Cursor({ isTyping, focusedField, loginSuccess }: {
  isTyping: boolean;
  focusedField: 'username' | 'password' | null;
  loginSuccess: boolean;
}) {
  const blinkDuration = isTyping ? '0.3s' : '1s';
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (loginSuccess) {
      const newParticles = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 60,
        y: (Math.random() - 0.5) * 60,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => setParticles([]), 800);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess]);

  // Vertical position based on focused field
  const translateY = focusedField === 'password' ? 12 : focusedField === 'username' ? -12 : 0;

  return (
    <div
      className="relative flex items-center"
      style={{
        transform: `translateY(${translateY}px)`,
        transition: 'transform 0.4s ease',
      }}
    >
      <span
        className="text-emerald-400 text-2xl font-bold select-none"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          animation: `cursorBlink ${blinkDuration} step-end infinite`,
        }}
      >
        {'>_'}
      </span>
      {/* Explosion particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-1.5 h-1.5 rounded-full bg-emerald-400"
          style={{
            left: '50%',
            top: '50%',
            animation: `particle 0.6s ease-out forwards`,
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
  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
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

      <div className="flex items-end gap-6 select-none">
        <Codey isTyping={isTyping} focusedField={focusedField} loginSuccess={loginSuccess} />
        <Semicolon isTyping={isTyping} showPassword={showPassword} submitting={submitting} />
        <Cursor isTyping={isTyping} focusedField={focusedField} loginSuccess={loginSuccess} />
      </div>
    </>
  );
}
