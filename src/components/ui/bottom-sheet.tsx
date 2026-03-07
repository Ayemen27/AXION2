/**
 * Bottom Sheet Component
 * مكون منبثق من الأسفل للموبايل - مثالي للنماذج والخيارات
 */

import * as React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function BottomSheet({ open, onOpenChange, title, description, children, footer }: BottomSheetProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          {title && (
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
          {footer && <DialogFooter>{footer}</DialogFooter>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col">
        {title && (
          <DrawerHeader className="text-right border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="size-8 p-0">
                  <X className="size-4" />
                </Button>
              </DrawerClose>
            </div>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        {/* scrollable content area */}
        <div className="overflow-y-auto flex-1 p-4">
          {children}
        </div>
        {footer && (
          <DrawerFooter className="border-t border-border pt-3 pb-3 shrink-0">
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
