"use client";

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccordionSectionProps {
  stepNumber: number;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'error' | 'neutral';
  isActive?: boolean;
  onActivate?: () => void;
  activeBg?: string;
  children: React.ReactNode;
  className?: string;
}

const badgeStyles: Record<string, string> = {
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
};

export function AccordionSection({
  stepNumber,
  title,
  subtitle,
  badge,
  badgeVariant = 'neutral',
  isActive = false,
  onActivate,
  activeBg = '',
  children,
  className,
}: AccordionSectionProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-xl border transition-all duration-200 overflow-hidden',
        isActive ? 'border-green-300 shadow-sm' : 'border-gray-200',
        className
      )}
    >
      {/* Header / trigger */}
      <button
        type="button"
        onClick={onActivate}
        className={cn(
          'w-full flex items-center justify-between px-5 py-4 text-left transition-colors',
          isActive ? 'bg-green-50/50' : 'hover:bg-gray-50'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Step number circle */}
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors',
              isActive
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-500'
            )}
          >
            {isActive ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              stepNumber
            )}
          </div>

          <div>
            <h3 className={cn(
              'text-sm font-bold',
              isActive ? 'text-gray-900' : 'text-gray-700'
            )}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {badge && (
            <span className={cn(
              'text-xs font-medium px-2.5 py-1 rounded-full border',
              badgeStyles[badgeVariant]
            )}>
              {badge}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform duration-200',
              isActive && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Content */}
      {isActive && (
        <div className={cn('px-5 pb-5 pt-0', activeBg)}>
          {children}
        </div>
      )}
    </div>
  );
}
