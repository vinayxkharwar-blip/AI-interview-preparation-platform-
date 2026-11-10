import React, { useState, useEffect } from 'react';
import {
  Calculator,
  BrainCircuit,
  BookOpen,
  Binary,
  Code2,
  Search,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Filter,
  Play
} from 'lucide-react';
import { getAptitudeCategories } from '../../api/aptitudePYQApi';

export const TopicPracticeTab = ({ onStartDrill, actionLoading }) => {
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Quantitative Aptitude');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All Difficulties');
  const [questionCount, setQuestionCount] = useState(10);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const res = await getAptitudeCategories();
      setCategoriesData(res.categories || []);
    } catch (err) {
      console.warn('Failed to load aptitude categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (catName) => {
    switch (catName) {
      case 'Quantitative Aptitude':
        return <Calculator className="w-4 h-4 text-emerald-600" />;
      case 'Logical Reasoning':
        return <BrainCircuit className="w-4 h-4 text-indigo-600" />;
      case 'Verbal Ability':
        return <BookOpen className="w-4 h-4 text-amber-600" />;
      case 'Pseudocode':
        return <Binary className="w-4 h-4 text-cyan-600" />;
      case 'Programming':
        return <Code2 className="w-4 h-4 text-rose-600" />;
      default:
        return <Calculator className="w-4 h-4 text-[#C1440E]" />;
    }
  };

  const currentCategoryData = categoriesData.find((c) => c.category === selectedCategory);
  const rawSubtopics = currentCategoryData?.subtopics || [];

  const filteredSubtopics = rawSubtopics.filter((st) => {
    const name = typeof st === 'string' ? st : st.name;
    if (searchQuery.trim() && !name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }
    return true;
  });

  const handleLaunchSubtopic = (subtopicName) => {
    onStartDrill({
      company: 'General Aptitude',
      topic: selectedCategory,
      subtopic: subtopicName,
      difficulty: selectedDifficulty === 'All Difficulties' ? 'Medium' : selectedDifficulty,
      testMode: 'topic_practice',
      questionCount,
      negativeMarking: 0.25,
      timeLimitMinutes: questionCount <= 10 ? 15 : 25,
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Category Pills Header */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-[#0F1E1B]/15 pb-4">
        {categoriesData.map((cat) => {
          const isSelected = selectedCategory === cat.category;
          return (
            <button
              key={cat.category}
              onClick={() => {
                setSelectedCategory(cat.category);
                setSearchQuery('');
              }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold border-2 transition-all ${
                isSelected
                  ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B] editorial-shadow-sm scale-[1.02]'
                  : 'bg-white text-[#0F1E1B] border-[#0F1E1B]/20 hover:border-[#0F1E1B] hover:bg-[#FDFBF3]'
              }`}
            >
              {getCategoryIcon(cat.category)}
              <span>{cat.category}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  isSelected ? 'bg-[#F5D90A] text-[#0F1E1B]' : 'bg-neutral-100 text-[#0F1E1B]/70'
                }`}
              >
                {cat.totalSubtopics} Topics
              </span>
            </button>
          );
        })}
      </div>

      {/* Control Bar: Search & Parameters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-[#0F1E1B] editorial-shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#0F1E1B]/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Search ${selectedCategory} topics...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#0F1E1B]/20 bg-[#FDFBF3] text-xs font-medium text-[#0F1E1B] focus:outline-hidden focus:border-[#0F1E1B]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end text-xs font-bold">
          {/* Difficulty */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[#0F1E1B]/60 text-[11px] uppercase">Difficulty:</span>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[#0F1E1B]/20 bg-[#FDFBF3] text-xs font-bold text-[#0F1E1B] focus:outline-hidden"
            >
              <option value="All Difficulties">All Levels</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {/* Question Count */}
          <div className="flex items-center space-x-1">
            <span className="text-[#0F1E1B]/60 text-[11px] uppercase mr-1">Count:</span>
            {[5, 10, 15].map((cnt) => (
              <button
                key={cnt}
                onClick={() => setQuestionCount(cnt)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                  questionCount === cnt
                    ? 'bg-[#0F1E1B] text-[#FDFBF3] border-[#0F1E1B]'
                    : 'bg-[#FDFBF3] text-[#0F1E1B] border-[#0F1E1B]/20 hover:border-[#0F1E1B]'
                }`}
              >
                {cnt} Qs
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Subtopics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSubtopics.map((st, idx) => {
          const subtopicName = typeof st === 'string' ? st : st.name;
          const count = typeof st === 'object' ? st.availableQuestions : 5;

          return (
            <div
              key={idx}
              className="bg-white p-4 rounded-2xl border-2 border-[#0F1E1B]/15 hover:border-[#0F1E1B] transition-all editorial-shadow-sm flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-[#F5F2E6] text-[#0F1E1B] font-mono text-[11px] font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h4 className="font-serif-headline text-sm font-black text-[#0F1E1B] group-hover:text-[#C1440E] transition-colors">
                    {subtopicName}
                  </h4>
                </div>
                <p className="text-[10px] text-[#0F1E1B]/60 mt-1 pl-8">
                  {count > 0 ? `${count} Verified Questions` : 'Curated Placement Set'}
                </p>
              </div>

              <button
                onClick={() => handleLaunchSubtopic(subtopicName)}
                disabled={actionLoading}
                className="bg-[#0F1E1B] group-hover:bg-[#C1440E] text-[#FDFBF3] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all shrink-0 ml-2 disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Practice</span>
              </button>
            </div>
          );
        })}
      </div>

      {filteredSubtopics.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-[#0F1E1B]/20">
          <p className="text-sm font-bold text-[#0F1E1B]/60">
            No subtopics found matching "{searchQuery}".
          </p>
        </div>
      )}
    </div>
  );
};

export default TopicPracticeTab;

