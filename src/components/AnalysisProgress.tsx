import React from 'react';
import { useStore } from '@/src/store/useStore';
import { getModuleById } from '@/src/lib/module-config';

export function AnalysisProgress() {
  const { analysisProgress, activeModuleId } = useStore();
  const config = getModuleById(activeModuleId);

  const getStep = () => {
    if (analysisProgress < 30) return "Parsing Document Structure...";
    if (analysisProgress < 60) return "Detecting Fillable Sections...";
    if (analysisProgress < 90) return "Building Semantic Intelligence...";
    return "Optimizing Form Layout...";
  };

  return (
    <div className="bg-white border border-gray-100 rounded-[32px] p-10 shadow-xl shadow-gray-200/20 max-w-lg mx-auto text-center space-y-6">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 bg-indigo-50 rounded-full animate-ping opacity-20" />
        <svg className="w-full h-full transform -rotate-90 relative z-10">
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            className="text-gray-50"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            strokeDasharray={2 * Math.PI * 36}
            strokeDashoffset={2 * Math.PI * 36 * (1 - analysisProgress / 100)}
            strokeLinecap="round"
            className="text-indigo-600 transition-all duration-700 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <span className="text-[13px] font-bold text-gray-900">{analysisProgress}%</span>
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-gray-900 tracking-tight">{getStep()}</h3>
        <p className="text-gray-400 text-sm font-medium leading-relaxed px-4">Our AI is mapping semantic fields to your {config.title.toLowerCase()} template for professional automation.</p>
      </div>
    </div>
  );
}
