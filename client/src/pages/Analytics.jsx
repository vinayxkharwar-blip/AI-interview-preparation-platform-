import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { Loader2, BarChart3 } from 'lucide-react';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await axiosClient.get('/analytics/dashboard');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load analytics dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 bg-indigo-600/20 rounded-xl text-indigo-400 border border-indigo-500/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-white">Performance Analytics & Skill Radar</h1>
        </div>
        <p className="text-sm text-slate-400">
          Aggregated performance trends, domain proficiency radar, and recurring technical weakness breakdowns computed via MongoDB aggregation pipelines.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <span className="text-sm font-medium">Aggregating MongoDB interview metric pipelines...</span>
        </div>
      ) : (
        <AnalyticsDashboard analyticsData={data} />
      )}
    </div>
  );
}
