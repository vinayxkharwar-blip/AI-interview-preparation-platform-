import React from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { TrendingUp, Target, AlertTriangle, Award, CheckCircle2, Activity, Zap, PlayCircle, BarChart3 } from 'lucide-react';
import { toHundredScale } from '../utils/score';
import EmptyState from './common/EmptyState';

export default function AnalyticsDashboard({ analyticsData }) {
  if (!analyticsData || !analyticsData.summary) {
    return (
      <EmptyState
        title="No Analytics Data Available"
        description="Complete an interview practice loop to generate performance trends, skill category radar, and weak topic breakdowns."
        icon={BarChart3}
        actionText="Start Practice Loop"
        actionLink="/new-session"
      />
    );
  }

  const { summary, scoreTrend = [], skillScores = [], weakTopics = [] } = analyticsData;
  const hasAvgScore = summary?.avgScore !== undefined && summary?.avgScore !== null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      
      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        
        <div className="bg-[#FCE7F3] p-4 sm:p-6 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3.5 bg-[#0F1E1B] rounded-2xl text-[#F5D90A] shrink-0">
            <Award className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-[#0F1E1B]/70 font-bold uppercase tracking-wider block truncate">Average Score</span>
            <h3 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#0F1E1B] truncate">
              {hasAvgScore ? `${toHundredScale(summary.avgScore)} / 100` : 'N/A'}
            </h3>
          </div>
        </div>

        <div className="bg-[#F3E8FF] p-4 sm:p-6 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3.5 bg-[#0F1E1B] rounded-2xl text-[#F5D90A] shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-[#0F1E1B]/70 font-bold uppercase tracking-wider block truncate">Loops Completed</span>
            <h3 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#0F1E1B]">{summary?.totalSessions || 0}</h3>
          </div>
        </div>

        <div className="bg-[#DCFCE7] p-4 sm:p-6 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3.5 bg-[#0F1E1B] rounded-2xl text-[#F5D90A] shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-[#0F1E1B]/70 font-bold uppercase tracking-wider block truncate">Questions</span>
            <h3 className="font-serif-headline text-2xl sm:text-3xl font-black text-[#0F1E1B]">{summary?.totalAnswers || 0}</h3>
          </div>
        </div>

        <div className="bg-[#FEF9C3] p-4 sm:p-6 rounded-2xl border-3 border-[#0F1E1B] editorial-shadow flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3.5 bg-[#0F1E1B] rounded-2xl text-[#F5D90A] shrink-0">
            <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs text-[#0F1E1B]/70 font-bold uppercase tracking-wider block truncate">Readiness</span>
            <h3 className="font-serif-headline text-xl sm:text-2xl font-bold text-emerald-900 truncate">{summary?.readinessLevel || 'Not Evaluated'}</h3>
          </div>
        </div>

      </div>

      {/* Main Charts Row 1: Score Progression & Skill Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Score Progression Trend Line */}
        <div className="bg-[#FDFBF3] text-[#0F1E1B] p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="p-2 sm:p-2.5 bg-[#0F1E1B] text-[#F5D90A] rounded-xl shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif-headline text-lg sm:text-xl font-bold text-[#0F1E1B] truncate">Score Trend Across Loops</h3>
                <p className="text-[11px] sm:text-xs text-[#0F1E1B]/70 font-medium truncate">Historical performance progression</p>
              </div>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0F1E1B" opacity={0.15} />
                <XAxis dataKey="date" stroke="#0F1E1B" fontSize={11} />
                <YAxis domain={[0, 10]} stroke="#0F1E1B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FDFBF3',
                    borderColor: '#0F1E1B',
                    borderWidth: '2px',
                    borderRadius: '12px',
                    color: '#0F1E1B',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#C1440E"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#F5D90A', strokeWidth: 2, stroke: '#0F1E1B' }}
                  activeDot={{ r: 7, fill: '#0F1E1B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Category Radar Chart */}
        <div className="bg-[#FDFBF3] text-[#0F1E1B] p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-4 sm:space-y-6">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="p-2 sm:p-2.5 bg-[#0F1E1B] text-[#F5D90A] rounded-xl shrink-0">
              <Target className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-serif-headline text-lg sm:text-xl font-bold text-[#0F1E1B] truncate">Skill Category Radar</h3>
              <p className="text-[11px] sm:text-xs text-[#0F1E1B]/70 font-medium truncate">Competency breakdown across domains</p>
            </div>
          </div>

          <div className="h-60 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillScores}>
                <PolarGrid stroke="#0F1E1B" opacity={0.2} />
                <PolarAngleAxis dataKey="skill" stroke="#0F1E1B" fontSize={10} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#0F1E1B" fontSize={9} />
                <Radar
                  name="Proficiency"
                  dataKey="score"
                  stroke="#C1440E"
                  fill="#F5D90A"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FDFBF3',
                    borderColor: '#0F1E1B',
                    borderWidth: '2px',
                    borderRadius: '12px',
                    color: '#0F1E1B',
                    fontWeight: 'bold',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Weakest Topic Breakdown */}
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg space-y-4 sm:space-y-6">
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="p-2 sm:p-2.5 bg-[#0F1E1B] text-[#F5D90A] rounded-xl shrink-0">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-[#C1440E]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-serif-headline text-lg sm:text-xl font-bold text-[#0F1E1B] truncate">Weakest Topic Focus Breakdown</h3>
            <p className="text-[11px] sm:text-xs text-[#0F1E1B]/70 font-medium truncate">Concepts requiring focus based on AI evaluations</p>
          </div>
        </div>

        {weakTopics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {weakTopics.map((item, idx) => (
              <div
                key={idx}
                className="p-5 bg-[#F5F2E6] rounded-2xl border-2 border-[#0F1E1B] space-y-2 hover:bg-[#EFEAD8] transition-colors shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C1440E] px-2 py-0.5 rounded-full bg-[#FCE7F3] border border-[#0F1E1B]">
                    Flagged {item.frequency}x
                  </span>
                  <span className="text-xs font-bold font-mono text-[#0F1E1B]">Avg Score: {item.avgScore}/10</span>
                </div>
                <h4 className="font-serif-headline text-base font-bold text-[#0F1E1B] leading-snug">{item.topic}</h4>
                <div className="pt-2">
                  <Link
                    to={`/new-session?focus=${encodeURIComponent(item.topic)}&prevScore=${item.avgScore}`}
                    className="inline-flex items-center justify-center space-x-1.5 w-full py-2 px-3 bg-[#0F1E1B] text-[#FDFBF3] hover:bg-[#C1440E] rounded-xl text-xs font-bold transition-colors editorial-shadow-sm"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-[#F5D90A]" />
                    <span>Practice This Topic</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#0F1E1B]/60 italic font-medium">No recurring weakness topics logged yet.</p>
        )}
      </div>

    </div>
  );
}
