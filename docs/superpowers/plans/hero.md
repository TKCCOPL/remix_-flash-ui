import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2 } from 'lucide-react';

// --- 背景重复图案 SVG (适配亮色主题) ---
const patternSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="240" height="100">
    <text x="10" y="60" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="42" font-weight="900" fill="rgba(0,0,0,0.03)" letter-spacing="4">MIMO</text>
  </svg>
`);

const PATTERN_STYLE = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,${patternSvg}")`,
  backgroundSize: '240px 100px',
};

// --- Canvas 流体 Blob 类 ---
class Blob {
  constructor(x, y, size, lag, orbitRadius = 0, orbitSpeed = 0) {
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

  update(pointerX, pointerY) {
    this.angle += this.orbitSpeed;
    const offsetX = Math.cos(this.angle) * this.orbitRadius;
    const offsetY = Math.sin(this.angle) * this.orbitRadius;

    this.targetX = pointerX + offsetX;
    this.targetY = pointerY + offsetY;

    this.x += (this.targetX - this.x) * this.lag;
    this.y += (this.targetY - this.y) * this.lag;
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.fillStyle = '#ffffff'; 
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- Gemini API 助手组件 ---
function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi there! I'm Alex's AI clone. What would you like to know about his work, engineering, or design?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 自动滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Gemini API 密钥由运行环境注入
      const apiKey = ""; 
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      
      const systemPrompt = "You are Alex's AI assistant on his personal blog. Alex is a software engineer and designer who builds thoughtful software and interfaces. Answer questions politely, concisely, and stay in character. If asked something unrelated, gently steer the conversation back to tech, design, or Alex's blog.";

      const payload = {
        contents: [{ parts: [{ text: userText }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      // 指数退避重试机制
      const delays = [1000, 2000, 4000, 8000, 16000];
      let responseData = null;

      for (let i = 0; i < 5; i++) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          responseData = await response.json();
          break; // 成功则跳出循环
        } catch (error) {
          if (i === 4) throw error; // 最后一次尝试仍然失败
          await new Promise(resolve => setTimeout(resolve, delays[i]));
        }
      }

      const aiText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || "Oops, my circuits are a bit scrambled right now. Try again later!";
      
      setMessages(prev => [...prev, { role: 'assistant', text: aiText }]);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting to my brain. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-black text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <Sparkles size={20} className="text-white" />
        <span className="font-semibold pr-1">Ask AI</span>
      </button>

      {/* 聊天窗口 */}
      <div 
        className={`fixed bottom-6 right-6 z-50 w-[350px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        {/* Header */}
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Alex's AI Clone</h3>
              <p className="text-xs text-slate-500">Powered by Gemini ✨</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 h-[400px] overflow-y-auto flex flex-col gap-3 bg-white">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-black text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-3 bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full pl-4 pr-1 py-1"
          >
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about my projects..."
              className="flex-1 bg-transparent text-sm focus:outline-none text-slate-800"
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="p-2 bg-black text-white rounded-full disabled:opacity-50 transition-opacity hover:opacity-80"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

// --- 主应用组件 ---
export default function App() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
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

    let pointerX = width * 0.7;
    let pointerY = height * 0.6;

    const handlePointerMove = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      pointerX = clientX - rect.left;
      pointerY = clientY - rect.top;
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('touchmove', handlePointerMove, { passive: true });

    const blobs = isMobile
      ? [
          new Blob(pointerX, pointerY, 80, 0.15),
          new Blob(pointerX, pointerY, 120, 0.08, 30, 0.05)
        ]
      : [
          new Blob(pointerX, pointerY, 120, 0.25),
          new Blob(pointerX, pointerY, 180, 0.12),
          new Blob(pointerX, pointerY, 220, 0.06),
          new Blob(pointerX, pointerY, 140, 0.08, 60, 0.03)
        ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      blobs.forEach(blob => {
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
    if (prefersReducedMotion) {
      window.addEventListener('resize', render);
    }

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', render);
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('touchmove', handlePointerMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMobile]);

  return (
    <div 
      ref={containerRef}
      className="relative min-h-screen bg-white text-slate-900 overflow-hidden font-sans flex flex-col selection:bg-black selection:text-white"
    >
      {/* 隐藏的 SVG 滤镜，用于 Canvas 的 Metaball 流体效果 */}
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

      <style>{`
        @keyframes fadeUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fadeUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        
        .canvas-fluid-mask {
          filter: url(#fluid-mask);
          mix-blend-mode: difference;
        }
      `}</style>

      {/* 第一层：背景文字排版图案 */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-80"
        style={PATTERN_STYLE}
      />

      {/* 第二层：主文本区域 */}
      <div className="relative z-20 flex flex-col h-full min-h-screen pointer-events-none">
        <main className="flex-1 flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto w-full pb-20">
          <h1 className="opacity-0 animate-fade-up delay-200 text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-6">
            Hi, I am Alex
            <br />
            welcome to my blog
          </h1>
          <p className="opacity-0 animate-fade-up delay-300 max-w-2xl text-lg md:text-xl text-slate-600 mb-10 font-medium leading-relaxed">
            I'm a software engineer and designer. This is where I share my explorations in building thoughtful software and interfaces.
          </p>
        </main>
      </div>

      {/* 第三层：交互遮罩层 (最顶层背景) */}
      <canvas 
        ref={canvasRef} 
        className="canvas-fluid-mask absolute inset-0 z-30 pointer-events-none"
      />

      {/* 第四层：Gemini AI 聊天组件 (拥有更高的 z-index，位于遮罩层之上) */}
      <AIAssistant />
    </div>
  );
}