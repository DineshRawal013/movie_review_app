'use client';

import * as Toast from '@radix-ui/react-toast';
import { useState, createContext, useContext } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastContextValue {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const toast = (msg: Omit<ToastMessage, 'id'>) => {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { ...msg, id }]);
  };

  const dismiss = (id: string) => setMessages((prev) => prev.filter((m) => m.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      <Toast.Provider swipeDirection="right">
        {messages.map((m) => (
          <Toast.Root
            key={m.id}
            open
            onOpenChange={(open) => !open && dismiss(m.id)}
            className={cn(
              'fixed bottom-4 right-4 z-50 w-80 rounded-lg border p-4 shadow-lg',
              m.variant === 'destructive'
                ? 'border-destructive bg-destructive text-destructive-foreground'
                : 'border-border bg-card text-card-foreground',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <Toast.Title className="text-sm font-semibold">{m.title}</Toast.Title>
                {m.description && (
                  <Toast.Description className="text-xs mt-1">{m.description}</Toast.Description>
                )}
              </div>
              <Toast.Close aria-label="Close notification">
                <X className="h-4 w-4" />
              </Toast.Close>
            </div>
          </Toast.Root>
        ))}
        <Toast.Viewport />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
