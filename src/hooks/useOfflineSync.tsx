/**
 * Hook لإدارة المزامنة الأوفلاين والعمليات المعلقة
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

const DB_NAME = 'axion-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-operations';

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async addOperation(operation: PendingOperation): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllOperations(): Promise<PendingOperation[]> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOperation(id: string): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateOperation(operation: PendingOperation): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(operation);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const offlineDB = new OfflineDB();

export function useOfflineSync() {
  const { toast } = useToast();
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // تحميل العمليات المعلقة
  const loadPendingOperations = useCallback(async () => {
    try {
      const operations = await offlineDB.getAllOperations();
      setPendingOperations(operations);
    } catch (error) {
      console.error('Error loading pending operations:', error);
    }
  }, []);

  // إضافة عملية معلقة
  const addPendingOperation = useCallback(async (
    type: PendingOperation['type'],
    entity: string,
    data: any
  ) => {
    const operation: PendingOperation = {
      id: `${entity}-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      entity,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      await offlineDB.addOperation(operation);
      await loadPendingOperations();
      toast({
        title: 'تم الحفظ محلياً',
        description: 'سيتم المزامنة عند الاتصال بالإنترنت',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error adding pending operation:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حفظ العملية',
        variant: 'destructive',
      });
    }
  }, [loadPendingOperations, toast]);

  // تنفيذ عملية واحدة
  const executeOperation = useCallback(async (operation: PendingOperation): Promise<boolean> => {
    try {
      // هنا يمكنك إضافة منطق المزامنة الفعلي مع الخادم
      // حالياً نحذف العملية مباشرة بعد 1 ثانية (للتوضيح فقط)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // في التطبيق الحقيقي، ستقوم بإرسال البيانات للخادم هنا
      console.log('Executing operation:', operation);
      
      return true;
    } catch (error) {
      console.error('Error executing operation:', error);
      return false;
    }
  }, []);

  // مزامنة جميع العمليات المعلقة
  const syncPendingOperations = useCallback(async () => {
    if (isSyncing || pendingOperations.length === 0) return;

    setIsSyncing(true);
    toast({
      title: 'جاري المزامنة...',
      description: `${pendingOperations.length} عملية معلقة`,
    });

    let successCount = 0;
    let failCount = 0;

    for (const operation of pendingOperations) {
      const success = await executeOperation(operation);
      
      if (success) {
        await offlineDB.deleteOperation(operation.id);
        successCount++;
      } else {
        // زيادة عدد المحاولات
        operation.retryCount++;
        if (operation.retryCount < 3) {
          await offlineDB.updateOperation(operation);
        } else {
          // بعد 3 محاولات، احذف العملية
          await offlineDB.deleteOperation(operation.id);
          failCount++;
        }
      }
    }

    await loadPendingOperations();
    setIsSyncing(false);

    if (successCount > 0) {
      toast({
        title: 'تمت المزامنة ✓',
        description: `تم مزامنة ${successCount} عملية بنجاح`,
      });
    }

    if (failCount > 0) {
      toast({
        title: 'تحذير',
        description: `فشلت ${failCount} عملية`,
        variant: 'destructive',
      });
    }
  }, [isSyncing, pendingOperations, executeOperation, loadPendingOperations, toast]);

  // حذف عملية محددة
  const deletePendingOperation = useCallback(async (id: string) => {
    try {
      await offlineDB.deleteOperation(id);
      await loadPendingOperations();
      toast({
        title: 'تم الحذف',
        description: 'تم حذف العملية المعلقة',
      });
    } catch (error) {
      console.error('Error deleting operation:', error);
    }
  }, [loadPendingOperations, toast]);

  // مسح جميع العمليات
  const clearAllOperations = useCallback(async () => {
    try {
      await offlineDB.clearAll();
      await loadPendingOperations();
      toast({
        title: 'تم المسح',
        description: 'تم مسح جميع العمليات المعلقة',
      });
    } catch (error) {
      console.error('Error clearing operations:', error);
    }
  }, [loadPendingOperations, toast]);

  // التحميل الأولي
  useEffect(() => {
    loadPendingOperations();
  }, [loadPendingOperations]);

  // الاستماع لحدث الاتصال بالإنترنت
  useEffect(() => {
    const handleOnline = () => {
      syncPendingOperations();
    };

    window.addEventListener('app-online', handleOnline);

    // الاستماع لرسائل Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_PENDING_OPERATIONS') {
          syncPendingOperations();
        }
      });
    }

    return () => {
      window.removeEventListener('app-online', handleOnline);
    };
  }, [syncPendingOperations]);

  return {
    pendingOperations,
    isSyncing,
    addPendingOperation,
    syncPendingOperations,
    deletePendingOperation,
    clearAllOperations,
    loadPendingOperations,
  };
}
