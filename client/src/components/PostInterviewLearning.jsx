import React from 'react';
import { BookOpen, ExternalLink, GraduationCap, Sparkles, Target, ArrowUpRight } from 'lucide-react';
import { extractPostInterviewLearningResources } from '../utils/gfgMapper';

export default function PostInterviewLearning({ session, improvementPlan, feedbackList = [] }) {
  const { roleResource, weakTopicResources } = extractPostInterviewLearningResources({
    session,
    improvementPlan,
    feedbackList,
  });

  return (
    <div
      id="recommended-learning"
      className="bg-[#FDFBF3] text-[#0F1E1B] p-6 sm:p-10 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-8 animate-fadeIn max-w-4xl mx-auto"
    >
      {/* Section Header */}
      <div className="space-y-2 border-b-3 border-[#0F1E1B]/15 pb-6">
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FEF9C3] border-2 border-[#0F1E1B] text-[#C1440E] text-xs font-black uppercase tracking-wider mb-1 shadow-xs">
          <Sparkles className="w-4 h-4 text-[#C1440E]" />
          <span>Post-Interview Next Steps</span>
        </div>
        <h2 className="font-serif-headline text-3xl sm:text-4xl font-bold text-[#0F1E1B]">
          Continue Your Preparation
        </h2>
        <p className="text-sm text-[#0F1E1B]/80 font-semibold">
          Based on your interview role and AI-identified weak areas.
        </p>
      </div>

      {/* Main Role-Based Learning Card (Ultra-Prominent) */}
      {roleResource && (
        <div className="bg-[#0F1E1B] text-[#FDFBF3] p-6 sm:p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow space-y-5 relative overflow-hidden">
          {/* Top Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3.5 py-1 rounded-full bg-[#F5D90A] text-[#0F1E1B] text-xs font-black uppercase tracking-wider border border-[#0F1E1B]">
              Primary Target Role Resource
            </span>
            <span className="text-xs font-extrabold text-[#F5D90A] uppercase tracking-wider flex items-center space-x-1">
              <GraduationCap className="w-4 h-4 inline mr-1" />
              GEEKSFORGEEKS RESOURCE
            </span>
          </div>

          <div className="space-y-2">
            <h3 className="font-serif-headline text-2xl sm:text-3xl font-bold text-[#FDFBF3]">
              {roleResource.roleName} Preparation Hub
            </h3>
            <p className="text-xs sm:text-sm text-[#FDFBF3]/85 leading-relaxed font-medium">
              Strengthen core technical domain knowledge and practice interview algorithms for{' '}
              <strong className="text-[#F5D90A]">{roleResource.roleName}</strong> on{' '}
              <span className="underline decoration-[#F5D90A]">{roleResource.title}</span>.
            </p>
          </div>

          {/* Prominent Prepare Now CTA */}
          <div className="pt-2">
            <a
              href={roleResource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-3 px-8 py-4 rounded-2xl font-black text-sm text-[#0F1E1B] bg-[#F5D90A] hover:bg-[#e5ca07] border-3 border-[#0F1E1B] transition-all editorial-shadow group cursor-pointer w-full sm:w-auto"
            >
              <BookOpen className="w-5 h-5 text-[#0F1E1B]" />
              <span className="uppercase tracking-wider">Prepare Now for {roleResource.roleName}</span>
              <ArrowUpRight className="w-5 h-5 text-[#0F1E1B] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
          </div>
        </div>
      )}

      {/* Weak Topics Recommendation Grid */}
      {weakTopicResources && weakTopicResources.length > 0 && (
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#0F1E1B] uppercase tracking-wider flex items-center space-x-2">
                <Target className="w-5 h-5 text-[#C1440E]" />
                <span>AI-Recommended Topic Drills ({weakTopicResources.length})</span>
              </h3>
              <p className="text-xs text-[#0F1E1B]/70 font-medium mt-1">
                Targeted practice modules to resolve weaknesses detected during your responses.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {weakTopicResources.map((item, idx) => (
              <div
                key={idx}
                className="p-6 bg-[#FEF9C3] rounded-3xl border-3 border-[#0F1E1B] space-y-4 flex flex-col justify-between editorial-shadow-sm hover:border-[#C1440E] transition-all"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-3 py-1 bg-[#C1440E] text-[#FDFBF3] text-[10px] font-black rounded-full uppercase tracking-wider">
                      Weak Area {idx + 1}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#0F1E1B]/80 bg-[#FDFBF3] px-2.5 py-1 rounded-md border border-[#0F1E1B]">
                      GeeksforGeeks
                    </span>
                  </div>

                  <h4 className="font-serif-headline text-xl font-bold text-[#0F1E1B]">
                    {item.topicName}
                  </h4>

                  {item.reasonSnippet && (
                    <p className="text-xs text-[#0F1E1B]/85 font-medium leading-relaxed bg-[#FDFBF3] p-3 rounded-xl border border-[#0F1E1B]/20">
                      <strong className="text-[#C1440E]">Observation: </strong>
                      {item.reasonSnippet}
                    </p>
                  )}

                  <div className="text-xs font-bold text-[#0F1E1B]/70">
                    Recommended Resource: <span className="text-[#C1440E] font-bold">{item.title}</span>
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-[#0F1E1B]/15">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-5 rounded-2xl font-black text-xs text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] border-2 border-[#0F1E1B] transition-all flex items-center justify-center space-x-2 text-center editorial-shadow-sm group cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-[#F5D90A]" />
                    <span>Prepare Now ({item.topicName})</span>
                    <ExternalLink className="w-4 h-4 text-[#F5D90A] group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
