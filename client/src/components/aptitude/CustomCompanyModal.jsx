import React, { useState } from 'react';
import { X, Building2, Sliders, Play, Sparkles, Layers } from 'lucide-react';

export const CustomCompanyModal = ({ isOpen, onClose, onLaunchCustomTest }) => {
  const [companyName, setCompanyName] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('All Topics');
  const [questionCount, setQuestionCount] = useState(15);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [negativeMarking, setNegativeMarking] = useState(0.25);
  const [difficulty, setDifficulty] = useState('Medium');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      alert('Please enter a target company name.');
      return;
    }

    onLaunchCustomTest({
      company: companyName.trim(),
      topic: selectedTopic,
      difficulty,
      testMode: 'full_mock',
      questionCount: Number(questionCount),
      negativeMarking: Number(negativeMarking),
      timeLimitMinutes: Number(durationMinutes),
      isVerifiedPattern: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1E1B]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FDFBF3] w-full max-w-lg rounded-3xl border-2 border-[#0F1E1B] editorial-shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b-2 border-[#0F1E1B]/15 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#0F1E1B] text-[#FDFBF3] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#F5D90A]" />
            </span>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif-headline text-lg font-black text-[#0F1E1B]">
                  Configure Target Company Exam
                </h3>
              </div>
              <p className="text-[11px] text-[#0F1E1B]/60 font-semibold">
                Practice Simulation • Configurable Question Bank
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#0F1E1B]/60 hover:text-[#0F1E1B] hover:bg-[#F5F2E6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start space-x-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              This configurable assessment will generate a tailored simulation drawing from verified question banks and standardized campus recruitment standards.
            </p>
          </div>

          {/* Company Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0F1E1B] uppercase">Target Company Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Cisco, Amazon, Mindtree, Oracle, LTI..."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
            />
          </div>

          {/* Focus Topic */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-[#0F1E1B] uppercase">Primary Category Focus</label>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
            >
              <option value="All Topics">All Comprehensive Sections (Quant + Logic + Verbal)</option>
              <option value="Quantitative Aptitude">Quantitative Aptitude</option>
              <option value="Logical Reasoning">Logical Reasoning</option>
              <option value="Verbal Ability">Verbal Ability</option>
              <option value="Pseudocode">Pseudocode Tracing</option>
              <option value="Programming">Programming Technical MCQs</option>
            </select>
          </div>

          {/* Question Count & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F1E1B] uppercase">Question Count</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value={10}>10 Questions</option>
                <option value={15}>15 Questions</option>
                <option value={20}>20 Questions (Standard Mock)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F1E1B] uppercase">Duration (Minutes)</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
              </select>
            </div>
          </div>

          {/* Difficulty & Negative Marking */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F1E1B] uppercase">Difficulty Level</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium (Campus Standard)</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#0F1E1B] uppercase">Negative Marking</label>
              <select
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-[#0F1E1B] bg-white text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
              >
                <option value={0}>No Negative Marking</option>
                <option value={0.25}>-0.25 Marks per Error</option>
                <option value={0.33}>-0.33 Marks per Error</option>
              </select>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-[#0F1E1B]/15 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#0F1E1B]/70 hover:bg-[#F5F2E6]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#C1440E] hover:bg-[#A3370B] text-white px-5 py-2.5 rounded-xl text-xs font-bold border-2 border-[#0F1E1B] editorial-shadow-sm flex items-center space-x-1.5 transition-transform hover:scale-102"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Custom Assessment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomCompanyModal;

