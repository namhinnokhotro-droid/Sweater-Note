import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Minus, Maximize2, Sparkles, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGeminiResponse } from '../services/geminiService';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Props {
  context: string;
}

export const AIAgent: React.FC<Props> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hi! I am Misti (মিষ্টি), your cheerful AI assistant! 🌸 How can I help you or make your day brighter? (হাই! আমি মিষ্টি, আপনার প্রাণবন্ত এআই সহকারী! আমি আপনাকে কীভাবে সাহায্য করতে পারি বা আপনার দিনটি আরও সুন্দর করে তুলতে পারি?)',
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastSpokenRef = useRef<number>(0);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Speak latest assistant message if not already spoken
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.timestamp > lastSpokenRef.current && isOpen && !isMinimized) {
      speak(lastMessage.content);
      lastSpokenRef.current = lastMessage.timestamp;
    }
  }, [messages, isOpen, isMinimized]);

  // Handle Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'bn-BD'; // Support Bengali primarily, but it often works for mixed input

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const speak = (text: string) => {
    if (!voiceEnabled) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();

    // Clean text: remove asterisks, hash signs, and other symbols that TTS reads out
    const cleanText = text.replace(/[*#_~`>]/g, ' ').trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Attempt to find a female/appropriate voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Bengali') || v.name.includes('Google US English') || v.name.includes('bn-BD'));
    if (femaleVoice) utterance.voice = femaleVoice;
    
    utterance.pitch = 1.1;
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async (overrideInput?: string) => {
    const messageContent = overrideInput || input;
    if (!messageContent.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await getGeminiResponse(messageContent, context);
      const assistantMessage: Message = {
        role: 'assistant',
        content: response || 'No response received.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-send when speech is finished
  useEffect(() => {
    if (!isListening && input.trim().length > 0 && messages[messages.length-1]?.role !== 'user') {
      handleSend();
    }
  }, [isListening]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-[350px] h-[500px] mb-4 bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 via-indigo-600 to-purple-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/30">
                  <Sparkles size={24} className="text-yellow-200" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Misti AI Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-bold text-indigo-100 italic">Feeling Sweet 🌸</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title={voiceEnabled ? "Mute Voice" : "Unmute Voice"}
                >
                  {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <Minus size={18} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
            >
              {messages.map((msg, idx) => (
                <div
                  key={msg.timestamp}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div
                    className={cn(
                      "p-3 rounded-2xl text-xs font-bold leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-none" 
                        : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[8px] text-slate-400 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 w-fit p-2 rounded-xl border border-indigo-100 italic text-[10px] font-bold">
                  <Loader2 size={12} className="animate-spin" />
                  Misti is thinking... 💭
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 group">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isListening ? "Listening..." : "Ask management advice..."}
                    className={cn(
                      "w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-bold",
                      isListening && "animate-pulse border-indigo-400 text-indigo-600 shadow-lg shadow-indigo-100"
                    )}
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    <Send size={14} />
                  </button>
                </div>
                <button
                  onMouseDown={toggleListening}
                  onMouseUp={toggleListening}
                  onTouchStart={toggleListening}
                  onTouchEnd={toggleListening}
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 select-none",
                    isListening 
                      ? "bg-red-500 text-white animate-bounce shadow-red-200" 
                      : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
                  )}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 opacity-50">
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Hold Mic to Speak (চেপে ধরে কথা বলুন)</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMinimized && isOpen && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => setIsMinimized(false)}
            className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 font-black text-xs hover:bg-indigo-700 transition-all active:scale-95"
          >
            <Bot size={16} />
            Misti is active
            <Maximize2 size={14} />
          </motion.button>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseDown={() => { setIsOpen(true); toggleListening(); }}
          onMouseUp={toggleListening}
          onTouchStart={() => { setIsOpen(true); toggleListening(); }}
          onTouchEnd={toggleListening}
          className={cn(
            "w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center border-2 transition-all relative group select-none",
            isListening 
              ? "bg-red-500 text-white border-red-400 animate-pulse" 
              : "bg-white text-indigo-600 border-indigo-50 hover:bg-indigo-50"
          )}
        >
          {isListening && (
            <span className="absolute -top-12 right-0 bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-xl animate-bounce">
              Listening (শুনছি...)
            </span>
          )}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm ring-2 ring-red-500/20">
            1
          </div>
          {isListening ? <MicOff size={28} /> : <Bot size={28} className="group-hover:rotate-12 transition-transform" />}
          <div className="absolute right-full mr-4 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            Hold to Speak 🎤
          </div>
        </motion.button>
      )}
    </div>
  );
};
