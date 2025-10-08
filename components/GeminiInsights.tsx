
import React from 'react';
import { SparklesIcon } from './icons';

interface GeminiInsightsProps {
  insight: string;
}

// A simple markdown to HTML converter
const formatInsight = (text: string) => {
  if (!text) return { __html: '<p class="text-gray-400">Generating insights...</p>' };

  const html = text
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-blue-400 mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-extrabold text-white mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
    .replace(/\n\s*-\s(.*)/g, '<li class="ml-6 list-disc">$1</li>')
    .replace(/<li>/g, (match, offset, fullText) => {
        // Wrap li in ul if not already wrapped
        return fullText.slice(offset - 5, offset) !== '<ul>' ? '<ul><li>' : '<li>'
    })
    .replace(/<\/li>(?!.*<li>)/g, '</li></ul>')
    .replace(/\n/g, '<br />')
    .replace(/<\/ul><br \/><ul>/g, ''); // Fix extra space between list items

  return { __html: html };
};

const GeminiInsights: React.FC<GeminiInsightsProps> = ({ insight }) => {
  return (
    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700 h-full">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <SparklesIcon className="w-6 h-6 text-yellow-400" />
        AI-Powered Insights
      </h2>
      <div className="prose prose-invert prose-sm max-w-none text-gray-300 space-y-3"
           dangerouslySetInnerHTML={formatInsight(insight)}
      >
      </div>
      <p className="text-xs text-gray-500 mt-6 text-right">Powered by Google Gemini</p>
    </div>
  );
};

export default GeminiInsights;
