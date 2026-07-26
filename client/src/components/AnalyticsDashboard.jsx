import React from 'react';
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
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { TrendingUp, Target, AlertTriangle, Award, CheckCircle2, Activity, Zap } from 'lucide-react';

export default function AnalyticsDashboard({ analyticsData }) {
  if (!analyticsData) return null;

  const { summary, scoreTrend = [], skillScores = [], weakTopics = [] } = analyticsData;

  const BAR_COLORS = ['#f43f5e', '#fb7185', '#fda4af', '#f472b6', '#e879f9'];

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Metric Cards Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl text-indigo-400">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Average Score</span>
            <h3 className="text-2xl font-black text-white font-mono">{summary?.avgScore || 0} / 10</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 bg-purple-600/20 border border-purple-500/30 rounded-2xl text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Completed Sessions</span>
            <h3 className="text-2xl font-black text-white font-mono">{summary?.totalSessions || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 bg-emerald-600/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Questions Answered</span>
            <h3 className="text-2xl font-black text-white font-mono">{summary?.totalAnswers || 0}</h3>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="p-3.5 bg-amber-600/20 border border-amber-500/30 rounded-2xl text-amber-400">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Readiness Status</span>
            <h3 className="text-base font-bold text-amber-300">{summary?.readinessLevel || 'Proficient'}</h3>
          </div>
        </div>

      </div>

      {/* Main Charts Row 1: Score Progression & Skill Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Score Progression Trend Line */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600/20 rounded-lg text-indigo-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Score Trend Across Sessions</h3>
                <p className="text-xs text-slate-400">Historical performance progression over time</p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#818cf8"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 8, fill: '#a855f7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Category Radar Chart */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-600/20 rounded-lg text-purple-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Skill Category Proficiency Radar</h3>
              <p className="text-xs text-slate-400">Competency breakdown across interview domains</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={skillScores}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="skill" stroke="#94a3b8" fontSize={11} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#475569" fontSize={10} />
                <Radar
                  name="Proficiency"
                  dataKey="score"
                  stroke="#c084fc"
                  fill="#c084fc"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 2: Weakest Topic Breakdown */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-rose-600/20 rounded-lg text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Weakest Topic Frequency Breakdown</h3>
            <p className="text-xs text-slate-400">Concepts requiring focus based on interview evaluations</p>
          </div>
        </div>

        {weakTopics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {weakTopics.map((item, idx) => (
              <div
                key={idx}
                className="p-5 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 hover:border-rose-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    Flagged {item.frequency}x
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">Avg Score: {item.avgScore}/10</span>
                </div>
                <h4 className="text-sm font-bold text-white leading-snug">{item.topic}</h4>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No recurring weakness topics logged yet.</p>
        )}
      </div>

    </div>
  );
}
