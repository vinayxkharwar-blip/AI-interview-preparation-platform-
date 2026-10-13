import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Sparkles,
  Check,
  RotateCcw,
  AlertCircle,
  Plus,
  ArrowRight,
  SlidersHorizontal,
  X
} from 'lucide-react';

export const PREDEFINED_ROLES = [
  'Full Stack Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'DevOps & Cloud Engineer',
  'AI / Machine Learning Engineer',
];

export const POPULAR_CUSTOM_ROLES = [
  'QA Engineer',
  'Cybersecurity Analyst',
  'Data Analyst',
  'SOC Analyst',
  'SAP Consultant',
  'Software Tester',
  'Technical Support Engineer',
];

const CUSTOM_OPTION_VALUE = '__ENTER_CUSTOM_ROLE__';

/**
 * TargetRoleSelector Component
 * Supports both predefined engineering roles and safe, validated custom roles.
 */
export default function TargetRoleSelector({
  value,
  onChange,
  onApply,
  disabled = false,
  label = 'Target Engineering Role',
  helperText,
  className = '',
}) {
  const isPredefined = PREDEFINED_ROLES.includes(value);

  const [isCustomMode, setIsCustomMode] = useState(!isPredefined && Boolean(value));
  const [customInput, setCustomInput] = useState(!isPredefined ? (value || '') : '');
  const [error, setError] = useState('');
  const [isSuccessToast, setIsSuccessToast] = useState(false);

  // Sync with incoming value if it changes externally
  useEffect(() => {
    if (PREDEFINED_ROLES.includes(value)) {
      setIsCustomMode(false);
      setCustomInput('');
    } else if (value) {
      setCustomInput(value);
    }
  }, [value]);

  const handleDropdownChange = (e) => {
    const selectedVal = e.target.value;
    setError('');

    if (selectedVal === CUSTOM_OPTION_VALUE) {
      setIsCustomMode(true);
      setCustomInput(isPredefined ? '' : value);
    } else {
      setIsCustomMode(false);
      setCustomInput('');
      persistAndPropagate(selectedVal);
    }
  };

  const persistAndPropagate = (roleToApply) => {
    const cleanRole = roleToApply.trim().substring(0, 100);

    // Save to localStorage for instant refresh persistence
    try {
      localStorage.setItem('preppilot_target_role', cleanRole);
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.targetRole = cleanRole;
        localStorage.setItem('user', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('[TargetRoleSelector] localStorage error:', e);
    }

    if (onChange) {
      onChange(cleanRole);
    }
    if (onApply) {
      onApply(cleanRole);
    }

    setIsSuccessToast(true);
    setTimeout(() => setIsSuccessToast(false), 2500);
  };

  const handleApplyCustom = (overrideRole) => {
    const roleText = typeof overrideRole === 'string' ? overrideRole : customInput;
    const trimmed = roleText ? roleText.trim() : '';

    if (!trimmed) {
      setError('Role title cannot be empty. Please enter your target job role.');
      return;
    }

    if (trimmed.length > 100) {
      setError('Role title is too long (maximum 100 characters allowed).');
      return;
    }

    setError('');
    persistAndPropagate(trimmed);
  };

  const handleCancelCustom = () => {
    setError('');
    setIsCustomMode(false);
    // If the current value was a custom role, revert to the first predefined role or preserve
    if (!PREDEFINED_ROLES.includes(value)) {
      persistAndPropagate(PREDEFINED_ROLES[0]);
    }
  };

  const handleQuickSelect = (roleName) => {
    setCustomInput(roleName);
    setError('');
    handleApplyCustom(roleName);
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header & Label */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-black uppercase tracking-wider text-[#0F1E1B]/75 flex items-center space-x-1.5">
          <Briefcase className="w-3.5 h-3.5 text-[#C1440E]" />
          <span>{label}</span>
        </label>
        {isSuccessToast && (
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-400 px-2 py-0.5 rounded-md flex items-center space-x-1 animate-fadeIn">
            <Check className="w-3 h-3 text-emerald-700" />
            <span>Role Saved</span>
          </span>
        )}
      </div>

      {!isCustomMode ? (
        /* ================= PREDEFINED DROPDOWN VIEW ================= */
        <div className="space-y-1.5">
          <div className="relative">
            <select
              value={isPredefined ? value : CUSTOM_OPTION_VALUE}
              onChange={handleDropdownChange}
              disabled={disabled}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#0F1E1B] bg-white font-bold text-xs text-[#0F1E1B] focus:outline-hidden focus:ring-2 focus:ring-[#0F1E1B] editorial-shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {PREDEFINED_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
              <option disabled className="text-neutral-400">
                ──────────
              </option>
              <option value={CUSTOM_OPTION_VALUE} className="text-[#C1440E] font-black">
                Enter Custom Role
              </option>
              {!isPredefined && value && (
                <option value={value}>
                  Custom: {value}
                </option>
              )}
            </select>
          </div>

          {!isPredefined && value && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-[#0F1E1B]/70 truncate max-w-[190px]">
                Active: <span className="text-[#0F1E1B] underline">{value}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(true);
                  setCustomInput(value);
                }}
                className="text-[11px] font-bold text-[#C1440E] hover:underline"
              >
                Edit Custom Role
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ================= CUSTOM INPUT VIEW ================= */
        <div className="p-3.5 rounded-2xl bg-white border-2 border-[#0F1E1B] editorial-shadow-sm space-y-3 animate-fadeIn">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#0F1E1B]/70">
              <span>Type your custom role title:</span>
              <span className={customInput.length > 90 ? 'text-amber-700 font-black' : 'text-[#0F1E1B]/50'}>
                {customInput.length}/100
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyCustom();
                  } else if (e.key === 'Escape') {
                    handleCancelCustom();
                  }
                }}
                maxLength={100}
                placeholder="Enter your target job role"
                autoFocus
                disabled={disabled}
                className="w-full px-3.5 py-2.5 rounded-xl border-2 border-[#0F1E1B] bg-[#FDFBF3] font-bold text-xs text-[#0F1E1B] placeholder-[#0F1E1B]/40 focus:outline-hidden focus:ring-2 focus:ring-[#0F1E1B] transition-all"
              />
            </div>

            {error && (
              <p className="text-[11px] font-bold text-rose-700 flex items-center space-x-1 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Quick popular suggestions */}
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0F1E1B]/50">
              Popular Roles:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {POPULAR_CUSTOM_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleQuickSelect(role)}
                  className="px-2 py-0.5 rounded-lg border border-[#0F1E1B]/20 bg-[#F5F2E6] hover:bg-[#F5D90A] text-[#0F1E1B] text-[10px] font-bold transition-colors"
                >
                  +{role}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 pt-1 border-t border-[#0F1E1B]/10">
            <button
              type="button"
              onClick={() => handleApplyCustom()}
              disabled={disabled || !customInput.trim()}
              className="flex-1 bg-[#0F1E1B] hover:bg-[#1A332E] text-[#FDFBF3] py-2 px-3 rounded-xl text-xs font-black border-2 border-[#0F1E1B] flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5 text-[#F5D90A]" />
              <span>Use Custom Role</span>
            </button>
            <button
              type="button"
              onClick={handleCancelCustom}
              disabled={disabled}
              className="bg-white hover:bg-[#F5F2E6] text-[#0F1E1B] py-2 px-3 rounded-xl text-xs font-bold border border-[#0F1E1B]/30 transition-all flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3 text-[#0F1E1B]/60" />
              <span>Return to Predefined Roles</span>
            </button>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[11px] text-[#0F1E1B]/60 font-medium">
          {helperText}
        </p>
      )}
    </div>
  );
}
