import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  className = ''
}) => {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={`fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-gray-900 rounded-lg shadow-lg p-6 focus:outline-none ${className}`}
        >
          {title && (
            <DialogPrimitive.Title className="text-xl font-semibold mb-2">
              {title}
            </DialogPrimitive.Title>
          )}
          
          {description && (
            <DialogPrimitive.Description className="text-gray-400 mb-4">
              {description}
            </DialogPrimitive.Description>
          )}

          {children}

          <DialogPrimitive.Close className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={20} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}; 