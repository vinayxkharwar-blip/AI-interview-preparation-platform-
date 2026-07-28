import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Shared Empty / Error State Component styled with PrepPulse editorial design system.
 *
 * @param {Object} props
 * @param {string} props.title - Main headline
 * @param {string} props.description - Body text explaining the state
 * @param {React.ElementType} [props.icon] - Optional Lucide icon component
 * @param {string} [props.actionText] - Action button/link label
 * @param {string} [props.actionLink] - Router path to navigate to
 * @param {function} [props.onAction] - Custom click handler for action button
 */
export default function EmptyState({
  title = 'No Data Available',
  description = 'No records or performance data found.',
  icon: Icon = AlertCircle,
  actionText,
  actionLink,
  onAction,
}) {
  return (
    <div className="bg-[#FDFBF3] text-[#0F1E1B] p-8 sm:p-12 rounded-3xl border-3 border-[#0F1E1B] editorial-shadow-lg text-center space-y-4 animate-fadeIn max-w-3xl mx-auto">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#0F1E1B] text-[#F5D90A] flex items-center justify-center mx-auto editorial-shadow-sm">
          <Icon className="w-7 h-7 text-[#F5D90A]" />
        </div>
      )}
      <h3 className="font-serif-headline text-2xl sm:text-3xl font-bold text-[#0F1E1B]">{title}</h3>
      <p className="text-sm font-medium text-[#0F1E1B]/75 max-w-md mx-auto leading-relaxed">
        {description}
      </p>

      {(actionText && (actionLink || onAction)) && (
        <div className="pt-4 flex justify-center">
          {actionLink ? (
            <Link
              to={actionLink}
              className="px-6 py-3 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] transition-all text-xs tracking-wide uppercase editorial-shadow"
            >
              {actionText}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="px-6 py-3 rounded-2xl font-bold text-[#FDFBF3] bg-[#0F1E1B] hover:bg-[#1A332E] transition-all text-xs tracking-wide uppercase editorial-shadow"
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
