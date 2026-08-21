import React, { useState } from 'react';
import { 
  Building2, 
  Briefcase, 
  Calendar, 
  ExternalLink, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Award,
  Sparkles,
  Search
} from 'lucide-react';

const STATUS_CONFIG = {
  applied: {
    label: 'Applied',
    badgeClass: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    icon: Clock,
  },
  pending: {
    label: 'Pending',
    badgeClass: 'bg-amber-500/10 text-amber-800 border-amber-500/30',
    icon: Clock,
  },
  interview: {
    label: 'Interviewing',
    badgeClass: 'bg-purple-500/10 text-purple-800 border-purple-500/30',
    icon: Sparkles,
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-rose-500/10 text-rose-700 border-rose-500/30',
    icon: XCircle,
  },
  offer: {
    label: 'Offer Received',
    badgeClass: 'bg-emerald-500/10 text-emerald-800 border-emerald-500/30',
    icon: Award,
  },
};

export default function ApplicationTracker({ applications = [], onStatusUpdate }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#FDFBF3] p-4 rounded-2xl border-2 border-[#0F1E1B]">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#0F1E1B]/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by company or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[#0F1E1B]/20 text-xs font-bold text-[#0F1E1B] focus:outline-none focus:border-[#0F1E1B] bg-[#F5F2E6]"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-[#0F1E1B]/70 mr-1 shrink-0">Status:</span>
          {['all', 'applied', 'pending', 'interview', 'offer', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all shrink-0 ${
                statusFilter === st
                  ? 'bg-[#0F1E1B] text-[#FDFBF3]'
                  : 'bg-[#F5F2E6] text-[#0F1E1B] hover:bg-[#E6E4DC]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Applications Table / Cards */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-12 bg-[#FDFBF3] rounded-2xl border-2 border-[#0F1E1B] p-6 space-y-3">
          <Briefcase className="w-10 h-10 text-[#0F1E1B]/40 mx-auto" />
          <h3 className="text-base font-bold font-serif-headline text-[#0F1E1B]">No Applications Found</h3>
          <p className="text-xs text-[#0F1E1B]/70 max-w-sm mx-auto">
            When you click "Apply Now" on job cards or log an application, your career pipeline will show up here.
          </p>
        </div>
      ) : (
        <div className="bg-[#FDFBF3] border-2 border-[#0F1E1B] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F2E6] border-b-2 border-[#0F1E1B] text-xs font-extrabold text-[#0F1E1B] uppercase tracking-wider">
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Applied Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-[#0F1E1B]/10 text-xs font-bold text-[#0F1E1B]">
                {filteredApps.map((app) => {
                  const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.applied;
                  const Icon = cfg.icon;

                  return (
                    <tr key={app._id || app.id} className="hover:bg-[#F5F2E6]/50 transition-colors">
                      
                      {/* Company Column */}
                      <td className="py-3.5 px-4 font-bold flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#0F1E1B]/5 border border-[#0F1E1B]/15 overflow-hidden flex items-center justify-center shrink-0">
                          {app.logo ? (
                            <img src={app.logo} alt={app.company} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-4 h-4 text-[#0F1E1B]/60" />
                          )}
                        </div>
                        <span className="text-[#0F1E1B] font-serif-headline text-sm font-bold">
                          {app.company}
                        </span>
                      </td>

                      {/* Role Column */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-[#0F1E1B]">{app.title}</span>
                        {app.location && (
                          <span className="block text-[10px] text-[#0F1E1B]/60 font-semibold">
                            {app.location}
                          </span>
                        )}
                      </td>

                      {/* Applied Date Column */}
                      <td className="py-3.5 px-4 text-[#0F1E1B]/80 font-medium">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-[#C1440E]" />
                          <span>{new Date(app.appliedDate || app.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        <select
                          value={app.status}
                          onChange={(e) => onStatusUpdate && onStatusUpdate(app._id || app.id, e.target.value)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-black border cursor-pointer focus:outline-none ${cfg.badgeClass}`}
                        >
                          <option value="applied">Applied</option>
                          <option value="pending">Pending</option>
                          <option value="interview">Interviewing</option>
                          <option value="offer">Offer Received</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>

                      {/* Action Column */}
                      <td className="py-3.5 px-4 text-right">
                        {app.applyUrl && (
                          <a
                            href={app.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-xs font-bold text-[#C1440E] hover:underline"
                          >
                            <span>Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
