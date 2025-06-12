"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";
import AnalyseReportButton from "./components/AnalyseReportButton";

/**
 * Home page for the AgentKit Quickstart
 *
 * @returns {React.ReactNode} The home page
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking, swapStatus, detailedSwapLogs, showCelebration, setShowCelebration, showAnalyseButton } = useAgent();
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

  const handleCheckBalance = async () => {
    setShowCelebration(false); // Hide celebration overlay
    await sendMessage("Check my wallet balance for all listed tokens");
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false); // Close the celebration overlay
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-[#121212]">
      {/* Main container to hold the LLM logo, chat interface, and user logo side-by-side */}
      <div className="flex items-center justify-center w-full h-full p-4">
        <div className="w-[90%] max-w-4xl h-[80vh] bg-[#1E1E1E] rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-800 relative">
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center">
            {/* LLM Logo - Left side of the Hooman text */}
            <img src="/llm.png" alt="LLM Profile" className="w-10 h-10 rounded-full mr-3 object-cover" />
            <h1 className="text-xl font-semibold text-white">Hooman</h1>
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
                      code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || "");
                        return !className ? (
                          <code className="bg-gray-800 text-gray-200 px-1 py-0.5 rounded" {...props}>
                            {children}
                          </code>
                        ) : (
                          <div className="bg-gray-800 rounded-md p-4 my-2 overflow-x-auto">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </div>
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

          {/* After the chat messages and before the input box */}
          {showAnalyseButton && <AnalyseReportButton />}

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
            <img src="/user.png" alt="User Profile" className="w-10 h-10 rounded-full ml-3 object-cover" />
          </div>
        </div>

        {/* Celebration Overlay - This remains a direct child of the main chat container, so it covers it */}
        {showCelebration && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 rounded-2xl w-full h-full"
            style={{ backgroundImage: `url('/celebration.gif')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="p-8 rounded-lg text-center relative">
              <button
                onClick={handleCloseCelebration}
                className="absolute top-2 right-2 text-white text-xl font-bold p-2 rounded-full hover:bg-gray-700 focus:outline-none"
              >
                &times;
              </button>
              <h2 className="text-3xl font-bold text-white mb-4">Swap Successful!</h2>
              <button
                // onClick={handleCheckBalance} // Commented out for now
                className="mt-4 px-6 py-3 bg-[#6E41E2] text-white rounded-xl font-medium hover:bg-[#5B35C5] transition-colors"
              >
                Do you want to check swapped token balance?
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: string }) {
  const renderLog = (text: string) => {
    let result = text;
    // Replace "UNI" with UNI logo and ticker
    result = result.replace(/UNI/g, 'UNI <img src="/uni.png" alt="UNI" class="inline-block h-4 w-4 align-middle" />');
    // Replace "USDC" with USDC logo and ticker
    result = result.replace(/USDC/g, 'USDC <img src="/usdc.png" alt="USDC" class="inline-block h-4 w-4 align-middle" />');
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return <>{renderLog(log)}</>;
}
