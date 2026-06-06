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
          className="rounded-full"
          style={{
            width: pupilSize,
            height: pupilSize,
            backgroundColor: '#2D2D2D',
            transform: `translate(${px}px, ${py}px)`,
            transition: 'transform 0.12s ease-out',
          }}
        />
      )}
    </div>
  );
}

// ── Pupil: no sclera, just a dot (for orange/yellow) ──
function Pupil({
  size = 12,
  maxDistance = 5,
  forceLookX,
  forceLookY,
}: {
  size?: number;
  maxDistance?: number;
  forceLookX?: number;
  forceLookY?: number;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceLookX !== undefined && forceLookY !== undefined) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = Math.min(maxDistance / (dist || 1), 1);
      setOffset({ x: dx * scale, y: dy * scale });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [maxDistance, forceLookX, forceLookY]);

  const px = forceLookX ?? offset.x;
  const py = forceLookY ?? offset.y;

  return (
    <div
      ref={ref}
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: '#2D2D2D',
        transform: `translate(${px}px, ${py}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
}

// ── CareerCompass color palette ──
const COLORS = {
  purple: '#6C3FF5',
  black: '#4A4A4A',
  orange: '#FF9B6B',
  yellow: '#E8D754',
};

// ── Purple: tall rectangle (back layer) ──
function Purple({
  isTyping,
  focusedField,
  loginSuccess,
  isBlinking,
  isLookingAtEachOther,
}: {
  isTyping: boolean;
  focusedField: 'username' | 'password' | null;
  loginSuccess: boolean;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
}) {
  const [jump, setJump] = useState(false);
  useEffect(() => {
    if (loginSuccess) { setJump(true); const t = setTimeout(() => setJump(false), 600); return () => clearTimeout(t); }
  }, [loginSuccess]);

  const isPassword = focusedField === 'password';
  const isHiding = focusedField === 'password' && !isPassword; // always false, kept for logic
  const height = (isTyping || isPassword) ? 200 : 170;
  const skew = isPassword ? 0 : isTyping ? -12 : 0;
  const translateX = isTyping && !isPassword ? 15 : 0;
  const eyeLeft = isPassword ? 14 : isLookingAtEachOther ? 30 : 20;
  const eyeTop = isPassword ? 28 : isLookingAtEachOther ? 40 : 30;
  const eyeGap = 20;

  return (
    <div
      style={{
        width: 75,
        height,
        backgroundColor: COLORS.purple,
        borderRadius: '10px 10px 0 0',
        position: 'relative',
        zIndex: 1,
        transformOrigin: 'bottom center',
        transform: `skewX(${skew}deg) translateX(${translateX}px) ${jump ? 'translateY(-16px)' : ''}`,
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: eyeGap, transition: 'all 0.6s ease' }}
      >
        <EyeBall size={18} pupilSize={7} isBlinking={isBlinking}
          forceLookX={isLookingAtEachOther ? 3 : isPassword ? -4 : undefined}
          forceLookY={isLookingAtEachOther ? 4 : isPassword ? -3 : undefined} />
        <EyeBall size={18} pupilSize={7} isBlinking={isBlinking}
          forceLookX={isLookingAtEachOther ? 3 : isPassword ? -4 : undefined}
          forceLookY={isLookingAtEachOther ? 4 : isPassword ? -3 : undefined} />
      </div>
    </div>
  );
}

// ── Black: medium tall rectangle (middle layer) ──
function Black({
  isTyping,
  focusedField,
  isBlinking,
  isLookingAtEachOther,
}: {
  isTyping: boolean;
  focusedField: 'username' | 'password' | null;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
}) {
  const isPassword = focusedField === 'password';
  const skew = isPassword ? 0 : isLookingAtEachOther ? 10 : isTyping ? 6 : 0;
  const translateX = isLookingAtEachOther ? 8 : 0;
  const eyeLeft = isPassword ? 10 : isLookingAtEachOther ? 28 : 22;
  const eyeTop = isPassword ? 22 : isLookingAtEachOther ? 10 : 28;

  return (
    <div
      style={{
        width: 55,
        height: 140,
        backgroundColor: COLORS.black,
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        zIndex: 2,
        transformOrigin: 'bottom center',
        transform: `skewX(${skew}deg) translateX(${translateX}px)`,
        transition: 'all 0.6s ease',
      }}
    >
      <div
        className="absolute flex gap-3"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.6s ease' }}
      >
        <EyeBall size={16} pupilSize={6} isBlinking={isBlinking}
          forceLookX={isLookingAtEachOther ? 0 : isPassword ? -4 : undefined}
          forceLookY={isLookingAtEachOther ? -4 : isPassword ? -3 : undefined} />
        <EyeBall size={16} pupilSize={6} isBlinking={isBlinking}
          forceLookX={isLookingAtEachOther ? 0 : isPassword ? -4 : undefined}
          forceLookY={isLookingAtEachOther ? -4 : isPassword ? -3 : undefined} />
      </div>
    </div>
  );
}

// ── Orange: semi-circle (front left) ──
function Orange({
  focusedField,
}: {
  focusedField: 'username' | 'password' | null;
}) {
  const isPassword = focusedField === 'password';
  const eyeLeft = isPassword ? 30 : 45;
  const eyeTop = isPassword ? 55 : 60;

  return (
    <div
      style={{
        width: 100,
        height: 85,
        backgroundColor: COLORS.orange,
        borderRadius: '50px 50px 0 0',
        position: 'relative',
        zIndex: 3,
        transformOrigin: 'bottom center',
      }}
    >
      <div
        className="absolute flex gap-5"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.2s ease' }}
      >
        <Pupil size={12} maxDistance={5}
          forceLookX={isPassword ? -5 : undefined}
          forceLookY={isPassword ? -4 : undefined} />
        <Pupil size={12} maxDistance={5}
          forceLookX={isPassword ? -5 : undefined}
          forceLookY={isPassword ? -4 : undefined} />
      </div>
    </div>
  );
}

// ── Yellow: tall rounded (front right) + horizontal mouth ──
function Yellow({
  focusedField,
}: {
  focusedField: 'username' | 'password' | null;
}) {
  const isPassword = focusedField === 'password';
  const eyeLeft = isPassword ? 15 : 28;
  const eyeTop = isPassword ? 25 : 30;
  const mouthLeft = isPassword ? 8 : 22;
  const mouthTop = isPassword ? 65 : 68;

  return (
    <div
      style={{
        width: 65,
        height: 100,
        backgroundColor: COLORS.yellow,
        borderRadius: '32px 32px 0 0',
        position: 'relative',
        zIndex: 4,
        transformOrigin: 'bottom center',
      }}
    >
      <div
        className="absolute flex gap-3"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.2s ease' }}
      >
        <Pupil size={12} maxDistance={5}
          forceLookX={isPassword ? -5 : undefined}
          forceLookY={isPassword ? -4 : undefined} />
        <Pupil size={12} maxDistance={5}
          forceLookX={isPassword ? -5 : undefined}
          forceLookY={isPassword ? -4 : undefined} />
      </div>
      {/* Horizontal line mouth */}
      <div
        className="absolute rounded-full"
        style={{
          left: mouthLeft,
          top: mouthTop,
          width: 32,
          height: 4,
          backgroundColor: COLORS.black,
          transition: 'all 0.2s ease',
        }}
      />
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
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);

  // Purple blink
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

  // Black blink
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

  // Look at each other when typing starts
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  return (
    <>
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

      {/* Container: characters grounded at bottom, overlapping */}
      <div className="relative select-none" style={{ width: 240, height: 210 }}>
        {/* Purple - back left */}
        <div className="absolute bottom-0" style={{ left: 10 }}>
          <Purple isTyping={isTyping} focusedField={focusedField} loginSuccess={loginSuccess} isBlinking={blink1} isLookingAtEachOther={isLookingAtEachOther} />
        </div>
        {/* Black - back right */}
        <div className="absolute bottom-0" style={{ left: 80 }}>
          <Black isTyping={isTyping} focusedField={focusedField} isBlinking={blink2} isLookingAtEachOther={isLookingAtEachOther} />
        </div>
        {/* Orange - front left */}
        <div className="absolute bottom-0" style={{ left: 0 }}>
          <Orange focusedField={focusedField} />
        </div>
        {/* Yellow - front right */}
        <div className="absolute bottom-0" style={{ left: 130 }}>
          <Yellow focusedField={focusedField} />
        </div>
      </div>
    </>
  );
}
