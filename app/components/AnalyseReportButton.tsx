import React from "react";

export default function AnalyseReportButton() {
  const openChatInNewTab = () => {
    window.open("http://localhost:3000/analysis", "_blank"); 
  };

  return (
    <button
      className="mt-4 w-full px-6 py-3 bg-[#6E41E2] text-white rounded-xl font-medium hover:bg-[#5B35C5] transition-colors"
      onClick={openChatInNewTab}
    >
      Analyse Report
    </button>
  );
}
