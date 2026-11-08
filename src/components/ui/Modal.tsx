import React, { Fragment, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { IconButton } from './Button';
import { Card } from './Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'max';
  variant?: 'default' | 'confirmation' | 'form' | 'bottom-sheet';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
  max: 'max-w-5xl',
};

const variantStyles = {
  default: 'rounded-3xl',
  confirmation: 'rounded-3xl max-w-md',
  form: 'rounded-3xl',
  'bottom-sheet': 'rounded-t-3xl max-w-full mx-0 inset-x-0 bottom-0 top-auto',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  variant = 'default',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  headerAction,
  footer,
  className = '',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      // Focus the modal or first focusable element
      setTimeout(() => modalRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  // Trap focus
  useEffect(() => {
    if (!isOpen) return;
    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTab);
    return () => modal.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      <motion.div
        className={`
          fixed inset-0 z-[500] flex items-center justify-center p-4
          ${variant === 'bottom-sheet' ? 'items-end justify-start' : ''}
        `}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={closeOnOverlayClick ? onClose : undefined}
        role="presentation"
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden="true"
        />

        {/* Modal Container */}
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          className={`
            relative w-full ${sizeStyles[size]} ${variantStyles[variant]}
            surface-modal overflow-hidden
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
          initial={{ opacity: 0, scale: 0.95, y: variant === 'bottom-sheet' ? 100 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: variant === 'bottom-sheet' ? 100 : 20 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton || headerAction) && (
            <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-outline-variant">
              <div className="flex-1 min-w-0">
                {title && (
                  <motion.h2
                    id="modal-title"
                    className="text-headline-medium font-bold text-on-surface"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    {title}
                  </motion.h2>
                )}
                {description && (
                  <motion.p
                    id="modal-description"
                    className="text-body-medium text-on-surface-variant mt-1"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    {description}
                  </motion.p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {headerAction}
                {showCloseButton && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label="Close"
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </IconButton>
                )}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-6 pt-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-6 pt-0 border-t border-outline-variant">
              {footer}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

/* Confirmation Dialog */
export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'warning';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
}) => {
  const variantStyles = {
    danger: 'bg-gradient-to-r from-error-500 to-error-600 hover:from-error-400 hover:to-error-500',
    primary: 'bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500',
    warning: 'bg-gradient-to-r from-sun-500 to-sun-600 hover:from-sun-400 hover:to-sun-500',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="confirmation"
      showCloseButton={false}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-outlined"
            disabled={loading}
          >
            {cancelText}
          </button>
          <motion.button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-6 py-3 rounded-xl font-semibold text-white ${variantStyles[variant]} transition-all motion-standard`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1" />
                </svg>
                Confirming...
              </span>
            ) : (
              confirmText
            )}
          </motion.button>
        </>
      }
    >
      <motion.p
        className="text-body-large text-on-surface-variant text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {message}
      </motion.p>
    </Modal>
  );
};

/* Alert Dialog - simpler, no footer actions needed */
export interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
  iconColor?: 'brand' | 'success' | 'error' | 'warning' | 'info';
  actionText?: string;
  onAction?: () => void;
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  icon,
  iconColor = 'brand',
  actionText = 'OK',
  onAction,
}) => {
  const iconColors = {
    brand: 'text-brand-400 bg-brand-500/10',
    success: 'text-success-400 bg-success-500/10',
    error: 'text-error-400 bg-error-500/10',
    warning: 'text-sun-400 bg-sun-500/10',
    info: 'text-accent-400 bg-accent-500/10',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="confirmation"
      showCloseButton={false}
      footer={
        <motion.button
          type="button"
          onClick={onAction ? () => { onAction(); onClose(); } : onClose}
          className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 transition-all motion-standard"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {actionText}
        </motion.button>
      }
    >
      <div className="text-center space-y-4">
        {icon && (
          <motion.div
            className={`inline-flex items-center justify-center p-4 rounded-2xl ${iconColors[iconColor]}`}
            initial={{ scale: 0, rotate: -12 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 17, delay: 0.1 }}
            aria-hidden="true"
          >
            {icon}
          </motion.div>
        )}
        <motion.p
          className="text-body-large text-on-surface-variant"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {message}
        </motion.p>
      </div>
    </Modal>
  );
};

/* Toast/Notification */
export interface ToastProps {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'default';
  action?: { label: string; onClick: () => void };
  onClose: (id: string) => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = 'default',
  action,
  onClose,
  duration = 5000,
}) => {
  const typeStyles = {
    success: 'border-success-500/50 bg-success-500/10 text-success-300',
    error: 'border-error-500/50 bg-error-500/10 text-error-300',
    warning: 'border-sun-500/50 bg-sun-500/10 text-sun-300',
    info: 'border-accent-500/50 bg-accent-500/10 text-accent-300',
    default: 'border-outline-variant bg-surface-2 text-on-surface',
  };

  const icons = {
    success: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    error: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>,
    warning: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    info: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
    default: <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /></svg>,
  };

  return (
    <motion.div
      className={`
        flex items-start gap-3 p-4 rounded-2xl border shadow-level-3
        ${typeStyles[type]}
      `}
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {icons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-medium font-medium">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-2 text-sm font-semibold underline hover:no-underline transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </motion.div>
  );
};

/* Toast Container */
export interface ToastContainerProps {
  toasts: ToastProps[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'bottom-right',
}) => {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={`
        fixed z-[800] flex flex-col gap-3 pointer-events-none
        ${positionStyles[position]}
      `}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="w-full max-w-sm pointer-events-auto">
          <Toast {...toast} />
        </div>
      ))}
    </div>
  );
};