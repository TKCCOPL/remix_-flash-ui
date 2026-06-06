import { useState, useEffect, useRef } from 'react';

type CodeCreaturesProps = {
  isTyping?: boolean;
  showPassword?: boolean;
  passwordLength?: number;
};

// ── Palette ──
const C = {
  purple: '#6C3FF5',
  gray: '#5A5A5A',       // lightened from #2D2D2D for dark bg visibility
  orange: '#FF9B6B',
  yellow: '#E8D754',
  pupil: '#2D2D2D',
};

// ── Position calculation ──

type PosResult = { bodySkew: number; faceX: number; faceY: number };

function calcPos(
  mx: number, my: number,
  cx: number, cy: number,
  state: 'idle' | 'typing' | 'password',
  side: 'left' | 'right' = 'left',
): PosResult {
  if (state === 'password') {
    return { bodySkew: 0, faceX: side === 'left' ? -15 : 15, faceY: -10 };
  }
  const dx = mx - cx;
  const dy = my - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (state === 'typing') {
    const skew = Math.max(-6, Math.min(6, dx * 0.03));
    return { bodySkew: skew, faceX: 0, faceY: 8 };
  }

  // Idle: follow mouse
  const maxSkew = 6;
  const maxFace = 15;
  const skew = Math.max(-maxSkew, Math.min(maxSkew, dx * 0.015));
  const faceX = dist > 0 ? (dx / dist) * Math.min(maxFace, dist * 0.03) : 0;
  const faceY = dist > 0 ? (dy / dist) * Math.min(10, dist * 0.02) : 0;
  return { bodySkew: skew, faceX, faceY };
}

// ── EyeBall: white sclera + pupil ──

function EyeBall({
  size = 18,
  pupilSize = 7,
  maxDistance = 5,
  isBlinking = false,
  forceLookX,
  forceLookY,
}: {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  // maxDistance is the primary constraint — keeps pupil well inside sclera
  const bound = Math.min(maxDistance, (size - pupilSize) / 2 - 2);

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
      const s = Math.min(bound / (dist || 1), 1);
      setOffset({ x: dx * s, y: dy * s });
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, [bound, forceLookX, forceLookY]);

  // Clamp forced look values within bounds too
  const px = forceLookX !== undefined
    ? Math.max(-bound, Math.min(bound, forceLookX))
    : offset.x;
  const py = forceLookY !== undefined
    ? Math.max(-bound, Math.min(bound, forceLookY))
    : offset.y;

  return (
    <div
      ref={ref}
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'height 0.1s ease, transform 0.2s ease-out',
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
            transition: 'transform 0.2s ease-out',
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
        transition: 'transform 0.2s ease-out',
      }}
    />
  );
}

// ── Purple: tall rectangle, back-left ──
// CareerCompass: left:70, w:180, h:400→440, z:1

