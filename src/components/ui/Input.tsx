import React, { forwardRef, useId, useState } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Button, IconButton } from './Button';

export interface InputProps extends Omit<HTMLMotionProps<'input'>, 'children' | 'ref' | 'size'> {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const sizeStyles = {
  sm: 'h-9 px-3 text-body-small',
  md: 'h-10 px-4 text-body-medium',
  lg: 'h-12 px-5 text-body-large',
};

const iconSizeMap = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      placeholder,
      error,
      helperText,
      leadingIcon,
      trailingIcon,
      trailingAction,
      type = 'text',
      size = 'md',
      fullWidth = true,
      disabled = false,
      required = false,
      className = '',
      style,
      id: providedId,
      onBlur,
      onFocus,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      onChange?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(e);
    };

    const describedBy = [error && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <motion.label
            htmlFor={id}
            className={`
              block text-label-medium font-semibold text-on-surface-variant mb-1.5
              transition-all motion-fast
              ${focused ? 'text-brand-400' : ''}
              ${hasValue || focused ? 'translate-y-[-1.5rem] scale-85 origin-left text-label-small' : ''}
            `}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {label} {required && <span className="text-error-400" aria-hidden="true">*</span>}
          </motion.label>
        )}

        <div className="relative">
          {leadingIcon && (
            <div className={`
              absolute left-3 top-1/2 -translate-y-1/2
              text-on-surface-disabled pointer-events-none
              transition-colors motion-fast
              ${focused ? 'text-brand-400' : ''}
            `}
              aria-hidden="true"
            >
              <span className={iconSizeMap[size]}>{leadingIcon}</span>
            </div>
          )}

          <motion.input
            ref={ref}
            id={id}
            type={type}
            placeholder={!label ? placeholder : undefined}
            disabled={disabled}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : 'false'}
            className={`
              w-full rounded-xl border-2 bg-surface-1
              transition-all motion-standard
              placeholder:text-on-surface-disabled
              ${sizeStyles[size]}
              ${leadingIcon ? 'pl-10' : ''}
              ${trailingIcon || trailingAction ? 'pr-10' : ''}
              ${focused
                ? 'border-brand-500 shadow-brand-glow-sm'
                : error
                ? 'border-error-500'
                : 'border-outline-variant hover:border-outline'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onBlur={handleBlur}
            onFocus={handleFocus}
            onChange={handleChange}
            style={style}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            {...props}
          />

          {trailingIcon && (
            <div className={`
              absolute right-3 top-1/2 -translate-y-1/2
              text-on-surface-disabled pointer-events-none
            `} aria-hidden="true">
              <span className={iconSizeMap[size]}>{trailingIcon}</span>
            </div>
          )}

          {trailingAction && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {trailingAction}
            </div>
          )}

          {/* Animated border highlight */}
          <motion.div
            className={`
              absolute inset-0 rounded-xl border-2 pointer-events-none
              ${focused ? 'border-brand-500' : error ? 'border-error-500' : 'border-transparent'}
            `}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: focused || error ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ transformOrigin: 'left center' }}
          />
        </div>

        {(error || helperText) && (
          <motion.p
            id={error ? errorId : helperId}
            className={`
              mt-2 text-label-small flex items-center gap-1.5
              ${error ? 'text-error-400' : 'text-on-surface-disabled'}
            `}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role={error ? 'alert' : undefined}
          >
            {error && (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {error || helperText}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/* Textarea */
export interface TextareaProps extends Omit<HTMLMotionProps<'textarea'>, 'children' | 'ref'> {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  rows?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      placeholder,
      error,
      helperText,
      size = 'md',
      fullWidth = true,
      disabled = false,
      required = false,
      rows = 3,
      className = '',
      id: providedId,
      onBlur,
      onFocus,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const sizeStyles = {
      sm: 'p-3 text-body-small',
      md: 'p-4 text-body-medium',
      lg: 'p-5 text-body-large',
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setHasValue(e.target.value.length > 0);
      onChange?.(e);
    };

    const describedBy = [error && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <motion.label
            htmlFor={id}
            className={`
              block text-label-medium font-semibold text-on-surface-variant mb-1.5
              transition-all motion-fast
              ${focused ? 'text-brand-400' : ''}
              ${hasValue || focused ? 'translate-y-[-1.5rem] scale-85 origin-left text-label-small' : ''}
            `}
          >
            {label} {required && <span className="text-error-400" aria-hidden="true">*</span>}
          </motion.label>
        )}

        <motion.textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          required={required}
          placeholder={!label ? placeholder : undefined}
          aria-describedby={describedBy}
          aria-invalid={error ? 'true' : 'false'}
          className={`
            w-full rounded-xl border-2 bg-surface-1 resize-y min-h-[80px]
            transition-all motion-standard
            placeholder:text-on-surface-disabled
            ${sizeStyles[size]}
            ${focused
              ? 'border-brand-500 shadow-brand-glow-sm'
              : error
              ? 'border-error-500'
              : 'border-outline-variant hover:border-outline'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onChange={handleChange}
          {...props}
        />

        {(error || helperText) && (
          <motion.p
            id={error ? errorId : helperId}
            className={`
              mt-2 text-label-small flex items-center gap-1.5
              ${error ? 'text-error-400' : 'text-on-surface-disabled'}
            `}
            role={error ? 'alert' : undefined}
          >
            {error && (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {error || helperText}
          </motion.p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

/* Select */
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps extends Omit<HTMLMotionProps<'select'>, 'children' | 'ref' | 'size'> {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  leadingIcon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      placeholder,
      error,
      helperText,
      options,
      size = 'md',
      fullWidth = true,
      disabled = false,
      required = false,
      className = '',
      id: providedId,
      onBlur,
      onFocus,
      onChange,
      leadingIcon,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;
    const [focused, setFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const sizeStyles = {
      sm: 'h-9 px-3 text-body-small',
      md: 'h-10 px-4 text-body-medium',
      lg: 'h-12 px-5 text-body-large',
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setHasValue(e.target.value !== '');
      onChange?.(e);
    };

    const describedBy = [error && errorId, helperText && helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <motion.label
            htmlFor={id}
            className={`
              block text-label-medium font-semibold text-on-surface-variant mb-1.5
              transition-all motion-fast
              ${focused ? 'text-brand-400' : ''}
              ${hasValue || focused ? 'translate-y-[-1.5rem] scale-85 origin-left text-label-small' : ''}
            `}
          >
            {label} {required && <span className="text-error-400" aria-hidden="true">*</span>}
          </motion.label>
        )}

        <div className="relative">
          {leadingIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-disabled pointer-events-none" aria-hidden="true">
              <span className="w-5 h-5">{leadingIcon}</span>
            </div>
          )}

          <motion.select
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={error ? 'true' : 'false'}
            className={`
              w-full rounded-xl border-2 bg-surface-1 appearance-none
              transition-all motion-standard
              ${sizeStyles[size]}
              ${leadingIcon ? 'pl-10' : ''}
              pr-10
              ${focused
                ? 'border-brand-500 shadow-brand-glow-sm'
                : error
                ? 'border-error-500'
                : 'border-outline-variant hover:border-outline'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            onFocus={(e) => { setFocused(true); onFocus?.(e); }}
            onChange={handleChange}
            {...props}
          >
            {placeholder && (
              <option value="" disabled selected hidden>{placeholder}</option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </motion.select>

          {/* Custom dropdown arrow */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-disabled pointer-events-none" aria-hidden="true">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <motion.div
            className={`
              absolute inset-0 rounded-xl border-2 pointer-events-none
              ${focused ? 'border-brand-500' : error ? 'border-error-500' : 'border-transparent'}
            `}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: focused || error ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={{ transformOrigin: 'left center' }}
          />
        </div>

        {(error || helperText) && (
          <motion.p
            id={error ? errorId : helperId}
            className={`
              mt-2 text-label-small flex items-center gap-1.5
              ${error ? 'text-error-400' : 'text-on-surface-disabled'}
            `}
            role={error ? 'alert' : undefined}
          >
            {error && (
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            )}
            {error || helperText}
          </motion.p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

/* Slider */
export interface SliderProps {
  label?: string;
  value: number | number[];
  onChange: (value: number | number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  range?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  range = false,
  disabled = false,
  fullWidth = true,
  showValue = false,
  formatValue = (v) => String(v),
  className = '',
}) => {
  const [focused, setFocused] = useState(false);
  const [activeThumb, setActiveThumb] = useState<0 | 1 | null>(null);

  const values = Array.isArray(value) ? value : [value];
  const handleChange = (index: number, newValue: number) => {
    const newValues = [...values];
    newValues[index] = Math.max(min, Math.min(max, Math.round(newValue / step) * step));
    if (range) {
      if (index === 0 && newValues[0] > newValues[1]) newValues[0] = newValues[1];
      if (index === 1 && newValues[1] < newValues[0]) newValues[1] = newValues[0];
      onChange(newValues);
    } else {
      onChange(newValues[0]);
    }
  };

  const getPercent = (val: number) => ((val - min) / (max - min)) * 100;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-label-medium font-semibold text-on-surface-variant">{label}</span>}
          {showValue && (
            <span className="text-label-medium font-bold text-brand-400 tabular-nums">
              {range
                ? `${formatValue(values[0])} \u2013 ${formatValue(values[1])}`
                : formatValue(values[0])}
            </span>
          )}
        </div>
      )}

      <div
        className="relative h-2 rounded-full bg-outline-variant"
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={range ? undefined : values[0]}
        aria-orientation="horizontal"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          const idx = activeThumb ?? 0;
          const currentVal = values[idx];
          let newVal = currentVal;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') newVal = currentVal + step;
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') newVal = currentVal - step;
          if (e.key === 'Home') newVal = min;
          if (e.key === 'End') newVal = max;
          if (newVal !== currentVal) {
            e.preventDefault();
            handleChange(idx, newVal);
          }
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        {/* Track fill */}
        <motion.div
          className="absolute top-0 h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
          style={{
            left: range ? `${getPercent(values[0])}%` : '0%',
            width: range ? `${getPercent(values[1]) - getPercent(values[0])}%` : `${getPercent(values[0])}%`,
          }}
          animate={{
            left: range ? `${getPercent(values[0])}%` : '0%',
            width: range ? `${getPercent(values[1]) - getPercent(values[0])}%` : `${getPercent(values[0])}%`,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />

        {/* Thumbs */}
        {values.map((val, index) => (
          <motion.button
            key={index}
            type="button"
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border-2 border-brand-500 shadow-lg"
            style={{ left: `${getPercent(val)}%` }}
            tabIndex={-1}
            disabled={disabled}
            aria-label={range ? (index === 0 ? 'Minimum value' : 'Maximum value') : label}
            aria-valuenow={val}
            aria-valuemin={min}
            aria-valuemax={max}
            onMouseDown={() => setActiveThumb(index as 0 | 1)}
            onTouchStart={() => setActiveThumb(index as 0 | 1)}
            onMouseUp={() => setActiveThumb(null)}
            onTouchEnd={() => setActiveThumb(null)}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 1.1 }}
            animate={{
              scale: (activeThumb === index || focused) ? 1.3 : 1,
              boxShadow: (activeThumb === index || focused) ? '0 0 0 4px var(--color-brand-500 / 0.3)' : 'var(--shadow-level-2)',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          />
        ))}
      </div>
    </div>
  );
};

/* Switch/Toggle */
export interface SwitchProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: { track: 'w-8 h-4', thumb: 'w-3 h-3', translate: 'translate-x-5' },
    md: { track: 'w-11 h-6', thumb: 'w-4 h-4', translate: 'translate-x-6' },
    lg: { track: 'w-14 h-7', thumb: 'w-5 h-5', translate: 'translate-x-8' },
  };

  const s = sizeStyles[size];

  return (
    <label className={`inline-flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <motion.button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`
          relative flex-shrink-0 rounded-full border-2
          transition-all motion-spring
          ${s.track}
          ${checked
            ? 'bg-brand-500 border-brand-500'
            : 'bg-surface-3 border-outline'
          }
          ${disabled ? 'opacity-50' : 'hover:shadow-brand-glow-sm'}
        `}
        whileTap={{ scale: 0.9 }}
        animate={{
          backgroundColor: checked ? 'var(--color-brand-500)' : 'var(--color-surface-3)',
          borderColor: checked ? 'var(--color-brand-500)' : 'var(--color-outline)',
        }}
      >
        <motion.span
          className={`
            absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-white shadow-lg
            ${s.thumb}
            transition-all motion-spring
          `}
          animate={{
            x: checked ? s.translate : '0px',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.button>
      {(label || description) && (
        <div className="min-w-0">
          {label && <span className="block text-body-medium font-semibold text-on-surface">{label}</span>}
          {description && <span className="block text-body-small text-on-surface-variant mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
};

/* Chip */
export interface ChipProps {
  label?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  avatar?: string;
  variant?: 'default' | 'outlined' | 'elevated' | 'filter' | 'input' | 'suggestion' | 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'error';
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  removable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  children,
  icon,
  avatar,
  variant = 'default',
  selected = false,
  disabled = false,
  onClick,
  onRemove,
  removable = false,
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-label-small gap-1',
    md: 'px-3 py-1 text-label-medium gap-1.5',
    lg: 'px-4 py-1.5 text-label-large gap-2',
  };

  const variantStyles = {
    default: 'bg-surface-2 text-on-surface border border-outline-variant',
    outlined: 'bg-transparent text-on-surface-variant border-2 border-outline',
    elevated: 'bg-surface-2 text-on-surface shadow-level-1',
    filter: selected
      ? 'bg-brand-500 text-white border-brand-500 shadow-brand-glow'
      : 'bg-surface-2 text-on-surface-variant border border-outline-variant hover:border-brand-500 hover:text-brand-400',
    input: 'bg-brand-500/15 text-brand-400 border border-brand-500/30',
    suggestion: 'bg-accent-500/15 text-accent-400 border border-accent-500/30',
    primary: 'bg-brand-500/15 text-brand-400 border border-brand-500/30',
    secondary: 'bg-accent-500/15 text-accent-400 border border-accent-500/30',
    ghost: 'bg-transparent text-on-surface-variant',
    success: 'bg-success-500/15 text-success-400 border border-success-500/30',
    warning: 'bg-sun-500/15 text-sun-400 border border-sun-500/30',
    error: 'bg-error-500/15 text-error-400 border border-error-500/30',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const avatarSize = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-label-small',
    lg: 'w-7 h-7 text-label-medium',
  };

  const isButton = !!onClick;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isButton && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick?.();
    }
  };

  const chipClasses = `
    inline-flex items-center justify-center font-semibold rounded-full
    transition-all motion-standard
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${sizeStyles[size]}
    ${variantStyles[variant]}
    ${isButton && 'hover:scale-105 active:scale-95'}
    ${className}
  `;

  if (isButton) {
    return (
      <motion.button
        type="button"
        className={chipClasses}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        {avatar && (
          <img
            src={avatar}
            alt=""
            className={`${avatarSize[size]} rounded-full object-cover border border-white/10`}
            aria-hidden="true"
          />
        )}
        {icon && !avatar && <span className={iconSize[size]} aria-hidden="true">{icon}</span>}
        <span>{children ?? label}</span>
        {removable && onRemove && (
          <motion.button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className={`
              ml-1 p-0.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/10
              transition-colors motion-fast
              ${iconSize[size]}
            `}
            whileTap={{ scale: 1.2 }}
            aria-label="Remove"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </motion.button>
        )}
      </motion.button>
    );
  }

  return (
    <motion.span
      className={chipClasses}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={isButton ? 'button' : undefined}
      tabIndex={isButton ? 0 : undefined}
      aria-disabled={disabled}
    >
      {avatar && (
        <img
          src={avatar}
          alt=""
          className={`${avatarSize[size]} rounded-full object-cover border border-white/10`}
          aria-hidden="true"
        />
      )}
      {icon && !avatar && <span className={iconSize[size]} aria-hidden="true">{icon}</span>}
      <span>{children ?? label}</span>
      {removable && onRemove && (
        <motion.button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className={`
            ml-1 p-0.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-white/10
            transition-colors motion-fast
            ${iconSize[size]}
          `}
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
};