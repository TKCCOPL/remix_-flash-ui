import { useState, useEffect, useRef } from 'react';

type CodeCreaturesProps = {
  isTyping?: boolean;
  focusedField?: 'username' | 'password' | null;
  showPassword?: boolean;
  submitting?: boolean;
  loginSuccess?: boolean;
};

// CareerCompass exact palette
const C = {
  purple: '#6C3FF5',
  gray: '#2D2D2D',
  orange: '#FF9B6B',
  yellow: '#E8D754',
  pupil: '#2D2D2D',
};

// ── EyeBall: white sclera + pupil, tracks mouse ──
function EyeBall({
  size = 18,
  pupilSize = 7,
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceLookX !== undefined && forceLookY !== undefined) return;
    const handle = (e: MouseEvent) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const max = (size - pupilSize) / 2 - 1;
      const s = Math.min(max / (dist || 1), 1);
      setOffset({ x: dx * s, y: dy * s });
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, [size, pupilSize, forceLookX, forceLookY]);

  const px = forceLookX ?? offset.x;
  const py = forceLookY ?? offset.y;

  return (
    <div
      ref={ref}
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
            backgroundColor: C.pupil,
            transform: `translate(${px}px, ${py}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
}

// ── Pupil: no sclera, just a dot ──
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
    const handle = (e: MouseEvent) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const s = Math.min(maxDistance / (dist || 1), 1);
      setOffset({ x: dx * s, y: dy * s });
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, [maxDistance, forceLookX, forceLookY]);

  return (
    <div
      ref={ref}
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: C.pupil,
        transform: `translate(${forceLookX ?? offset.x}px, ${forceLookY ?? offset.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
}

// ── Purple: tall rectangle, back-left ──
function Purple({
  isTyping,
  showPassword,
  passwordLength,
  isBlinking,
  isLookingAtEachOther,
  isPeeking,
}: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
  isPeeking: boolean;
}) {
  const isHidingPassword = passwordLength > 0 && !showPassword;
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const height = (isTyping || isHidingPassword) ? 190 : 170;
  const skew = isPasswordVisible ? 0 : (isTyping || isHidingPassword) ? -12 : 0;
  const tx = isTyping && !isPasswordVisible ? 15 : 0;

  // Eye position
  let eyeLeft = 20;
  let eyeTop = 30;
  if (isPasswordVisible) { eyeLeft = 14; eyeTop = 28; }
  else if (isLookingAtEachOther) { eyeLeft = 28; eyeTop = 40; }

  // Eye look direction
  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) {
    flx = isPeeking ? 4 : -4;
    fly = isPeeking ? 5 : -4;
  } else if (isLookingAtEachOther) {
    flx = 3; fly = 4;
  }

  return (
    <div
      style={{
        width: 70,
        height,
        backgroundColor: C.purple,
        borderRadius: '10px 10px 0 0',
        position: 'relative',
        zIndex: 1,
        transformOrigin: 'bottom center',
        transform: `skewX(${skew}deg) translateX(${tx}px)`,
        transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 16, transition: 'all 0.6s ease' }}
      >
        <EyeBall size={18} pupilSize={7} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
        <EyeBall size={18} pupilSize={7} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}

// ── Gray: medium rectangle, back-right ──
function Gray({
  isTyping,
  showPassword,
  passwordLength,
  isBlinking,
  isLookingAtEachOther,
}: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const skew = isPasswordVisible ? 0 : isLookingAtEachOther ? 10 : isTyping ? 6 : 0;
  const tx = isLookingAtEachOther ? 8 : 0;

  let eyeLeft = 22;
  let eyeTop = 28;
  if (isPasswordVisible) { eyeLeft = 10; eyeTop = 22; }
  else if (isLookingAtEachOther) { eyeLeft = 28; eyeTop = 10; }

  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) { flx = -4; fly = -4; }
  else if (isLookingAtEachOther) { flx = 0; fly = -4; }

  return (
    <div
      style={{
        width: 50,
        height: 130,
        backgroundColor: C.gray,
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        zIndex: 2,
        transformOrigin: 'bottom center',
        transform: `skewX(${skew}deg) translateX(${tx}px)`,
        transition: 'all 0.6s ease',
      }}
    >
      <div
        className="absolute flex gap-2.5"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.6s ease' }}
      >
        <EyeBall size={16} pupilSize={6} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
        <EyeBall size={16} pupilSize={6} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}

// ── Orange: semi-circle, front-left ──
function Orange({
  showPassword,
  passwordLength,
}: {
  showPassword: boolean;
  passwordLength: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const eyeLeft = isPasswordVisible ? 30 : 42;
  const eyeTop = isPasswordVisible ? 55 : 58;

  return (
    <div
      style={{
        width: 100,
        height: 85,
        backgroundColor: C.orange,
        borderRadius: '50px 50px 0 0',
        position: 'relative',
        zIndex: 3,
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 18, transition: 'all 0.2s ease' }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={isPasswordVisible ? -5 : undefined} forceLookY={isPasswordVisible ? -4 : undefined} />
        <Pupil size={12} maxDistance={5} forceLookX={isPasswordVisible ? -5 : undefined} forceLookY={isPasswordVisible ? -4 : undefined} />
      </div>
    </div>
  );
}

// ── Yellow: tall rounded + mouth, front-right ──
function Yellow({
  showPassword,
  passwordLength,
}: {
  showPassword: boolean;
  passwordLength: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const eyeLeft = isPasswordVisible ? 15 : 25;
  const eyeTop = isPasswordVisible ? 25 : 30;
  const mouthLeft = isPasswordVisible ? 8 : 18;
  const mouthTop = isPasswordVisible ? 65 : 68;

  return (
    <div
      style={{
        width: 60,
        height: 95,
        backgroundColor: C.yellow,
        borderRadius: '30px 30px 0 0',
        position: 'relative',
        zIndex: 4,
      }}
    >
      <div
        className="absolute flex gap-2.5"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.2s ease' }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={isPasswordVisible ? -5 : undefined} forceLookY={isPasswordVisible ? -4 : undefined} />
        <Pupil size={12} maxDistance={5} forceLookX={isPasswordVisible ? -5 : undefined} forceLookY={isPasswordVisible ? -4 : undefined} />
      </div>
      {/* Horizontal mouth line */}
      <div
        className="absolute rounded-full"
        style={{
          left: mouthLeft,
          top: mouthTop,
          width: 28,
          height: 3.5,
          backgroundColor: C.pupil,
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
  const [isPeeking, setIsPeeking] = useState(false);

  // Purple blink (3-7s)
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

  // Gray blink (3-7s, offset)
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
    }
    setIsLookingAtEachOther(false);
  }, [isTyping]);

  // Purple sneaky peek when password visible
  useEffect(() => {
    if (showPassword) {
      const sched = () => {
        const t = setTimeout(() => {
          setIsPeeking(true);
          setTimeout(() => { setIsPeeking(false); sched(); }, 800);
        }, 2000 + Math.random() * 3000);
        return t;
      };
      const t = sched();
      return () => clearTimeout(t);
    }
    setIsPeeking(false);
  }, [showPassword]);

  const passwordLength = 0; // Could be passed as prop if needed

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
      `}</style>

      {/* Container: 240x190, characters grounded at bottom */}
      <div
        className="relative select-none"
        style={{
          width: 240,
          height: 195,
          animation: submitting ? 'shake 0.12s infinite' : undefined,
        }}
      >
        {/* Purple — back-left */}
        <div className="absolute bottom-0" style={{ left: 25 }}>
          <Purple
            isTyping={isTyping}
            showPassword={showPassword}
            passwordLength={passwordLength}
            isBlinking={blink1}
            isLookingAtEachOther={isLookingAtEachOther}
            isPeeking={isPeeking}
          />
        </div>
        {/* Gray — back-right */}
        <div className="absolute bottom-0" style={{ left: 90 }}>
          <Gray
            isTyping={isTyping}
            showPassword={showPassword}
            passwordLength={passwordLength}
            isBlinking={blink2}
            isLookingAtEachOther={isLookingAtEachOther}
          />
        </div>
        {/* Orange — front-left */}
        <div className="absolute bottom-0" style={{ left: 0 }}>
          <Orange showPassword={showPassword} passwordLength={passwordLength} />
        </div>
        {/* Yellow — front-right */}
        <div className="absolute bottom-0" style={{ left: 140 }}>
          <Yellow showPassword={showPassword} passwordLength={passwordLength} />
        </div>
      </div>
    </>
  );
}
