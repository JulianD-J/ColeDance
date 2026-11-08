import React, { forwardRef } from 'react';
import { motion } from 'motion/react';

export interface BadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDragStart' | 'onDrag' | 'onDragEnd' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop'> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  dotColor?: 'brand' | 'accent' | 'sun' | 'success' | 'error' | 'warning' | 'inherit';
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const badgeVariantStyles = {
  default: 'bg-surface-3 text-on-surface border border-outline-variant',
  primary: 'bg-brand-500/15 text-brand-400 border border-brand-500/30',
  secondary: 'bg-accent-500/15 text-accent-400 border border-accent-500/30',
  success: 'bg-success-500/15 text-success-400 border border-success-500/30',
  warning: 'bg-sun-500/15 text-sun-400 border border-sun-500/30',
  error: 'bg-error-500/15 text-error-400 border border-error-500/30',
  outline: 'bg-transparent text-on-surface-variant border-2 border-outline',
  ghost: 'bg-transparent text-on-surface-variant',
};

const badgeSizeStyles = {
  sm: 'px-2 py-0.5 text-label-small gap-1',
  md: 'px-2.5 py-0.5 text-label-medium gap-1.5',
  lg: 'px-3 py-1 text-label-large gap-2',
};

const badgeDotColors = {
  brand: 'bg-brand-400',
  accent: 'bg-accent-400',
  sun: 'bg-sun-400',
  success: 'bg-success-400',
  error: 'bg-error-400',
  warning: 'bg-sun-400',
  inherit: 'bg-current',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, dotColor = 'inherit', removable = false, onRemove, icon, children, className = '', ...props }, ref) => {
    return (
      <motion.span
        ref={ref}
        className={`
          inline-flex items-center font-semibold rounded-full
          transition-all motion-standard
          ${badgeVariantStyles[variant]}
          ${badgeSizeStyles[size]}
          ${className}
        `}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        {...props}
      >
        {dot && <motion.span className={`w-1.5 h-1.5 rounded-full ${badgeDotColors[dotColor]}`} initial={{ scale: 0 }} animate={{ scale: 1 }} />}
        {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
        <span>{children}</span>
        {removable && onRemove && (
          <motion.button
            type="button"
            onClick={onRemove}
            className="ml-1 p-0.5 rounded-full text-current/70 hover:text-current hover:bg-white/10 transition-colors"
            whileTap={{ scale: 1.2 }}
            aria-label="Remove"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        )}
      </motion.span>
    );
  }
);

Badge.displayName = 'Badge';

/* Progress Bar */
export interface ProgressProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'brand' | 'success' | 'warning' | 'error' | 'gradient';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

const progressSizeStyles = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

const progressVariantStyles = {
  default: 'bg-brand-500',
  brand: 'bg-gradient-to-r from-brand-500 to-brand-400',
  success: 'bg-gradient-to-r from-success-500 to-success-400',
  warning: 'bg-gradient-to-r from-sun-500 to-sun-400',
  error: 'bg-gradient-to-r from-error-500 to-error-400',
  gradient: 'bg-gradient-to-r from-brand-500 via-accent-500 to-sun-500',
};

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  animated = false,
  striped = false,
  className = '',
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-label-medium font-semibold text-on-surface-variant">{label || `${Math.round(percentage)}%`}</span>
          {showLabel && <span className="text-label-medium font-bold text-brand-400 tabular-nums">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`relative w-full rounded-full bg-surface-3 overflow-hidden ${progressSizeStyles[size]}`}>
        <motion.div
          className={`
            h-full rounded-full ${progressVariantStyles[variant]}
            ${striped ? 'bg-[linear-gradient(45deg,rgba(255,255,255,.15)25%,transparent25%,transparent50%,rgba(255,255,255,.15)50%,rgba(255,255,255,.15)75%,transparent75%,transparent)] bg-[size:1rem_1rem]' : ''}
          `}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            width: animated ? undefined : `${percentage}%`,
            backgroundSize: striped ? '1rem 1rem' : undefined,
          }}
        >
          {animated && striped && (
            <motion.div
              className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,.15)25%,transparent25%,transparent50%,rgba(255,255,255,.15)50%,rgba(255,255,255,.15)75%,transparent75%,transparent)] bg-[size:1rem_1rem]"
              animate={{ x: '-1rem' }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
};

