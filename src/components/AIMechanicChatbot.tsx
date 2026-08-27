import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Calendar } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  recommendedService?: string;
  estimatedCost?: number;
  severity?: 'critical' | 'moderate' | 'minor' | 'info';
}

interface AIMechanicChatbotProps {
  onBookService: (serviceName: string, estimatedCost?: number) => void;
}

export const AIMechanicChatbot: React.FC<AIMechanicChatbotProps> = ({ onBookService }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: "👋 G'day! I'm **Adaptivity AI Tech**, your 24/7 master mechanic assistant for Justin & Northlake. How can I help diagnose your vehicle today?",
      timestamp: 'Just now',
      severity: 'info',
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Diagnostic rule engine
  const analyzeDiagnosticInput = (userQuery: string): Omit<ChatMessage, 'id' | 'sender' | 'timestamp'> => {
    const query = userQuery.toLowerCase();

    if (query.includes('brake') || query.includes('squeal') || query.includes('grind') || query.includes('stopping')) {
      return {
        text: "🔍 **Diagnostic Assessment: Brake System Wear**\n\nHigh-pitched squealing or grinding indicates worn ceramic friction pads or rotor grooving. Driving with worn pads can damage calipers and increase stopping distances.",
        recommendedService: 'Front & Rear Heavy-Duty Ceramic Brake Pads & Rotors',
        estimatedCost: 240,
        severity: 'critical',
      };
    }

    if (query.includes('battery') || query.includes('click') || query.includes('start') || query.includes('dead')) {
      return {
        text: "⚡ **Diagnostic Assessment: Battery / Starter Voltage Fault**\n\nA rapid clicking sound when turning the key or pushing start indicates insufficient Cold Cranking Amps (CCA) or corroded terminal connections.",
        recommendedService: 'Mobile Heavy-Duty AGM Battery Swap & Terminal Clean',
        estimatedCost: 195,
        severity: 'moderate',
      };
    }

    if (query.includes('p0300') || query.includes('misfire') || query.includes('rough') || query.includes('shake') || query.includes('check engine')) {
      return {
        text: "⚠️ **OBD-II Code Analysis: P0300 Random Engine Misfire**\n\nCode P0300 indicates unburned fuel escaping into exhaust. Most common causes: worn Iridium spark plugs, failed ignition coil pack, or vacuum leak.",
        recommendedService: 'Full Computer OBD-II Scan + Spark Plug & Coil Pack Service',
        estimatedCost: 210,
        severity: 'critical',
      };
    }

    if (query.includes('oil') || query.includes('maintenance') || query.includes('lube') || query.includes('fluid')) {
      return {
        text: "🛢️ **Diagnostic Assessment: Scheduled Synthetic Oil Service**\n\nModern EcoBoost twin-turbo & V8 engines require Dexos/Ford spec full synthetic oil every 5,000 miles to prevent turbo oil line sludge.",
        recommendedService: 'Full Synthetic Oil Change & 50-Point Multi-Point Inspection',
        estimatedCost: 95,
        severity: 'minor',
      };
    }

    if (query.includes('zip') || query.includes('area') || query.includes('justin') || query.includes('northlake') || query.includes('argyle')) {
      return {
        text: "📍 **Service Coverage Verified: 100% Active in Your Area!**\n\nMobile Tech units are actively dispatched throughout **Justin (76247)**, **Northlake (76226 / 76262)**, **Argyle**, and **Haslet**. We come directly to your home or office driveway!",
        severity: 'info',
      };
    }

    // Default response
    return {
      text: `🔧 **Diagnostic Assessment Received**\n\nBased on "${userQuery}", our ASE Master Techs recommend a 50-Point Mobile Diagnostic Check. We bring full diagnostic scanners directly to your driveway in Justin & Northlake.`,
      recommendedService: 'Comprehensive Mobile 50-Point Computer Diagnostic',
      estimatedCost: 125,
      severity: 'moderate',
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');

    // Simulate AI response delay
    setTimeout(() => {
      const aiResponse = analyzeDiagnosticInput(query);
      const aiMsg: ChatMessage = {
        id: 'msg-' + (Date.now() + 1),
        sender: 'ai',
        ...aiResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 600);
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-20 right-4 sm:right-6 z-50 group bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white p-3.5 rounded-full shadow-2xl shadow-orange-500/40 flex items-center space-x-2 transition-all duration-300 active:scale-95"
      >
        <div className="relative">
          <Bot className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border border-[#0b0c10]"></span>
          </span>
        </div>
        <span className="hidden sm:inline font-heading font-extrabold text-xs pr-1">AI Diagnostic Tech</span>
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-36 md:bottom-32 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] h-[540px] max-h-[calc(100vh-10rem)] bg-[#12141c] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-fadeIn">
          
          {/* Chat Header */}
          <div className="px-5 py-3.5 bg-[#1a1d28] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-sm text-white flex items-center gap-1.5">
                  Adaptivity AI Tech
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active • Master Diagnostic Engine
                </span>
              </div>
            </div>

            <button 
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompt Pills */}
          <div className="px-4 py-2 bg-[#0d0e14] border-b border-white/5 flex items-center space-x-2 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSendMessage("Squealing noise when I step on brakes")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              🔊 Brake Squeal
            </button>
            <button
              onClick={() => handleSendMessage("Check engine light code P0300 misfire")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              ⚠️ Code P0300
            </button>
            <button
              onClick={() => handleSendMessage("Car won't start and battery clicks")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              ⚡ Battery Click
            </button>
            <button
              onClick={() => handleSendMessage("Do you service zip code 76247 Justin TX?")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              📍 Zip 76247
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl space-y-2 ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-br-none shadow'
                      : 'bg-slate-900 border border-white/10 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* AI Service Recommendation Box */}
                  {msg.recommendedService && (
                    <div className="mt-3 bg-slate-950/90 border border-orange-500/30 p-3 rounded-xl space-y-2 text-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-extrabold text-orange-400 tracking-wider">Recommended Service</span>
                        {msg.estimatedCost && (
                          <span className="font-bold text-emerald-400 font-mono">${msg.estimatedCost}</span>
                        )}
                      </div>
                      <h4 className="font-bold text-xs text-white">{msg.recommendedService}</h4>

                      <button
                        onClick={() => {
                          setIsOpen(false);
                          onBookService(msg.recommendedService!, msg.estimatedCost);
                        }}
                        className="w-full mt-1 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 shadow"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Dispatch Mechanic for This Repair</span>
                      </button>
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 block text-right font-mono mt-1">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#161822] border-t border-white/10 flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Describe symptoms or OBD codes..."
              className="flex-grow bg-slate-900 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-9 h-9 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};
