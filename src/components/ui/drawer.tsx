/**
 * Drawer Component (shadcn/ui compatible)
 * مكون درج منبثق من الأسفل
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DrawerContext = React.createContext<DrawerContextValue | undefined>(undefined);

function useDrawer() {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within Drawer');
  }
  return context;
}

interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Drawer({ open, onOpenChange, children }: DrawerProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <DrawerContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DrawerContext.Provider>
  );
}

interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function DrawerContent({ children, className, style, ...props }: DrawerContentProps) {
  const { open, onOpenChange } = useDrawer();

  // Mark body so pull-to-refresh can detect open drawer
  React.useEffect(() => {
    if (open) {
      document.body.setAttribute('data-drawer-open', 'true');
    } else {
      document.body.removeAttribute('data-drawer-open');
    }
    return () => { document.body.removeAttribute('data-drawer-open'); };
  }, [open]);

  if (!open) return null;

  // Detect mobile bottom nav height (lg breakpoint = 1024px)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  const bottomOffset = isMobile ? 72 : 0;

  return (
    <div className="fixed inset-0 z-50" data-drawer-open="true">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer — positioned above bottom nav on mobile */}
      <div
        role="dialog"
        data-state="open"
        className={cn(
          'fixed left-0 right-0 bg-background rounded-t-2xl shadow-2xl',
          'animate-in slide-in-from-bottom duration-300',
          className
        )}
        style={{
          bottom: bottomOffset,
          maxHeight: `calc(90dvh - ${bottomOffset}px)`,
          display: 'flex',
          flexDirection: 'column',
          ...style,
        }}
        onTouchStart={e => e.stopPropagation()}
        onTouchMove={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        {...props}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function DrawerHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-4 pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function DrawerTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-lg font-bold', className)} {...props}>
      {children}
    </h2>
  );
}

export function DrawerDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground mt-1', className)} {...props}>
      {children}
    </p>
  );
}

export function DrawerFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-4 pb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function DrawerClose({ children, asChild, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDrawer();
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onOpenChange(false);
    props.onClick?.(e);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { onClick: handleClick } as any);
  }

  return (
    <button onClick={handleClick} {...props}>
      {children}
    </button>
  );
}
