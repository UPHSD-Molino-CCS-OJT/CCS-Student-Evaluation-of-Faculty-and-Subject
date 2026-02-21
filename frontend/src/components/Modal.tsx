import React, { useEffect } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  type?: 'alert' | 'confirm' | 'custom';
  variant?: 'info' | 'warning' | 'danger' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  children?: React.ReactNode;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'custom',
  variant = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  children,
  showCloseButton = true,
  closeOnBackdropClick = true,
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  // Variant colors
  const variantStyles = {
    info: {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      icon: '💡',
    },
    success: {
      border: 'border-green-500',
      bg: 'bg-green-50',
      text: 'text-green-900',
      button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      icon: '✓',
    },
    warning: {
      border: 'border-yellow-500',
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      icon: '⚠️',
    },
    danger: {
      border: 'border-red-500',
      bg: 'bg-red-50',
      text: 'text-red-900',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      icon: '⚠️',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`relative bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all duration-200 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`px-6 py-4 border-b-2 ${style.border} ${style.bg} rounded-t-lg`}>
            <div className="flex items-center justify-between">
              {title && (
                <h3 id="modal-title" className={`text-lg font-semibold ${style.text} flex items-center gap-2`}>
                  {(type === 'alert' || type === 'confirm') && (
                    <span className="text-2xl">{style.icon}</span>
                  )}
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className={`ml-auto text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 ${style.button.split(' ')[2]} rounded-full p-1 transition-colors`}
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">
          {message && <p className="text-gray-700 text-base leading-relaxed">{message}</p>}
          {children && <div className="text-gray-700">{children}</div>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
          {type === 'confirm' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${style.button}`}
              >
                {confirmText}
              </button>
            </>
          )}
          {type === 'alert' && (
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${style.button}`}
            >
              {confirmText}
            </button>
          )}
          {type === 'custom' && onConfirm && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${style.button}`}
              >
                {confirmText}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
