import { useEffect, useRef, useState } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2 } from 'lucide-react';

function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi there! I'm Alex's AI clone. What would you like to know about his work, engineering, or design?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
      const apiKey = process.env.GEMINI_API_KEY as string;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

      const systemPrompt = "You are Alex's AI assistant on his personal blog. Alex is a software engineer and designer who builds thoughtful software and interfaces. Answer questions politely, concisely, and stay in character. If asked something unrelated, gently steer the conversation back to tech, design, or Alex's blog.";

      const payload = {
        contents: [{ parts: [{ text: userText }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      const delays = [1000, 2000, 4000, 8000, 16000];
      let responseData: any = null;

      for (let i = 0; i < 5; i++) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          responseData = await response.json();
          break;
        } catch {
          if (i === 4) throw new Error('Max retries reached');
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
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 bg-black text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
      >
        <Sparkles size={20} className="text-white" />
        <span className="font-semibold pr-1">Ask AI</span>
      </button>

      <div
        className={`fixed bottom-6 right-6 z-50 w-[350px] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
      >
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Alex's AI Clone</h3>
              <p className="text-xs text-slate-500">Powered by Gemini</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={20} />
          </button>
        </div>

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

export default AIAssistant;
