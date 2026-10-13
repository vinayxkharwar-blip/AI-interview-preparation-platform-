import React from 'react';
import PrepPilotIcon from './PrepPilotIcon';

/**
 * PrepPilotLogo Component
 * Horizontal logo combining the P-shaped rocket symbol + bold wordmark + optional tagline.
 * 
 * Palette:
 * - Deep Forest Green: #10221D
 * - Golden Yellow: #FFC400
 * - Warm Orange: #F47721
 * - Cream: #FAF8F0
 */
export default function PrepPilotLogo({
  variant = 'light', // 'light' (on cream/white), 'dark' (on forest-green/dark), 'icon-only'
  size = 'sm', // 'sm' (navbar), 'md' (cards), 'lg' (hero/footer), 'xl'
  showTagline = false,
  iconVariant,
  className = '',
  starPulse = false,
}) {
  // Sizing maps
  const iconSizeMap = {
    sm: 34,
    md: 42,
    lg: 52,
    xl: 64,
  };

  const textClassMap = {
    sm: 'text-lg xs:text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  };

  const taglineClassMap = {
    sm: 'text-[9px] tracking-wider',
    md: 'text-[11px] tracking-widest',
    lg: 'text-xs tracking-widest',
    xl: 'text-sm tracking-widest',
  };

  const iconPx = iconSizeMap[size] || 34;
  const isDarkBg = variant === 'dark';

  // Resolved icon style
  const resolvedIconVariant = iconVariant || (isDarkBg ? 'badge-cream' : 'badge');

  if (variant === 'icon-only') {
    return (
      <PrepPilotIcon
        size={iconPx}
        variant={resolvedIconVariant}
        starPulse={starPulse}
        className={className}
      />
    );
  }

  const prepPilotTextColor = isDarkBg ? 'text-[#FAF8F0]' : 'text-[#10221D]';
  const tagTextColor = isDarkBg ? 'text-[#FAF8F0]/70' : 'text-[#10221D]/70';

  return (
    <div className={`inline-flex items-center space-x-2.5 sm:space-x-3 select-none ${className}`}>
      {/* P-Shaped Rocket Icon */}
      <PrepPilotIcon
        size={iconPx}
        variant={resolvedIconVariant}
        starPulse={starPulse}
        className="group-hover:scale-105 transition-transform shrink-0"
      />

      {/* Typography Wordmark */}
      <div className="flex flex-col leading-tight">
        <div className={`font-serif-headline font-black tracking-tight ${textClassMap[size] || 'text-2xl'} flex items-center`}>
          <span className={prepPilotTextColor}>PrepPilot</span>
          <span className="text-[#F47721] ml-1">AI</span>
        </div>

        {showTagline && (
          <span className={`font-sans font-bold uppercase ${taglineClassMap[size]} text-[#FFC400] mt-0.5`}>
            Prepare. Practice. Get Hired.
          </span>
        )}
      </div>
    </div>
  );
}
