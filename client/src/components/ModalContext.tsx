import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Modal, { ModalProps } from './Modal';

interface ModalOptions {
  title?: string;
  message?: string;
  variant?: 'info' | 'warning' | 'danger' | 'success';
  confirmText?: string;
  cancelText?: string;
  showCloseButton?: boolean;
  closeOnBackdropClick?: boolean;
}

interface ModalContextType {
  showAlert: (message: string, options?: ModalOptions) => void;
  showConfirm: (message: string, options?: ModalOptions) => Promise<boolean>;
  showCustomModal: (content: ReactNode, options?: ModalOptions & { onConfirm?: () => void }) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    modalProps: Partial<ModalProps>;
  }>({
    isOpen: false,
    modalProps: {},
  });

  const [confirmResolver, setConfirmResolver] = useState<((value: boolean) => void) | null>(null);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, modalProps: {} });
    if (confirmResolver) {
      confirmResolver(false);
      setConfirmResolver(null);
    }
  }, [confirmResolver]);

  const showAlert = useCallback((message: string, options: ModalOptions = {}) => {
    setModalState({
      isOpen: true,
      modalProps: {
        type: 'alert',
        message,
        title: options.title || 'Notice',
        variant: options.variant || 'info',
        confirmText: options.confirmText || 'OK',
        showCloseButton: options.showCloseButton !== false,
        closeOnBackdropClick: options.closeOnBackdropClick !== false,
      },
    });
  }, []);

  const showConfirm = useCallback((message: string, options: ModalOptions = {}): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmResolver(() => resolve);
      setModalState({
        isOpen: true,
        modalProps: {
          type: 'confirm',
          message,
          title: options.title || 'Confirm',
          variant: options.variant || 'warning',
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          showCloseButton: options.showCloseButton !== false,
          closeOnBackdropClick: options.closeOnBackdropClick !== false,
          onConfirm: () => {
            resolve(true);
            setConfirmResolver(null);
            setModalState({ isOpen: false, modalProps: {} });
          },
        },
      });
    });
  }, []);

  const showCustomModal = useCallback(
    (content: ReactNode, options: ModalOptions & { onConfirm?: () => void } = {}) => {
      setModalState({
        isOpen: true,
        modalProps: {
          type: 'custom',
          children: content,
          title: options.title,
          variant: options.variant || 'info',
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          showCloseButton: options.showCloseButton !== false,
          closeOnBackdropClick: options.closeOnBackdropClick !== false,
          onConfirm: options.onConfirm,
        },
      });
    },
    []
  );

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showCustomModal, closeModal }}>
      {children}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        {...modalState.modalProps}
      />
    </ModalContext.Provider>
  );
};

/**
 * Hook to use the modal context
 * 
 * @example
 * ```tsx
 * const { showAlert, showConfirm } = useModal();
 * 
 * // Show an alert
 * showAlert('Operation completed successfully!', { 
 *   variant: 'success',
 *   title: 'Success' 
 * });
 * 
 * // Show a confirmation dialog
 * const confirmed = await showConfirm('Are you sure you want to delete this item?', {
 *   variant: 'danger',
 *   title: 'Delete Confirmation',
 *   confirmText: 'Delete',
 *   cancelText: 'Cancel'
 * });
 * 
 * if (confirmed) {
 *   // User clicked confirm
 *   deleteItem();
 * }
 * 
 * // Show a custom modal
 * showCustomModal(
 *   <div>
 *     <p>Custom content here</p>
 *     <input type="text" />
 *   </div>,
 *   {
 *     title: 'Custom Modal',
 *     onConfirm: () => console.log('Confirmed')
 *   }
 * );
 * ```
 */
export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
