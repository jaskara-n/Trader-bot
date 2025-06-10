"use client";

import { useState, useEffect, useRef } from "react";
import { useAgent } from "./hooks/useAgent";
import ReactMarkdown from "react-markdown";

/**
 * Home page for the AgentKit Quickstart
 *
 * @returns {React.ReactNode} The home page
 */
export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, isThinking } = useAgent();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to scroll to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const onSendMessage = async () => {
    if (!input.trim() || isThinking) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-screen bg-[#121212]">
      <div className="w-[90%] max-w-4xl h-[90vh] bg-[#1E1E1E] rounded-2xl shadow-lg flex flex-col overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-semibold text-white">Hooman</h1>
        </div>

        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-center">Start by asking me to analyze your smart contracts...</p>
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
            <div className="flex items-center space-x-2 text-gray-400 ml-4">
              <span>Thinking</span>
              <span className="flex space-x-1">
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
        </div>
      </div>
    </div>
  );
}
