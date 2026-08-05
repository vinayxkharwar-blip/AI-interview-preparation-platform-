import React, { useState } from 'react';
import { Bell, CheckCircle2, Sparkles, Briefcase, FileText, X } from 'lucide-react';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Resume ATS Analysis Completed',
      message: 'Your resume received an ATS score of 88/100.',
      time: '10m ago',
      read: false,
      icon: FileText,
    },
    {
      id: 2,
      title: '3 New High-Match Jobs Found',
      message: 'Stripe and Vercel posted positions matching your React profile.',
      time: '1h ago',
      read: false,
      icon: Briefcase,
    },
    {
      id: 3,
      title: 'AI Mock Interview Loop Ready',
      message: 'Practice your 15-minute Full Stack loop to boost interview readiness.',
      time: '3h ago',
      read: true,
      icon: Sparkles,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative">
      
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-[#0F1E1B]/80 hover:text-[#0F1E1B] hover:bg-[#F5F2E6] rounded-xl border-2 border-transparent hover:border-[#0F1E1B]/20 transition-all relative"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-[#0F1E1B]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#C1440E] border-2 border-[#FDFBF3]"></span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#FDFBF3] border-3 border-[#0F1E1B] rounded-2xl shadow-xl z-50 overflow-hidden font-sans-body animate-fadeIn">
          
          {/* Header */}
          <div className="bg-[#0F1E1B] text-[#FDFBF3] p-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-[#F5D90A]" />
              <h4 className="text-xs font-black font-serif-headline text-[#FDFBF3]">
                Career Notifications
              </h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.2 rounded-md bg-[#C1440E] text-[#FDFBF3] text-[10px] font-bold">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-[#F5D90A] hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#FDFBF3]/70 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List Container */}
          <div className="divide-y border-[#0F1E1B]/10 max-h-80 overflow-y-auto">
            {notifications.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className={`p-3.5 flex items-start space-x-3 transition-colors ${
                    !n.read ? 'bg-[#F5F2E6]/80 font-bold' : 'hover:bg-[#F5F2E6]/40'
                  }`}
                >
                  <div className="p-2 rounded-xl bg-[#0F1E1B] text-[#F5D90A] shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between text-xs text-[#0F1E1B]">
                      <span className="font-bold">{n.title}</span>
                      <span className="text-[10px] font-semibold text-[#0F1E1B]/60">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#0F1E1B]/80 font-medium leading-snug">
                      {n.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
