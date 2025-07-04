import React from "react";

export default function AnalyseReportButton({ onClose }: { onClose: () => void }) {
  const openAnalysisReport = () => {
    const baseUrl = process.env.NEXT_PUBLIC_URL;
    if (!baseUrl) {
      console.error("NEXT_PUBLIC_URL is not defined");
      return;
    }
    window.open(`${baseUrl}/analysis`, "_blank");
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center space-x-2">
      <button
        className="px-6 py-3 bg-[#6E41E2] text-white rounded-xl font-medium hover:bg-[#5B35C5] transition-colors"
        onClick={openAnalysisReport}
      >
        Data Report
      </button>
      <button
        onClick={onClose}
        className="text-white text-xl font-bold p-2 rounded-full hover:bg-gray-700 focus:outline-none"
      >
        &times;
      </button>
    </div>
  );
}
