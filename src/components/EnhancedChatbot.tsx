import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, Lightbulb, TrendingUp, Target } from 'lucide-react';


import { SustainabilityMetrics } from '../types/sustainability';

interface EnhancedChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  analysisData: SustainabilityMetrics | null;
  onFileUpload: (files: File[]) => Promise<void>;
}

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
  suggestions?: string[];
  metrics?: {
    value: number;
    unit: string;
    change: string;
  };
}

export const EnhancedChatbot: React.FC<EnhancedChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI sustainability advisor. I can help you understand your environmental data, suggest cost-effective improvements, and answer questions about ESG reporting. What would you like to explore?",
      isBot: true,
      timestamp: new Date(),
      suggestions: [
        "Upload a new report",
        "Analyze my energy trends",
        "Cost-effective carbon reduction tips",
        "Explain my ESG score",
        "Water conservation strategies"
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Store extracted PDF text
  const [pdfText, setPdfText] = useState<string | null>(null);

  // On mount, check for PDF in localStorage (from Upload section)

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // No longer auto-summarize on analysisData; Q&A is now based on plain PDF text only.

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setIsTyping(true);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          text: `Uploading and extracting text from ${event.target.files?.[0]?.name ?? ''}... This may take a moment.`,
          isBot: true,
          timestamp: new Date()
        }
      ]);
      const file = event.target.files[0];
      // Upload PDF and extract plain text
      const formData = new FormData();
      formData.append('file', file);
      try {
        const response = await fetch('https://sustainability-analyzer.onrender.com/api/analyze-sustainability-report', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) throw new Error('Failed to extract text from PDF');
        const text = await response.text();
        setPdfText(text);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            text: 'PDF uploaded and text extracted. You can now ask questions about the document.',
            isBot: true,
            timestamp: new Date()
          }
        ]);
      } catch (error) {
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            text: 'Failed to extract text from PDF. Please try another file.',
            isBot: true,
            timestamp: new Date()
          }
        ]);
        setPdfText(null);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // New: Send question and analysisData to backend and display real answer
  const sendQuestionToBackend = async (userMessage: string) => {
    if (!pdfText) {
      return {
        id: Date.now().toString(),
        text: "Please upload a PDF report first.",
        isBot: true,
        timestamp: new Date()
      };
    }
    try {
      const response = await fetch('https://sustainability-analyzer-backend.onrender.com/api/chat-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userQuestion: userMessage, pdfText }),
      });
      if (!response.ok) throw new Error('Failed to get answer from backend');
      const data = await response.json();
      return {
        id: Date.now().toString(),
        text: data.answer || 'Sorry, I could not find an answer in the PDF.',
        isBot: true,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        id: Date.now().toString(),
        text: 'Sorry, there was an error contacting the backend. Please try again later.',
        isBot: true,
        timestamp: new Date()
      };
    }
  };

  // Old hardcoded Q&A logic removed. All user questions are now sent to the backend for answers.

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    setIsTyping(true);
    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      isBot: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    try {
      const response = await sendQuestionToBackend(inputText);
      setMessages(prev => [...prev, response]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end p-4 z-50"
      >
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-white rounded-lg shadow-2xl w-full max-w-lg h-[600px] flex flex-col"
        >
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <span className="font-semibold">AI Sustainability Advisor</span>
                <p className="text-xs text-green-100">Powered by advanced ESG analytics</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[85%] ${message.isBot ? '' : 'flex-row-reverse space-x-reverse'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.isBot ? 'bg-green-600' : 'bg-blue-600'
                      }`}>
                      {message.isBot ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
                    </div>
                    <div className={`rounded-lg p-3 ${message.isBot
                      ? 'bg-gray-50 text-gray-900 border border-gray-200'
                      : 'bg-blue-600 text-white'
                      }`}>
                      <div className="text-sm whitespace-pre-wrap">{message.text}</div>

                      {/* Metrics Display */}
                      {message.metrics && (
                        <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Current Value</span>
                            <span className="text-xs text-gray-500">Change</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">
                              {message.metrics.value.toLocaleString()} {message.metrics.unit}
                            </span>
                            <span className={`text-sm font-medium ${message.metrics.change.startsWith('+') ? 'text-red-500' : 'text-green-500'
                              }`}>
                              {message.metrics.change}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {message.suggestions && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-gray-500 mb-2">💡 Try asking:</p>
                          {message.suggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              onClick={() => handleSuggestionClick(suggestion)}
                              className="block w-full text-left text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 rounded transition-colors"
                            >
                              • {suggestion}
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex items-start space-x-2 max-w-xs">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Analyzing your data...</p>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Enhanced Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about energy trends, cost savings, ESG scores..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                onClick={handleUploadClick}
                className="bg-gray-200 text-gray-700 p-2 rounded-lg hover:bg-gray-300 transition-colors text-sm whitespace-nowrap"
                title="Upload a PDF report for analysis"
              >
                Upload PDF
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Lightbulb className="h-3 w-3" />
                <span>Smart insights</span>
              </div>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-3 w-3" />
                <span>Trend analysis</span>
              </div>
              <div className="flex items-center space-x-1">
                <Target className="h-3 w-3" />
                <span>Goal tracking</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};