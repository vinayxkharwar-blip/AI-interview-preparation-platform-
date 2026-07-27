import React, { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { Loader2, BarChart3, Sparkles } from 'lucide-react';

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
      <div className="bg-[#FDFBF3] text-[#0F1E1B] p-8 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2.5 bg-[#F5D90A] border-2 border-[#0F1E1B] rounded-xl text-[#0F1E1B]">
            <BarChart3 className="w-6 h-6" />
          </div>
          <h1 className="font-serif-headline text-3xl sm:text-4xl font-bold text-[#0F1E1B]">Performance Analytics & Skill Radar</h1>
        </div>
        <p className="text-sm text-[#0F1E1B]/80 font-medium">
          Aggregated score progression, domain proficiency radar, and recurring weakness topic breakdowns calculated across all your practice loops.
        </p>
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-[#0F1E1B] font-medium">
          <Loader2 className="w-8 h-8 animate-spin text-[#C1440E] mb-2" />
          <span className="text-sm font-bold">Aggregating interview metrics...</span>
        </div>
      ) : (
        <AnalyticsDashboard analyticsData={data} />
      )}
    </div>
  );
}
