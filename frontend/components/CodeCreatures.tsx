import { useState, useEffect, useRef } from 'react';

type CodeCreaturesProps = {
  isTyping?: boolean;
  focusedField?: 'username' | 'password' | null;
  showPassword?: boolean;
  submitting?: boolean;
  loginSuccess?: boolean;
  passwordLength?: number;
};

// CareerCompass exact palette
const C = {
  purple: '#6C3FF5',
  gray: '#2D2D2D',
  orange: '#FF9B6B',
  yellow: '#E8D754',
  pupil: '#2D2D2D',
};

// ── Position calculation ──

type PositionResult = {
  bodySkew: number;
  faceX: number;
  faceY: number;
};

// Calculate body skew and face offset for a character based on mouse position
function calculatePosition(
  mouseX: number,
  mouseY: number,
  charCenterX: number,
  charCenterY: number,
  state: 'idle' | 'typing' | 'password',
  side: 'left' | 'right' = 'left'
): PositionResult {
  if (state === 'password') {
    // Password visible: characters look away, no body skew
    return { bodySkew: 0, faceX: side === 'left' ? -5 : 5, faceY: -4 };
  }

  const dx = mouseX - charCenterX;
  const dy = mouseY - charCenterY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (state === 'typing') {
    // Typing: body leans toward keyboard area, eyes look down
    const skew = Math.max(-12, Math.min(12, dx * 0.04));
    return { bodySkew: skew, faceX: dx * 0.01, faceY: 4 };
  }

  // Idle: follow mouse with body skew and face tracking
  const maxSkew = 10;
  const maxFace = 5;
  const skew = Math.max(-maxSkew, Math.min(maxSkew, dx * 0.025));
  const faceX = dist > 0 ? (dx / dist) * Math.min(maxFace, dist * 0.015) : 0;
  const faceY = dist > 0 ? (dy / dist) * Math.min(maxFace, dist * 0.015) : 0;

  return { bodySkew: skew, faceX, faceY };
}

// ── EyeBall: white sclera + pupil ──

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
  const height = (isTyping || isHidingPassword) ? 190 : 170;

  // Eye position shifts based on state
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
  } else {
    // Use calculated face offset from mouse tracking
    flx = faceX;
    fly = faceY;
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
        transform: `skewX(${bodySkew}deg)`,
        transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 16, transition: 'all 0.2s ease' }}
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

  let eyeLeft = 22;
  let eyeTop = 28;
  if (isPasswordVisible) { eyeLeft = 10; eyeTop = 22; }
  else if (isLookingAtEachOther) { eyeLeft = 28; eyeTop = 10; }

  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) { flx = -4; fly = -4; }
  else if (isLookingAtEachOther) { flx = 0; fly = -4; }
  else { flx = faceX; fly = faceY; }

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
        transform: `skewX(${bodySkew}deg)`,
        transition: 'all 0.7s ease',
      }}
    >
      <div
        className="absolute flex gap-2.5"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.2s ease' }}
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
  const eyeLeft = isPasswordVisible ? 30 : 42;
  const eyeTop = isPasswordVisible ? 55 : 58;

  const flx = isPasswordVisible ? -5 : faceX;
  const fly = isPasswordVisible ? -4 : faceY;

  return (
    <div
      style={{
        width: 100,
        height: 85,
        backgroundColor: C.orange,
        borderRadius: '50px 50px 0 0',
        position: 'relative',
        zIndex: 3,
        transformOrigin: 'bottom center',
        transform: `skewX(${bodySkew}deg)`,
        transition: 'all 0.7s ease',
      }}
    >
      <div
        className="absolute flex"
        style={{ left: eyeLeft, top: eyeTop, gap: 18, transition: 'all 0.2s ease' }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} />
      </div>
    </div>
  );
}

// ── Yellow: tall rounded + mouth, front-right ──

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
  const eyeLeft = isPasswordVisible ? 15 : 25;
  const eyeTop = isPasswordVisible ? 25 : 30;
  const mouthLeft = isPasswordVisible ? 8 : 18;
  const mouthTop = isPasswordVisible ? 65 : 68;

  const flx = isPasswordVisible ? -5 : faceX;
  const fly = isPasswordVisible ? -4 : faceY;

  return (
    <div
      style={{
        width: 60,
        height: 95,
        backgroundColor: C.yellow,
        borderRadius: '30px 30px 0 0',
        position: 'relative',
        zIndex: 4,
        transformOrigin: 'bottom center',
        transform: `skewX(${bodySkew}deg)`,
        transition: 'all 0.7s ease',
      }}
    >
      <div
        className="absolute flex gap-2.5"
        style={{ left: eyeLeft, top: eyeTop, transition: 'all 0.2s ease' }}
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
  passwordLength = 0,
}: CodeCreaturesProps) {
  const [blink1, setBlink1] = useState(false);
  const [blink2, setBlink2] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 130, y: 95 }); // Default center
  const containerRef = useRef<HTMLDivElement>(null);

  // Track mouse position relative to container
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setMousePos({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
      });
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

  // Determine state for position calculation
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const posState = isPasswordVisible ? 'password' : isTyping ? 'typing' : 'idle';

  // Character centers in the 260x190 container
  const purplePos = calculatePosition(mousePos.x, mousePos.y, 60, 95, posState, 'left');
  const grayPos = calculatePosition(mousePos.x, mousePos.y, 120, 95, posState, 'right');
  const orangePos = calculatePosition(mousePos.x, mousePos.y, 45, 95, posState, 'left');
  const yellowPos = calculatePosition(mousePos.x, mousePos.y, 175, 95, posState, 'right');

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
      `}</style>

      {/* Container: 260x190, characters grounded at bottom */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{
          width: 260,
          height: 190,
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
            bodySkew={purplePos.bodySkew}
            faceX={purplePos.faceX}
            faceY={purplePos.faceY}
          />
        </div>
        {/* Gray — back-right */}
        <div className="absolute bottom-0" style={{ left: 95 }}>
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
        <div className="absolute bottom-0" style={{ left: 140 }}>
          <Yellow
            showPassword={showPassword}
            passwordLength={passwordLength}
            bodySkew={yellowPos.bodySkew}
            faceX={yellowPos.faceX}
            faceY={yellowPos.faceY}
          />
        </div>
      </div>
    </>
  );
}