function Purple({
  isTyping,
  showPassword,
  passwordLength,
  isBlinking,
  isLookingAtEachOther,
  isPeeking,
  bodySkew,
  faceX,
  faceY,
}: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
  isPeeking: boolean;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isHidingPassword = passwordLength > 0 && !showPassword;
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const height = (isTyping || isHidingPassword) ? 440 : 399;

  let eyeLeft = 45;
  let eyeTop = 40;
  if (isPasswordVisible) { eyeLeft = 30; eyeTop = 35; }
  else if (isLookingAtEachOther) { eyeLeft = 60; eyeTop = 60; }

  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) {
    flx = isPeeking ? 8 : -8;
    fly = isPeeking ? 6 : -6;
  } else if (isLookingAtEachOther) {
    flx = 6; fly = 6;
  } else {
    flx = faceX; fly = faceY;
  }

  return (
    <div
      style={{
        width: 180,
        height,
        backgroundColor: C.purple,
        borderRadius: '10px 10px 0 0',
        position: 'relative',
        zIndex: 1,
        transformOrigin: 'bottom center',
        transform: `skewX(${bodySkew}deg)`,
        transition: 'height 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 32, transition: 'all 0.2s ease' }}
      >
        <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
        <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}

// ── Gray: medium rectangle, back-right ──
// CareerCompass: left:240, w:120, h:310, z:2

function Gray({
  isTyping,
  showPassword,
  passwordLength,
  isBlinking,
  isLookingAtEachOther,
  bodySkew,
  faceX,
  faceY,
}: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;

  let eyeLeft = 26;
  let eyeTop = 32;
  if (isPasswordVisible) { eyeLeft = 15; eyeTop = 25; }
  else if (isLookingAtEachOther) { eyeLeft = 40; eyeTop = 15; }

  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) { flx = -10; fly = -8; }
  else if (isLookingAtEachOther) { flx = 0; fly = -6; }
  else { flx = faceX; fly = faceY; }

  return (
    <div
      style={{
        width: 120,
        height: 310,
        backgroundColor: C.gray,
        borderRadius: '10px 10px 0 0',
        position: 'relative',
        zIndex: 2,
        transformOrigin: 'bottom center',
        transform: `skewX(${bodySkew}deg)`,
        transition: 'all 0.7s ease',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 24, transition: 'all 0.2s ease' }}
      >
        <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
        <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}

// ── Orange: semi-circle, front-left ──
// CareerCompass: left:0, w:240, h:200, z:3

function Orange({
  showPassword,
  passwordLength,
  bodySkew,
  faceX,
  faceY,
}: {
  showPassword: boolean;
  passwordLength: number;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const eyeLeft = isPasswordVisible ? 60 : 82;
  const eyeTop = isPasswordVisible ? 80 : 90;

  const flx = isPasswordVisible ? -12 : faceX;
  const fly = isPasswordVisible ? -8 : faceY;

  return (
    <div
      style={{
        width: 240,
        height: 200,
        backgroundColor: C.orange,
        borderRadius: '120px 120px 0 0',
        position: 'relative',
        zIndex: 3,
        transformOrigin: 'bottom center',
        transform: `skewX(${bodySkew}deg)`,
        transition: 'all 0.7s ease',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 32, transition: 'all 0.2s ease' }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}

// ── Yellow: tall rounded + mouth, front-right ──
// CareerCompass: left:310, w:140, h:230, z:4

function Yellow({
  showPassword,
  passwordLength,
  bodySkew,
  faceX,
  faceY,
}: {
  showPassword: boolean;
  passwordLength: number;
  bodySkew: number;
  faceX: number;
  faceY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const eyeLeft = isPasswordVisible ? 35 : 52;
  const eyeTop = isPasswordVisible ? 30 : 40;
  const mouthLeft = isPasswordVisible ? 25 : 40;
  const mouthTop = isPasswordVisible ? 75 : 88;

  const flx = isPasswordVisible ? -12 : faceX;
  const fly = isPasswordVisible ? -8 : faceY;

  return (
    <div
      style={{
        width: 140,
        height: 230,
        backgroundColor: C.yellow,
        borderRadius: '70px 70px 0 0',
        position: 'relative',
        zIndex: 4,
        transformOrigin: 'bottom center',
        transform: `skewX(${bodySkew}deg)`,
        transition: 'all 0.7s ease',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 24, transition: 'all 0.2s ease' }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
      </div>
      {/* Horizontal mouth line */}
      <div
        className="absolute rounded-full"
        style={{
          left: mouthLeft,
          top: mouthTop,
          width: 60,
          height: 4,
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
  showPassword = false,
  passwordLength = 0,
}: CodeCreaturesProps) {
  const [blink1, setBlink1] = useState(false);
  const [blink2, setBlink2] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 275, y: 200 }); // center of 550×400
  const containerRef = useRef<HTMLDivElement>(null);

  // Track mouse position relative to container
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

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

  // State for position calculation
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const posState = isPasswordVisible ? 'password' : isTyping ? 'typing' : 'idle';

  // Character centers (550×400 container, bottom-aligned)
  const purplePos = calcPos(mousePos.x, mousePos.y, 160, 200, posState, 'left');
  const grayPos = calcPos(mousePos.x, mousePos.y, 300, 245, posState, 'right');
  const orangePos = calcPos(mousePos.x, mousePos.y, 120, 300, posState, 'left');
  const yellowPos = calcPos(mousePos.x, mousePos.y, 380, 285, posState, 'right');

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ width: 550, height: 400 }}
    >
      {/* Purple — back-left */}
      <div className="absolute bottom-0" style={{ left: 70 }}>
        <Purple
          isTyping={isTyping}
          showPassword={showPassword}
          passwordLength={passwordLength}
          isBlinking={blink1}
          isLookingAtEachOther={isLookingAtEachOther}
          isPeeking={isPeeking}
          bodySkew={purplePos.bodySkew}
          faceX={purplePos.faceX}
          faceY={purplePos.faceY}
        />
      </div>
      {/* Gray — back-right */}
      <div className="absolute bottom-0" style={{ left: 240 }}>
        <Gray
          isTyping={isTyping}
          showPassword={showPassword}
          passwordLength={passwordLength}
          isBlinking={blink2}
          isLookingAtEachOther={isLookingAtEachOther}
          bodySkew={grayPos.bodySkew}
          faceX={grayPos.faceX}
          faceY={grayPos.faceY}
        />
      </div>
      {/* Orange — front-left */}
      <div className="absolute bottom-0" style={{ left: 0 }}>
        <Orange
          showPassword={showPassword}
          passwordLength={passwordLength}
          bodySkew={orangePos.bodySkew}
          faceX={orangePos.faceX}
          faceY={orangePos.faceY}
        />
      </div>
      {/* Yellow — front-right */}
      <div className="absolute bottom-0" style={{ left: 310 }}>
        <Yellow
          showPassword={showPassword}
          passwordLength={passwordLength}
          bodySkew={yellowPos.bodySkew}
          faceX={yellowPos.faceX}
          faceY={yellowPos.faceY}
        />
      </div>
    </div>
  );
}
