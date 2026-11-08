import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  variant?: 'elevated' | 'filled' | 'outlined' | 'glass' | 'modal';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  elevated: 'bg-surface-2 border border-outline/30 shadow-level-2 hover:shadow-level-3',
  filled: 'bg-surface-1 border border-outline/20',
  outlined: 'bg-transparent border-2 border-outline-variant hover:border-outline',
  glass: 'surface-glass',
  modal: 'surface-modal',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'elevated', padding = 'md', interactive = false, className = '', children, whileHover, whileTap, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={`
          rounded-2xl
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${interactive ? 'cursor-pointer' : ''}
          ${className}
        `}
        whileHover={interactive ? (whileHover ?? { y: -4, scale: 1.01, boxShadow: 'var(--shadow-level-4)' }) : undefined}
        whileTap={interactive ? (whileTap ?? { scale: 0.99 }) : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

/* Card Sub-components */
export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}> = ({ children, className = '', action }) => (
  <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
    <div className="flex-1 min-w-0">{children}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const CardTitle: React.FC<{
  children: React.ReactNode;
  className?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4';
}> = ({ children, className = '', level = 'h3' }) => {
  const Tag = level;
  return (
    <Tag className={`font-bold text-headline-small text-on-surface ${className}`}>
      {children}
    </Tag>
  );
};

export const CardSubtitle: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <p className={`text-body-medium text-on-surface-variant mt-1 ${className}`}>{children}</p>
);

export const CardContent: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

export const CardActions: React.FC<{
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end' | 'stretch';
}> = ({ children, className = '', align = 'end' }) => (
  <div
    className={`
      flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-outline-variant
      justify-${align}
      ${className}
    `}
  >
    {children}
  </div>
);

export const CardMedia: React.FC<{
  children: React.ReactNode;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'wide';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}> = ({ children, className = '', aspectRatio = 'video', rounded = 'lg' }) => {
  const aspectMap = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-portrait',
    wide: 'aspect-[21/9]',
  };

  const roundedMap = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-2xl',
  };

  return (
    <div
      className={`
        relative overflow-hidden w-full
        ${aspectMap[aspectRatio]}
        ${roundedMap[rounded]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/* Interactive Card with press animation */
export interface InteractiveCardProps extends Omit<CardProps, 'interactive'> {
  onClick?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  'aria-label'?: string;
}

export const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ onClick, onKeyDown, 'aria-label': ariaLabel, className = '', children, ...props }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick?.();
      }
      onKeyDown?.(e);
    };

    return (
      <Card
        ref={ref}
        interactive
        className={className}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={ariaLabel}
        whileHover={{ y: -4, scale: 1.01, boxShadow: 'var(--shadow-level-4)' }}
        whileTap={{ scale: 0.98 }}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

InteractiveCard.displayName = 'InteractiveCard';

/* Stat Card - for metrics display */
export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; label: string; positive?: boolean };
  icon?: React.ReactNode;
  iconColor?: 'brand' | 'accent' | 'sun' | 'success' | 'error';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trend,
  icon,
  iconColor = 'brand',
  className = '',
}) => {
  const iconColorMap = {
    brand: 'text-brand-400 bg-brand-500/10',
    accent: 'text-accent-400 bg-accent-500/10',
    sun: 'text-sun-400 bg-sun-500/10',
    success: 'text-success-400 bg-success-500/10',
    error: 'text-error-400 bg-error-500/10',
  };

  return (
    <Card variant="filled" padding="md" className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-label-medium text-on-surface-variant uppercase tracking-wider">{label}</p>
          <p className="text-display-small font-bold text-on-surface mt-1 tabular-nums">{value}</p>
          {trend && (
            <div className="flex items-center gap-1.5 mt-2">
              <motion.span
                initial={{ scale: 0, rotate: trend.positive ? 0 : 180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.2 }}
                className={`flex items-center gap-0.5 text-label-medium font-semibold ${
                  trend.positive ? 'text-success-400' : 'text-error-400'
                }`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points={trend.positive ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                </svg>
                <span>{Math.abs(trend.value)}%</span>
              </motion.span>
              <span className="text-body-small text-on-surface-variant">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <motion.div
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17, delay: 0.1 }}
            className={`p-3 rounded-xl ${iconColorMap[iconColor]}`}
            aria-hidden="true"
          >
            {icon}
          </motion.div>
        )}
      </div>
    </Card>
  );
};