import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outlined' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:from-brand-400 hover:to-brand-500 active:from-brand-600 active:to-brand-700 shadow-brand-glow hover:brand-glow-lg',
  secondary: 'bg-gradient-to-r from-accent-500 to-accent-600 text-white hover:from-accent-400 hover:to-accent-500 active:from-accent-600 active:to-accent-700 shadow-accent-glow',
  tertiary: 'bg-gradient-to-r from-sun-500 to-sun-600 text-white hover:from-sun-400 hover:to-sun-500 active:from-sun-600 active:to-sun-700 shadow-sun-glow',
  outlined: 'bg-transparent border-2 border-outline-variant text-on-surface-variant hover:border-outline hover:bg-surface-2 hover:text-on-surface active:bg-surface-3',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-2 hover:text-on-surface active:bg-surface-3',
  danger: 'bg-gradient-to-r from-error-500 to-error-600 text-white hover:from-error-400 hover:to-error-500 active:from-error-600 active:to-error-700',
  success: 'bg-gradient-to-r from-success-500 to-success-600 text-white hover:from-success-400 hover:to-success-500 active:from-success-600 active:to-success-700 shadow-success-glow',
};

const sizeStyles = {
  xs: 'h-8 px-3 text-label-small gap-1.5',
  sm: 'h-9 px-4 text-label-medium gap-2',
  md: 'h-10 px-5 text-label-large gap-2',
  lg: 'h-12 px-6 text-title-small gap-2.5',
  xl: 'h-14 px-7 text-title-medium gap-2.5',
};

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      leadingIcon,
      trailingIcon,
      loading = false,
      disabled,
      className = '',
      style,
      children,
      whileTap,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        className={`
          inline-flex items-center justify-center font-semibold rounded-xl
          transition-all motion-standard
          disabled:opacity-50 disabled:cursor-not-allowed
          ${fullWidth ? 'w-full' : ''}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        style={style}
        disabled={isDisabled}
        whileTap={whileTap ?? { scale: 0.97 }}
        whileHover={{ scale: isDisabled ? 1 : 1.01 }}
        {...props}
      >
        {loading && (
          <motion.span
            className={`${iconSizes[size]} animate-spin`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
            </svg>
          </motion.span>
        )}
        {!loading && leadingIcon && (
          <span className={iconSizes[size]} aria-hidden="true">{leadingIcon}</span>
        )}
        <span className="flex-1 text-center">{children}</span>
        {!loading && trailingIcon && (
          <span className={iconSizes[size]} aria-hidden="true">{trailingIcon}</span>
        )}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

/* Icon Button Variant */
export interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outlined' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  'aria-label': string;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', children, 'aria-label': ariaLabel, loading = false, disabled, className = '', style, whileTap, ...props }, ref) => {
    const isDisabled = disabled || loading;

    const sizeMap = {
      xs: 'w-8 h-8',
      sm: 'w-9 h-9',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-14 h-14',
    };

    const iconSizeMap = {
      xs: 'w-4 h-4',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7',
    };

    return (
      <motion.button
        ref={ref}
        className={`
          inline-flex items-center justify-center rounded-xl
          transition-all motion-standard
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeMap[size]}
          ${className}
        `}
        style={style}
        disabled={isDisabled}
        whileTap={whileTap ?? { scale: 0.9 }}
        whileHover={{ scale: isDisabled ? 1 : 1.05 }}
        aria-label={ariaLabel}
        {...props}
      >
        {loading ? (
          <motion.span
            className={`${iconSizeMap[size]} animate-spin`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
            </svg>
          </motion.span>
        ) : (
          <span className={iconSizeMap[size]} aria-hidden="true">{children}</span>
        )}
      </motion.button>
    );
  }
);

IconButton.displayName = 'IconButton';

/* FAB - Floating Action Button */
export interface FabProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  'aria-label'?: string;
}

export const Fab = forwardRef<HTMLButtonElement, FabProps>(
  ({ variant = 'primary', size = 'md', children, 'aria-label': ariaLabel, className = '', style, whileTap, ...props }, ref) => {
    const variantMap = {
      primary: 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-brand-glow hover:brand-glow-lg',
      secondary: 'bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-accent-glow',
      danger: 'bg-gradient-to-br from-error-500 to-error-600 text-white',
    };

    const sizeMap = {
      sm: 'w-12 h-12',
      md: 'w-14 h-14',
      lg: 'w-16 h-16',
    };

    const iconSizeMap = {
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-7 h-7',
    };

    return (
      <motion.button
        ref={ref}
        className={`
          inline-flex items-center justify-center rounded-2xl
          transition-all motion-emphasized
          ${variantMap[variant]}
          ${sizeMap[size]}
          ${className}
        `}
        style={style}
        whileTap={whileTap ?? { scale: 0.92 }}
        whileHover={{ scale: 1.08, boxShadow: 'var(--shadow-level-4)' }}
        aria-label={ariaLabel}
        {...props}
      >
        <span className={iconSizeMap[size]} aria-hidden="true">{children}</span>
      </motion.button>
    );
  }
);

Fab.displayName = 'Fab';

/* Segmented Button Group */
export interface SegmentedButtonProps {
  options: { value: string; label: React.ReactNode; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  variant?: 'primary' | 'secondary' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

export const SegmentedButton: React.FC<SegmentedButtonProps> = ({
  options,
  value,
  onChange,
  variant = 'outlined',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  const variantMap = {
    primary: 'data-[selected=true]:bg-brand-500 data-[selected=true]:text-white data-[selected=true]:shadow-brand-glow',
    secondary: 'data-[selected=true]:bg-accent-500 data-[selected=true]:text-white data-[selected=true]:shadow-accent-glow',
    outlined: 'data-[selected=true]:bg-surface-3 data-[selected=true]:border-brand-500 data-[selected=true]:text-brand-400',
  };

  const sizeMap = {
    sm: 'px-3 py-1.5 text-label-small gap-1',
    md: 'px-4 py-2 text-label-medium gap-1.5',
    lg: 'px-5 py-2.5 text-label-large gap-2',
  };

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-xl bg-surface-1 border border-outline-variant p-1
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      role="group"
      aria-label="Segmented options"
    >
      {options.map((option) => (
        <motion.button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            flex items-center justify-center font-semibold rounded-lg
            transition-all motion-spring
            border border-transparent
            text-on-surface-variant hover:text-on-surface
            ${variantMap[variant]}
            ${sizeMap[size]}
          `}
          data-selected={value === option.value}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {option.icon && <span aria-hidden="true">{option.icon}</span>}
          <span>{option.label}</span>
        </motion.button>
      ))}
    </div>
  );
};