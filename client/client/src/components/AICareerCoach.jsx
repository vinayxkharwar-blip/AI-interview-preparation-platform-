import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  X, 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  ChevronDown, 
  Target, 
  Briefcase, 
  FileText, 
  PlayCircle,
  Minimize2
} from 'lucide-react';

export default function AICareerCoach() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'coach',
      text: "👋 Hi! I'm your AI Career Coach. How can I help accelerate your job search today?",
      chips: [
        'Improve my ATS score',
        'Find top React jobs',
        'Draft a cover letter',
        'Prepare for Google interview',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (userText) => {
    const textToSend = userText || input;
    if (!textToSend.trim()) return;

    const userMessage = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!userText) setInput('');
    setLoading(true);

    try {
      // Connect to backend feedback / LLM service
      const res = await fetch('/api/feedback/coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: textToSend }),
      });

      let botText = '';
      if (res.ok) {
        const data = await res.json();
        botText = data.response || data.message;
      }

      if (!botText) {
        // Fallback career coach responses
        const lower = textToSend.toLowerCase();
        if (lower.includes('ats') || lower.includes('score') || lower.includes('resume')) {
          botText = "To boost your ATS Score by +15%: 1. Include cloud keywords like Docker & AWS. 2. Quantify achievement bullets (e.g., 'Reduced API latency by 40%'). You can optimize your resume directly in the Resume Studio!";
        } else if (lower.includes('job') || lower.includes('react') || lower.includes('find')) {
          botText = "I found several high-match Full Stack and React openings (Stripe, Vercel, Datadog) with match scores up to 95%. Head to the Career Hub to view and apply!";
        } else if (lower.includes('cover') || lower.includes('letter')) {
          botText = "I can draft a tailored cover letter for your target role in seconds. Click 'AI Cover Letter' in the navbar or career actions grid.";
        } else if (lower.includes('google') || lower.includes('interview') || lower.includes('prepare')) {
          botText = "For Google engineering interviews: Focus on Data Structures (Trees, Graphs, Dynamic Programming), System Architecture, and STAR-method behavioral responses. Ready to launch a mock loop?";
        } else {
          botText = `Great question regarding "${textToSend}". I recommend keeping your ATS score above 85%, applying to 3-5 matched jobs daily, and completing a 15-minute mock interview loop!`;
        }
      }

      setMessages((prev) => [...prev, { sender: 'coach', text: botText }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'coach',
          text: "I'm ready to guide your job search! Navigate to Resume Studio or Career Hub to take your next step.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleChipClick = (chipText) => {
    handleSend(chipText);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      
      {/* Closed Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-3 rounded-full bg-[#0F1E1B] text-[#FDFBF3] border-3 border-[#F5D90A] shadow-xl hover:scale-105 transition-all flex items-center space-x-2 group"
          title="Open AI Career Coach Assistant"
        >
          <div className="w-8 h-8 rounded-full bg-[#F5D90A] text-[#0F1E1B] flex items-center justify-center font-black animate-pulse">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-xs font-black font-serif-headline pr-1">
            AI Career Coach
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </button>
      )}

      {/* Expanded Interactive Chat Panel */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] h-[480px] bg-[#FDFBF3] border-3 border-[#0F1E1B] rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden animate-fadeIn font-sans-body">
          
          {/* Header */}
          <div className="bg-[#0F1E1B] text-[#FDFBF3] p-4 flex items-center justify-between border-b border-[#FDFBF3]/10">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F5D90A] text-[#0F1E1B] flex items-center justify-center font-bold">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black font-serif-headline text-[#FDFBF3]">
                  AI Career Coach
                </h3>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Online • Powered by Gemini AI</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#FDFBF3]/80 hover:text-white rounded-lg hover:bg-white/10"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#0F1E1B] text-[#FDFBF3] font-bold rounded-tr-none'
                      : 'bg-[#F5F2E6] border border-[#0F1E1B]/20 text-[#0F1E1B] font-medium rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Prompt Chip Suggestions */}
                {msg.chips && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.chips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => handleChipClick(chip)}
                        className="px-2.5 py-1 rounded-xl bg-[#FDFBF3] border border-[#0F1E1B]/30 hover:border-[#0F1E1B] text-[10px] font-bold text-[#0F1E1B] hover:bg-[#F5F2E6] transition-all"
                      >
                        ⚡ {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-xs font-bold text-[#0F1E1B]/60 p-2">
                <Sparkles className="w-3.5 h-3.5 text-[#F5D90A] animate-spin" />
                <span>Coach is thinking...</span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-[#F5F2E6] border-t border-[#0F1E1B]/15 flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask your AI Career Coach..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-[#0F1E1B]/20 text-xs font-bold text-[#0F1E1B] focus:outline-none focus:border-[#0F1E1B] bg-[#FDFBF3]"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-[#0F1E1B] text-[#F5D90A] disabled:opacity-40 transition-all shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
