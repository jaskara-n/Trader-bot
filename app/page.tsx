"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";
import AnalyseReportButton from "./components/AnalyseReportButton";
import Image from 'next/image';

/**
 * Home page for the AgentKit Quickstart
 *
 * @returns {React.ReactNode} The home page
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking, swapStatus, detailedSwapLogs, showCelebration, setShowCelebration, showAnalyseButton, setShowAnalyseButton } = useAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const detailedLogsRef = useRef<HTMLDivElement>(null);

  // Function to scroll to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // New function to scroll detailed logs to the bottom
  const scrollToDetailedLogsBottom = () => {
    if (detailedLogsRef.current) {
      detailedLogsRef.current.scrollTop = detailedLogsRef.current.scrollHeight;
    }
  };

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll whenever detailedSwapLogs change
  useEffect(() => {
    scrollToDetailedLogsBottom();
  }, [detailedSwapLogs]);

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false); // Close the celebration overlay
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-[#121212]">
      {/* Project Logo and HooMind text in the top-left corner */}
      <div className="absolute top-4 left-4 flex items-center space-x-2">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="HooMind Logo" className="w-8 h-8" width={32} height={32} />
          <span className="text-white text-3xl font-extrabold tracking-tight">
            <span className="text-[#8b5cf6]">H</span>oo<span className="text-[#8b5cf6]">M</span>ind
          </span>
        </div>
      </div>

      {/* Main container to hold the LLM logo, chat interface, and user logo side-by-side */}
      <div className="flex items-center justify-center w-full h-full p-4">
        <div className="w-[95%] max-w-5xl h-[90vh] bg-[#1E1E1E] rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-800 relative">
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center">
            {/* LLM Logo - Left side of the Hooman text */}
            <Image 
              src="/llm.png"
              alt="LLM Profile"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full mr-3 object-cover"
            />
          </div>

          {/* Status Bar */}
          {swapStatus && (
            <div className="px-4 py-2 bg-[#2A2A2A] border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-gray-300">{swapStatus}</span>
              </div>
            </div>
          )}

        {/* Chat Messages */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent relative">
          {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-center">DeFi meets intelligence — ask me to optimize, invest, and grow your crypto portfolio</p>
              </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                  className={`p-4 rounded-2xl max-w-[80%] ${
                    msg.sender === "user" ? "bg-[#6E41E2] text-white ml-auto" : "bg-[#2A2A2A] text-gray-200 mr-auto"
                }`}
              >
                <ReactMarkdown
                  components={{
                      a: (props) => (
                      <a
                        {...props}
                          className="text-purple-300 underline hover:text-purple-200"
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    ),
                      code: ({ className, children, ...props }) => {
                        return (
                          <code className={className || "bg-gray-800 text-gray-200 px-1 py-0.5 rounded"} {...props}>
                            {children}
                          </code>
                        );
                      },
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              </div>
            ))
          )}

          {/* Thinking Indicator */}
            {isThinking && (
              <div className="flex flex-col items-start space-y-2 text-gray-400">
                {detailedSwapLogs.length > 0 ? (
                  <div
                    ref={detailedLogsRef}
                    className="w-full max-h-48 overflow-y-auto bg-[#2A2A2A] rounded-md p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                  >
                    {detailedSwapLogs.map((log, logIndex) => (
                      <p key={logIndex} className="text-base text-gray-300">
                        <LogEntry log={log} />
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400">{swapStatus || "Thinking"}</p>
                )}
                <span className="flex space-x-1 mt-2">
                  <span
                    className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: "0ms" }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"
                    style={{ animationDelay: "600ms" }}
                  ></span>
                </span>
              </div>
            )}

          {/* Invisible div to track the bottom */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Box */}
          <div className="p-4 border-t border-gray-800 flex items-center space-x-2">
          <input
            type="text"
              className="flex-grow p-3 rounded-xl bg-[#2A2A2A] border border-gray-700 text-white focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Type your message..."
            value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSendMessage()}
            disabled={isThinking}
          />
          <button
            onClick={onSendMessage}
              className={`px-6 py-3 rounded-xl font-medium transition-all ${
                isThinking ? "bg-gray-700 cursor-not-allowed text-gray-500" : "bg-[#6E41E2] hover:bg-[#5B35C5] text-white"
            }`}
            disabled={isThinking}
          >
            Send
          </button>
            {/* User Logo - Right side of the send button */}
            <Image 
              src="/user.png"
              alt="User Profile"
              width={40}
              height={40}
              className="w-10 h-10 rounded-full ml-3 object-cover"
            />
          </div>

          {/* Celebration Overlay - Moved back inside the chat interface to confine it */}
          {showCelebration && (
            <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
                 style={{ backgroundImage: `url('/celebration.gif')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="p-8 rounded-lg text-center relative">
                <h2 className="text-3xl font-bold text-white mb-4">Swap Successful!</h2>
                <button
                  onClick={handleCloseCelebration}
                  className="mt-4 px-6 py-3 bg-[#6E41E2] text-white rounded-xl font-medium hover:bg-[#5B35C5] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Data Report Button - Top right corner of the page */}
      {showAnalyseButton && (
        <AnalyseReportButton onClose={() => setShowAnalyseButton(false)} />
      )}
    </div>
  );
}

function LogEntry({ log }: { log: string }) {
  const renderLog = (text: string) => {
    let result = text;
    // Replace "UNI" with UNI logo and ticker
    result = result.replace(/UNI/g, 'UNI <Image src="/uni.png" alt="UNI" className="inline-block h-4 w-4 align-middle" width={16} height={16} />');
    // Replace "USDC" with USDC logo and ticker
    result = result.replace(/USDC/g, 'USDC <Image src="/usdc.png" alt="USDC" className="inline-block h-4 w-4 align-middle" width={16} height={16} />');
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return <>{renderLog(log)}</>;
}
