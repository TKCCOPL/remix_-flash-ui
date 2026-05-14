import { useEffect, useRef, useState } from 'react';

const patternSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="240" height="100">
    <text x="10" y="60" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="42" font-weight="900" fill="rgba(0,0,0,0.03)" letter-spacing="4">MIMO</text>
  </svg>
`);

const PATTERN_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,${patternSvg}")`,
  backgroundSize: '240px 100px',
};

class Blob {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  lag: number;
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;

  constructor(x: number, y: number, size: number, lag: number, orbitRadius = 0, orbitSpeed = 0) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.size = size;
    this.lag = lag;
    this.orbitRadius = orbitRadius;
    this.orbitSpeed = orbitSpeed;
    this.angle = Math.random() * Math.PI * 2;
  }

  update(pointerX: number, pointerY: number) {
    this.angle += this.orbitSpeed;
    const offsetX = Math.cos(this.angle) * this.orbitRadius;
    const offsetY = Math.sin(this.angle) * this.orbitRadius;
    this.targetX = pointerX + offsetX;
    this.targetY = pointerY + offsetY;
    this.x += (this.targetX - this.x) * this.lag;
    this.y += (this.targetY - this.y) * this.lag;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

type Props = { title: string; subtitle: string; titleLine2?: string };

export default function HeroCanvas({ title, subtitle, titleLine2 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = container.offsetWidth;
    let height = container.offsetHeight;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReducedMotion(prefersReducedMotion);

    const resize = () => {
      width = container.offsetWidth;
      height = container.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      setIsMobile(width < 768);
    };
    window.addEventListener('resize', resize);
    resize();

    let pointerX = width * 0.5;
    let pointerY = height * 0.5;

    const handlePointerMove = (e: PointerEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      pointerX = clientX - rect.left;
      pointerY = clientY - rect.top;
    };

    container.addEventListener('pointermove', handlePointerMove);

    const blobs = isMobile
      ? [
          new Blob(pointerX, pointerY, 160, 0.2),
          new Blob(pointerX, pointerY, 240, 0.1, 40, 0.04),
        ]
      : [
          new Blob(pointerX, pointerY, 200, 0.35),
          new Blob(pointerX, pointerY, 300, 0.18),
          new Blob(pointerX, pointerY, 380, 0.08),
          new Blob(pointerX, pointerY, 240, 0.12, 100, 0.03),
        ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      blobs.forEach((blob) => {
        if (!prefersReducedMotion) {
          blob.update(pointerX, pointerY);
        } else {
          blob.update(width * 0.8, height * 0.7);
        }
        blob.draw(ctx);
      });

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      container.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMobile]);

  return (
    <div
      ref={containerRef}
      className="hero-canvas-container"
    >
      {/* SVG filter for metaball fluid effect */}
      <svg className="hidden">
        <defs>
          <filter id="fluid-mask">
            <feGaussianBlur in="SourceGraphic" stdDeviation="16" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="
                1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 40 -15"
              result="fluid-mask"
            />
          </filter>
        </defs>
      </svg>

      {/* Layer 1: Background typography pattern */}
      <div
        className="hero-canvas-pattern"
        style={PATTERN_STYLE}
      />

      {/* Layer 2: Hero text */}
      <div className="hero-canvas-text">
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto w-full">
          <h1 className="hero-canvas-title">
            {title}
            {titleLine2 && (
              <>
                <br />
                {titleLine2}
              </>
            )}
          </h1>
          <p className="hero-canvas-subtitle">
            {subtitle}
          </p>
        </main>
      </div>

      {/* Layer 3: Canvas fluid mask (top layer) */}
      <canvas
        ref={canvasRef}
        className="hero-canvas-fluid"
      />
    </div>
  );
}
