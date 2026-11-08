import React, { forwardRef } from 'react';
import { motion } from 'motion/react';

export interface AvatarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDragStart' | 'onDrag' | 'onDragEnd' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop'> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  shape?: 'circle' | 'rounded' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away' | null;
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  border?: boolean;
  borderColor?: 'brand' | 'accent' | 'sun' | 'success' | 'error' | 'white';
  fallbackIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const sizeStyles = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-label-small',
  md: 'w-10 h-10 text-label-medium',
  lg: 'w-12 h-12 text-label-large',
  xl: 'w-16 h-16 text-title-small',
  '2xl': 'w-20 h-20 text-title-medium',
  '3xl': 'w-24 h-24 text-display-small',
  '4xl': 'w-32 h-32 text-display-medium',
};

const shapeStyles = {
  circle: 'rounded-full',
  rounded: 'rounded-2xl',
  square: 'rounded-lg',
};

const statusSize = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-3.5 h-3.5',
  '2xl': 'w-4 h-4',
  '3xl': 'w-5 h-5',
  '4xl': 'w-6 h-6',
};

const statusColors = {
  online: 'bg-success-400',
  offline: 'bg-on-surface-disabled',
  busy: 'bg-error-400',
  away: 'bg-sun-400',
};

const borderColors = {
  brand: 'border-brand-500',
  accent: 'border-accent-500',
  sun: 'border-sun-500',
  success: 'border-success-500',
  error: 'border-error-500',
  white: 'border-white/20',
};

const statusPositions = {
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
};

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name,
      size = 'md',
      shape = 'circle',
      status = null,
      statusPosition = 'bottom-right',
      border = false,
      borderColor = 'white',
      fallbackIcon,
      children,
      className = '',
      style,
      ...props
    },
    ref
  ) => {
    const hasImage = src && src !== '';
    const initials = name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '?';

    const [imageError, setImageError] = React.useState(false);

    return (
      <motion.div
        ref={ref}
        className={`
          relative inline-flex items-center justify-center overflow-hidden
          ${sizeStyles[size]}
          ${shapeStyles[shape]}
          ${border ? `border-2 ${borderColors[borderColor]}` : ''}
          ${className}
        `}
        style={style}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 17 }}
        {...props}
      >
        {/* Image */}
        {hasImage && !imageError && (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Fallback: Children > Initials > Icon */}
        {(!hasImage || imageError) && (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-3 to-surface-2">
            {children || (
              <>
                {fallbackIcon ? (
                  <span aria-hidden="true">{fallbackIcon}</span>
                ) : (
                  <span className="font-bold text-on-surface-variant">{initials}</span>
                )}
              </>
            )}
          </div>
        )}

        {/* Status Indicator */}
        {status && (
          <motion.span
            className={`
              absolute rounded-full border-2 border-surface-0
              ${statusSize[size]}
              ${statusColors[status]}
              ${statusPositions[statusPosition]}
            `}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.2 }}
            aria-label={`Status: ${status}`}
          />
        )}
      </motion.div>
    );
  }
);

Avatar.displayName = 'Avatar';

/* Avatar Group/Stack */
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    alt?: string;
    name?: string;
    size?: AvatarProps['size'];
    borderColor?: AvatarProps['borderColor'];
  }>;
  maxVisible?: number;
  size?: AvatarProps['size'];
  shape?: AvatarProps['shape'];
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({
  avatars,
  maxVisible = 5,
  size = 'md',
  shape = 'circle',
  className = '',
}) => {
  const visibleAvatars = avatars.slice(0, maxVisible);
  const remainingCount = avatars.length - maxVisible;

  const sizeSpacing = {
    xs: '-space-x-1',
    sm: '-space-x-1.5',
    md: '-space-x-2',
    lg: '-space_x-2.5',
    xl: '-space-x-3',
    '2xl': '-space-x-3.5',
    '3xl': '-space-x-4',
    '4xl': '-space-x-5',
  };

  return (
    <div className={`inline-flex ${sizeSpacing[size]} ${className}`} aria-label={`${avatars.length} participants`}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={avatar.src || avatar.name || index}
          src={avatar.src}
          alt={avatar.alt}
          name={avatar.name}
          size={size}
          shape={shape}
          border
          borderColor={avatar.borderColor || 'white'}
          style={{ zIndex: visibleAvatars.length - index }}
        />
      ))}
      {remainingCount > 0 && (
        <Avatar
          name={`${remainingCount}+`}
          size={size}
          shape={shape}
          border
          borderColor="white"
          fallbackIcon={(
            <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize="12" fill="currentColor">+{remainingCount}</text>
            </svg>
          )}
        />
      )}
    </div>
  );
};

/* Avatar with Ring Progress (for game stats) */
export interface AvatarProgressProps extends AvatarProps {
  progress?: number; // 0-100
  progressColor?: 'brand' | 'accent' | 'sun' | 'success' | 'error';
  progressWidth?: number;
  showProgressBackground?: boolean;
}

const progressColors = {
  brand: 'from-brand-500 to-brand-400',
  accent: 'from-accent-500 to-accent-400',
  sun: 'from-sun-500 to-sun-400',
  success: 'from-success-500 to-success-400',
  error: 'from-error-500 to-error-400',
};

export const AvatarProgress: React.FC<AvatarProgressProps> = ({
  progress = 0,
  progressColor = 'brand',
  progressWidth = 3,
  showProgressBackground = true,
  size = 'xl',
  children,
  ...props
}) => {
  const sizePx = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    '2xl': 80,
    '3xl': 96,
    '4xl': 128,
  }[size];

  const radius = (sizePx - progressWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex" style={{ width: sizePx, height: sizePx }}>
      {/* Progress Ring */}
      <svg className="w-full h-full -rotate-90" style={{ width: sizePx, height: sizePx }}>
        {showProgressBackground && (
          <circle
            cx={sizePx / 2}
            cy={sizePx / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={progressWidth}
            className="text-surface-3 opacity-30"
          />
        )}
        <motion.circle
          cx={sizePx / 2}
          cy={sizePx / 2}
          r={radius}
          fill="none"
          strokeWidth={progressWidth}
          strokeLinecap="round"
          className={`bg-gradient-to-r ${progressColors[progressColor]}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
            filter: 'url(#glow)',
          }}
        />
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Avatar */}
      <Avatar size={size} {...props}>
        {children}
      </Avatar>

      {/* Center Content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};