/* Circular Progress */
export interface CircularProgressProps {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  strokeWidth?: number;
  variant?: 'brand' | 'success' | 'warning' | 'error' | 'gradient';
  showValue?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const circularSizes = {
  sm: 40,
  md: 64,
  lg: 96,
  xl: 128,
};

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 'md',
  strokeWidth = 4,
  variant = 'brand',
  showValue = true,
  children,
  className = '',
}) => {
  const diameter = circularSizes[size];
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const gradientId = `progress-gradient-${variant}-${Math.random().toString(36).slice(2)}`;

  const gradients = {
    brand: <><stop offset="0%" stopColor="#d91e6d" /><stop offset="100%" stopColor="#e83e84" /></>,
    success: <><stop offset="0%" stopColor="#16a34a" /><stop offset="100%" stopColor="#22c55e" /></>,
    warning: <><stop offset="0%" stopColor="#d97706" /><stop offset="100%" stopColor="#f59e0b" /></>,
    error: <><stop offset="0%" stopColor="#dc2626" /><stop offset="100%" stopColor="#ef4444" /></>,
    gradient: <><stop offset="0%" stopColor="#d91e6d" /><stop offset="50%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#f59e0b" /></>,
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: diameter, height: diameter }}>
      <svg className="w-full h-full -rotate-90" style={{ width: diameter, height: diameter }}>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {gradients[variant]}
          </linearGradient>
        </defs>
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-3 opacity-30"
        />
        <motion.circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {showValue ? (
          <span className="font-bold text-on-surface tabular-nums" style={{ fontSize: diameter * 0.18 }}>
            {Math.round(value)}%
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

/* Skeleton Loader */
export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height,
  lines = 1,
  className = '',
}) => {
  const baseStyle = {
    background: 'linear-gradient(90deg, var(--color-surface-3) 25%, var(--color-surface-2) 50%, var(--color-surface-3) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  };

  if (variant === 'circular') {
    return (
      <motion.div
        className={className}
        style={{ width, height: height || width, borderRadius: '50%', ...baseStyle }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    );
  }

  if (variant === 'avatar') {
    return (
      <motion.div
        className={className}
        style={{ width: width || 40, height: height || 40, borderRadius: '50%', ...baseStyle }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={`${className} space-y-3`}>
        <motion.div style={{ width: '40%', height: 24, borderRadius: 12, ...baseStyle }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity }} />
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div key={i} style={{ width: i === lines - 1 ? '60%' : '100%', height: 16, borderRadius: 8, ...baseStyle }} animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${className} space-y-2`}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            width: i === lines - 1 && lines > 1 ? '60%' : width,
            height: height || 16,
            borderRadius: 8,
            ...baseStyle,
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
        />
      ))}
    </div>
  );
};

/* Divider */
export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'dashed' | 'dotted' | 'gradient';
  label?: string;
  labelPosition?: 'start' | 'center' | 'end';
  thickness?: 'thin' | 'medium' | 'thick';
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'default',
  label,
  labelPosition = 'center',
  thickness = 'thin',
  className = '',
  children,
  ...props
}) => {
  const dividerThicknessStyles = {
    thin: 'border-t',
    medium: 'border-t-2',
    thick: 'border-t-4',
  };

  const dividerVariantStyles = {
    default: 'border-outline-variant',
    dashed: 'border-outline-variant border-dashed',
    dotted: 'border-outline-variant border-dotted',
    gradient: 'border-transparent bg-gradient-to-r from-transparent via-brand-500/50 to-transparent',
  };

  if (orientation === 'vertical') {
    return (
      <hr
        className={`${dividerThicknessStyles[thickness]} ${dividerVariantStyles[variant]} h-full ${className}`}
        aria-orientation="vertical"
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div className={`flex items-center gap-4 ${className}`} role="separator" aria-orientation="horizontal">
        <hr className={`flex-1 ${dividerThicknessStyles[thickness]} ${dividerVariantStyles[variant]}`} {...props} />
        <span className="text-label-small text-on-surface-disabled whitespace-nowrap shrink-0">{label}</span>
        <hr className={`flex-1 ${dividerThicknessStyles[thickness]} ${dividerVariantStyles[variant]}`} {...props} />
      </div>
    );
  }

  return (
    <hr className={`${dividerThicknessStyles[thickness]} ${dividerVariantStyles[variant]} ${className}`} {...props} />
  );
};

/* Tooltip */
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}) => {
  const [visible, setVisible] = React.useState(false);
  const timeoutRef = React.useRef<number | null>(null);

  const showTooltip = () => {
    timeoutRef.current = window.setTimeout(() => setVisible(true), delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-brand-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-brand-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-brand-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-brand-900',
  };

  if (!React.isValidElement(children)) {
    return <>{children}</>;
  }

  const childProps = children.props as React.HTMLAttributes<any>;
  const mergedProps = {
    ...childProps,
    onMouseEnter: (e: React.MouseEvent) => { showTooltip(); childProps.onMouseEnter?.(e); },
    onMouseLeave: (e: React.MouseEvent) => { hideTooltip(); childProps.onMouseLeave?.(e); },
    onFocus: (e: React.FocusEvent) => { showTooltip(); childProps.onFocus?.(e); },
    onBlur: (e: React.FocusEvent) => { hideTooltip(); childProps.onBlur?.(e); },
    onTouchStart: (e: React.TouchEvent) => { showTooltip(); childProps.onTouchStart?.(e); },
    onTouchEnd: (e: React.TouchEvent) => { hideTooltip(); childProps.onTouchEnd?.(e); },
  };

  return (
    <>
      {React.cloneElement(children, mergedProps)}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={`
              fixed z-[700] px-3 py-2 rounded-lg text-label-small font-medium text-white
              bg-brand-900 shadow-level-4 whitespace-nowrap pointer-events-none
              ${className}
            `}
            style={{ zIndex: 700 }}
            initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0, x: position === 'left' ? 4 : position === 'right' ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="tooltip"
          >
            {content}
            <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowStyles[position]}`} aria-hidden="true" />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* Import AnimatePresence for Tooltip */
import { AnimatePresence } from 'motion/react';

/* Separator (alias for Divider) */
export const Separator = Divider;