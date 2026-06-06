import { useState, useEffect, useRef } from 'react';

type CodeCreaturesProps = {
  isTyping?: boolean;
  showPassword?: boolean;
  submitting?: boolean;
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

// ── Position calculation (per-character, DOM-ref based) ──

type PositionResult = {
  bodySkew: number;
  faceX: number;
  faceY: number;
};

function calculatePosition(
  mouseX: number,
  mouseY: number,
  ref: React.RefObject<HTMLDivElement | null>
): PositionResult {
  if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

  const rect = ref.current.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 3;

  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;

  const faceX = Math.max(-15, Math.min(15, deltaX / 20));
  const faceY = Math.max(-10, Math.min(10, deltaY / 30));
  const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

  return { faceX, faceY, bodySkew };
}

// ── EyeBall: white sclera + pupil ──

function EyeBall({
  size = 18,
  pupilSize = 7,
  maxDistance = 5,
  isBlinking = false,
  forceLookX,
  forceLookY,
  mouseX,
  mouseY,
}: {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
  mouseX: number;
  mouseY: number;
}) {
  const eyeRef = useRef<HTMLDivElement>(null);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150 shrink-0"
      style={{
        width: size,
        height: isBlinking ? 2 : size,
        backgroundColor: 'white',
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: pupilSize,
            height: pupilSize,
            backgroundColor: C.pupil,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
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
  mouseX,
  mouseY,
}: {
  size?: number;
  maxDistance?: number;
  forceLookX?: number;
  forceLookY?: number;
  mouseX: number;
  mouseY: number;
}) {
  const pupilRef = useRef<HTMLDivElement>(null);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: C.pupil,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
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
  bodySkew,
  faceX,
  faceY,
  mouseX,
  mouseY,
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
  mouseX: number;
  mouseY: number;
}) {
  const isHidingPassword = passwordLength > 0 && !showPassword;
  const isPasswordVisible = passwordLength > 0 && showPassword;

  // Body height: grow when typing or hiding password
  const height = (isTyping || isHidingPassword) ? 190 : 170;

  // Body transform: exact CareerCompass logic
  const bodyTransform = isPasswordVisible
    ? 'skewX(0deg)'
    : (isTyping || isHidingPassword)
      ? `skewX(${(bodySkew || 0) - 12}deg) translateX(19px)`
      : `skewX(${bodySkew || 0}deg)`;

  // Eye container position per state
  let eyeLeft: number;
  let eyeTop: number;
  if (isPasswordVisible) {
    eyeLeft = 20;
    eyeTop = 35;
  } else if (isLookingAtEachOther) {
    eyeLeft = 55;
    eyeTop = 65;
  } else {
    eyeLeft = 45 + faceX;
    eyeTop = 40 + faceY;
  }

  // Eye look direction
  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) {
    flx = isPeeking ? 4 : -4;
    fly = isPeeking ? 5 : -4;
  } else if (isLookingAtEachOther) {
    flx = 3;
    fly = 4;
  } else {
    flx = undefined; // use mouse tracking
    fly = undefined;
  }

  return (
    <div
      style={{
        width: 85,
        height,
        backgroundColor: C.purple,
        borderRadius: '10px 10px 0 0',
        position: 'relative',
        zIndex: 1,
        transformOrigin: 'bottom center',
        transform: bodyTransform,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 15,
          transition: 'all 0.7s ease-in-out',
        }}
      >
        <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
        <EyeBall size={18} pupilSize={7} maxDistance={5} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
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
  mouseX,
  mouseY,
}: {
  isTyping: boolean;
  showPassword: boolean;
  passwordLength: number;
  isBlinking: boolean;
  isLookingAtEachOther: boolean;
  bodySkew: number;
  faceX: number;
  faceY: number;
  mouseX: number;
  mouseY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;
  const isHidingPassword = passwordLength > 0 && !showPassword;

  // Body transform: exact CareerCompass logic
  const bodyTransform = isPasswordVisible
    ? 'skewX(0deg)'
    : isLookingAtEachOther
      ? `skewX(${(bodySkew || 0) * 1.5 + 10}deg) translateX(9px)`
      : (isTyping || isHidingPassword)
        ? `skewX(${(bodySkew || 0) * 1.5}deg)`
        : `skewX(${bodySkew || 0}deg)`;

  // Eye container position per state
  let eyeLeft: number;
  let eyeTop: number;
  if (isPasswordVisible) {
    eyeLeft = 10;
    eyeTop = 28;
  } else if (isLookingAtEachOther) {
    eyeLeft = 32;
    eyeTop = 12;
  } else {
    eyeLeft = 26 + faceX;
    eyeTop = 32 + faceY;
  }

  // Eye look direction
  let flx: number | undefined;
  let fly: number | undefined;
  if (isPasswordVisible) {
    flx = -4;
    fly = -4;
  } else if (isLookingAtEachOther) {
    flx = 0;
    fly = -4;
  } else {
    flx = undefined;
    fly = undefined;
  }

  return (
    <div
      style={{
        width: 57,
        height: 147,
        backgroundColor: C.gray,
        borderRadius: '8px 8px 0 0',
        position: 'relative',
        zIndex: 2,
        transformOrigin: 'bottom center',
        transform: bodyTransform,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 11,
          transition: 'all 0.7s ease-in-out',
        }}
      >
        <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
        <EyeBall size={16} pupilSize={6} maxDistance={4} isBlinking={isBlinking} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
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
  mouseX,
  mouseY,
}: {
  showPassword: boolean;
  passwordLength: number;
  bodySkew: number;
  faceX: number;
  faceY: number;
  mouseX: number;
  mouseY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;

  // Eye container position per state
  const eyeLeft = isPasswordVisible ? 50 : 82 + faceX;
  const eyeTop = isPasswordVisible ? 85 : 90 + faceY;

  // Force look when password visible
  const flx = isPasswordVisible ? -5 : undefined;
  const fly = isPasswordVisible ? -4 : undefined;

  return (
    <div
      style={{
        width: 114,
        height: 95,
        backgroundColor: C.orange,
        borderRadius: '57px 57px 0 0',
        position: 'relative',
        zIndex: 3,
        transformOrigin: 'bottom center',
        transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${bodySkew || 0}deg)`,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 15,
          transition: 'all 0.2s ease-out',
        }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
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
  mouseX,
  mouseY,
}: {
  showPassword: boolean;
  passwordLength: number;
  bodySkew: number;
  faceX: number;
  faceY: number;
  mouseX: number;
  mouseY: number;
}) {
  const isPasswordVisible = passwordLength > 0 && showPassword;

  // Eye container position per state
  const eyeLeft = isPasswordVisible ? 20 : 52 + faceX;
  const eyeTop = isPasswordVisible ? 35 : 40 + faceY;

  // Mouth position per state
  const mouthLeft = isPasswordVisible ? 10 : 40 + faceX;
  const mouthTop = isPasswordVisible ? 88 : 88 + faceY;

  // Force look when password visible
  const flx = isPasswordVisible ? -5 : undefined;
  const fly = isPasswordVisible ? -4 : undefined;

  return (
    <div
      style={{
        width: 66,
        height: 109,
        backgroundColor: C.yellow,
        borderRadius: '33px 33px 0 0',
        position: 'relative',
        zIndex: 4,
        transformOrigin: 'bottom center',
        transform: isPasswordVisible ? 'skewX(0deg)' : `skewX(${bodySkew || 0}deg)`,
        transition: 'all 0.7s ease-in-out',
      }}
    >
      <div
        className="absolute flex"
        style={{
          left: eyeLeft,
          top: eyeTop,
          gap: 11,
          transition: 'all 0.2s ease-out',
        }}
      >
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
        <Pupil size={12} maxDistance={5} forceLookX={flx} forceLookY={fly} mouseX={mouseX} mouseY={mouseY} />
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
          transition: 'all 0.2s ease-out',
        }}
      />
    </div>
  );
}

// ── Shake keyframes (constant to avoid re-creating on every render) ──

const SHAKE_KEYFRAMES = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-2px) rotate(-1deg); }
    75% { transform: translateX(2px) rotate(1deg); }
  }
`;

// ── Main component ──

export default function CodeCreatures({
  isTyping = false,
  showPassword = false,
  submitting = false,
  passwordLength = 0,
}: CodeCreaturesProps) {
  const [blink1, setBlink1] = useState(false);
  const [blink2, setBlink2] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const purpleRef = useRef<HTMLDivElement>(null);
  const grayRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);

  // Track mouse globally
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
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

  // Purple sneaky peek — recursive re-trigger
  useEffect(() => {
    if (passwordLength > 0 && showPassword) {
      const schedulePeek = () => {
        const t = setTimeout(() => {
          setIsPeeking(true);
          setTimeout(() => setIsPeeking(false), 800);
        }, 2000 + Math.random() * 3000);
        return t;
      };
      const t = schedulePeek();
      return () => clearTimeout(t);
    }
    setIsPeeking(false);
  }, [passwordLength, showPassword, isPeeking]);

  // Per-character position calculation
  const purplePos = calculatePosition(mouseX, mouseY, purpleRef);
  const grayPos = calculatePosition(mouseX, mouseY, grayRef);
  const orangePos = calculatePosition(mouseX, mouseY, orangeRef);
  const yellowPos = calculatePosition(mouseX, mouseY, yellowRef);

  return (
    <>
      <style>{SHAKE_KEYFRAMES}</style>

      {/* Container: 260x190, characters grounded at bottom */}
      <div
        className="relative select-none"
        style={{
          width: 260,
          height: 190,
          animation: submitting ? 'shake 0.12s infinite' : undefined,
        }}
      >
        {/* Purple — back-left (origin: left 70, width 180 → scaled 33, 85) */}
        <div ref={purpleRef} className="absolute bottom-0" style={{ left: 33 }}>
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
            mouseX={mouseX}
            mouseY={mouseY}
          />
        </div>
        {/* Gray — back-right (origin: left 240, width 120 → scaled 113, 57) */}
        <div ref={grayRef} className="absolute bottom-0" style={{ left: 113 }}>
          <Gray
            isTyping={isTyping}
            showPassword={showPassword}
            passwordLength={passwordLength}
            isBlinking={blink2}
            isLookingAtEachOther={isLookingAtEachOther}
            bodySkew={grayPos.bodySkew}
            faceX={grayPos.faceX}
            faceY={grayPos.faceY}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        </div>
        {/* Orange — front-left (origin: left 0, width 240 → scaled 0, 114) */}
        <div ref={orangeRef} className="absolute bottom-0" style={{ left: 0 }}>
          <Orange
            showPassword={showPassword}
            passwordLength={passwordLength}
            bodySkew={orangePos.bodySkew}
            faceX={orangePos.faceX}
            faceY={orangePos.faceY}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        </div>
        {/* Yellow — front-right (origin: left 310, width 140 → scaled 147, 66) */}
        <div ref={yellowRef} className="absolute bottom-0" style={{ left: 147 }}>
          <Yellow
            showPassword={showPassword}
            passwordLength={passwordLength}
            bodySkew={yellowPos.bodySkew}
            faceX={yellowPos.faceX}
            faceY={yellowPos.faceY}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        </div>
      </div>
    </>
  );
}
