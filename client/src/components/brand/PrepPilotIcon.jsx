import React from 'react';

/**
 * PrepPilotIcon Component
 * Distinctive, minimal P-shaped rocket / forward-arrow symbol with a career growth star.
 * 
 * Brand Colors:
 * - Deep Forest Green: #10221D
 * - Golden Yellow: #FFC400
 * - Warm Orange: #F47721
 * - Cream: #FAF8F0
 */
export default function PrepPilotIcon({
  size = 36,
  variant = 'badge', // 'badge' (dark squircle), 'badge-cream' (light squircle), 'bare' (transparent symbol)
  className = '',
  starPulse = false,
  ...props
}) {
  const dimension = typeof size === 'number' ? `${size}px` : size;

  if (variant === 'bare') {
    return (
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-hidden="true"
        {...props}
      >
        {/* P-Stem & Main Fuselage Silhouette */}
        <path
          d="M8 38V12C8 9.79 9.79 8 12 8H25C32.18 8 38 13.82 38 21C38 27.6 33.1 33.06 26.75 33.86L26 27.75C29.36 27.05 32 24.15 32 21C32 17.13 28.87 14 25 14H14.5V38H8Z"
          fill="#10221D"
        />

        {/* Forward Arrow Thrust Channel (Warm Orange #F47721) */}
        <path
          d="M14.5 19.5H24C25.66 19.5 27 20.84 27 22.5C27 24.16 25.66 25.5 24 25.5H14.5V19.5Z"
          fill="#F47721"
        />

        {/* Bottom Propulsion Fin */}
        <path d="M8 38L13 31H8V38Z" fill="#F47721" />

        {/* Dynamic Forward-Arrow Chevron (Golden Yellow #FFC400) */}
        <path d="M14.5 31L20 26H14.5V31Z" fill="#FFC400" />

        {/* Career Growth & Interview Success Star (Golden Yellow #FFC400) */}
        <g className={starPulse ? 'animate-pulse' : ''}>
          <path
            d="M41 4C41 6.8 42.5 8.2 45 8.2C42.5 8.2 41 9.6 41 12.4C41 9.6 39.5 8.2 37 8.2C39.5 8.2 41 6.8 41 4Z"
            fill="#FFC400"
          />
          <circle cx="41" cy="8.2" r="1" fill="#FAF8F0" />
        </g>
      </svg>
    );
  }

  const isCreamBadge = variant === 'badge-cream';
  const bgColor = isCreamBadge ? '#FAF8F0' : '#10221D';
  const pFill = isCreamBadge ? '#10221D' : '#FAF8F0';

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* Background Squircle */}
      <rect
        width="64"
        height="64"
        rx="16"
        fill={bgColor}
        stroke={isCreamBadge ? '#10221D' : 'none'}
        strokeWidth={isCreamBadge ? '3' : '0'}
      />

      {/* P-Stem & Main Rocket Fuselage Silhouette */}
      <path
        d="M16 48V18C16 15.79 17.79 14 20 14H33C40.18 14 46 19.82 46 27C46 33.6 41.1 39.06 34.75 39.86L34 33.75C37.36 33.05 40 30.15 40 27C40 23.13 36.87 20 33 20H22.5V48H16Z"
        fill={pFill}
      />

      {/* Rocket Forward Arrow Chamber (Warm Orange #F47721) */}
      <path
        d="M22.5 24.5H32C33.66 24.5 35 25.84 35 27.5C35 29.16 33.66 30.5 32 30.5H22.5V24.5Z"
        fill="#F47721"
      />

      {/* Lower Rocket Fin (Warm Orange #F47721) */}
      <path d="M16 48L22 40H16V48Z" fill="#F47721" />

      {/* Dynamic Acceleration Arrow Vector (Golden Yellow #FFC400) */}
      <path d="M22.5 38L29 32.5H22.5V38Z" fill="#FFC400" />

      {/* Career Growth Star (Golden Yellow #FFC400 with central glint) */}
      <g className={starPulse ? 'animate-pulse' : ''}>
        <path
          d="M50 10C50 13.5 51.7 15.2 54.5 15.2C51.7 15.2 50 16.9 50 20.4C50 16.9 48.3 15.2 45.5 15.2C48.3 15.2 50 13.5 50 10Z"
          fill="#FFC400"
        />
        <circle cx="50" cy="15.2" r="1.3" fill="#FAF8F0" />
      </g>
    </svg>
  );
}
