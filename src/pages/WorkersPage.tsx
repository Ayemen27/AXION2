
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useWorkers, useProjects } from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { useHaptic } from '@/hooks/useHaptic';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { formatCurrency } from '@/constants/config';
import { getWorkerTypes, type WorkerType } from '@/services/staticDataService';
import {
  Plus, Search, Users, Phone, Edit, Trash2, Power, User,
  DollarSign, Briefcase, Building, CheckCircle, XCircle, Loader2,
} from 'lucide-react';

export default function WorkersPage() {
  const { toast } = useToast();
  const { vibrate, notification } = useHaptic();
  const { workers, loading, refetch, addWorker, updateWorker, removeWorker, toggleWorkerActive } = useWorkers();
  const { projects } = useProjects();
  const { selectedProjectId } = useSelectedProject();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingWorker, setEditingWorker] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [workerTypes, setWorkerTypes] = useState<WorkerType[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    dailyWage: '',
    phone: '',
  });

  const resetForm = () => setFormData({ name: '', type: '', dailyWage: '', phone: '' });

  // Load worker types from database
  useEffect(() => {
    getWorkerTypes().then(setWorkerTypes);
  }, []);

  const handleRefresh = useCallback(async () => {
    vibrate('medium');
    await refetch();
    notification('success');
    toast({ title: 'تم التحديث', description: 'تم تحديث قائمة العمال' });
  }, [notification, refetch, toast, vibrate]); // Added handleRefresh to dependency array

  // Listen for ptr-refresh event from AppLayout's pull-to-refresh
  useEffect(() => {
    window.addEventListener('ptr-refresh', handleRefresh);
    return () => window.removeEventListener('ptr-refresh', handleRefresh);
  }, [handleRefresh]);

  const filtered = useMemo(() => {
    return workers.filter(w => {
      const matchSearch = w.name.includes(search) || w.type.includes(search);
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? w.is_active : !w.is_active);
      const matchType = typeFilter === 'all' || w.type === typeFilter;
      const matchProject = !selectedProjectId || w.project_id === selectedProjectId;
      return matchSearch && matchStatus && matchType && matchProject;
    });
  }, [workers, search, statusFilter, typeFilter, selectedProjectId]);

  const stats = useMemo(() => ({
    total: filtered.length,
    active: filtered.filter(w => w.is_active).length,
    inactive: filtered.filter(w => !w.is_active).length,
    totalWages: filtered.filter(w => w.is_active).reduce((s, w) => s + w.dailyWage, 0),
  }), [filtered]);

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.type || !formData.dailyWage) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    vibrate('medium');
    const result = await addWorker({
      name: formData.name,
      type: formData.type,
      dailyWage: Number(formData.dailyWage),
      phone: formData.phone || undefined,
      project_id: selectedProjectId || undefined,
      is_active: true,
    });
    setSaving(false);
    if (result) {
      const project = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null;
      notification('success');
      toast({ title: 'تم بنجاح', description: `تم إضافة ${formData.name}${project ? ` في ${project.name}` : ''}` });
      setShowCreate(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingWorker || !formData.name.trim()) return;
    setSaving(true);
    vibrate('medium');
    const result = await updateWorker(editingWorker, {
      name: formData.name,
      type: formData.type,
      dailyWage: Number(formData.dailyWage),
      phone: formData.phone || undefined,
    });
    setSaving(false);
    if (result) {
      notification('success');
      toast({ title: 'تم التحديث', description: 'تم تحديث بيانات العامل' });
      setEditingWorker(null);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    vibrate('heavy');
    const ok = await removeWorker(deleteId);
    if (ok) {
      notification('warning');
      toast({ title: 'تم الحذف', description: 'تم حذف العامل' });
    }
    setDeleteId(null);
  };

  const openEdit = useCallback((id: string) => {
    const w = workers.find(x => x.id === id);
    if (!w) return;
    setFormData({ name: w.name, type: w.type, dailyWage: String(w.dailyWage), phone: w.phone || '' });
    setEditingWorker(id);
  }, [workers]);

  const WorkerForm = (
    <div className="form-grid">
      <div className="form-field-full">
        <Label>اسم العامل</Label>
        <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="الاسم الكامل" />
      </div>
      <div>
        <Label>التخصص</Label>
        <Select value={formData.type} onValueChange={v => setFormData(f => ({ ...f, type: v }))}>
          <SelectTrigger><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
          <SelectContent>
            {workerTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>الأجر اليومي</Label>
        <Input type="number" value={formData.dailyWage} onChange={e => setFormData(f => ({ ...f, dailyWage: e.target.value }))} placeholder="15000" />
      </div>
      <div>
        <Label>الهاتف</Label>
        <Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="777123456" />
      </div>
      {selectedProjectId && (
        <div className="form-field-full bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5">
          <div className="flex items-center gap-2">
            <Building className="size-3.5 text-blue-600" />
            <div>
              <p className="text-[9px] text-muted-foreground">سيتم إضافة العامل في:</p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {projects.find(p => p.id === selectedProjectId)?.name || 'المشروع المحدد'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5 relative">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          {loading && <Loader2 className="size-3 animate-spin" />}
          {loading ? 'جاري التحميل...' : `${stats.total} عامل • ${stats.active} نشط`}
          {selectedProjectId && !loading && (
            <span className="text-primary font-medium"> — {projects.find(p => p.id === selectedProjectId)?.name}</span>
          )}
        </p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
          <Plus className="size-4 ml-1" /> إضافة عامل
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي العمال', value: stats.total, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'عامل نشط', value: stats.active, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'متوقف', value: stats.inactive, icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'الأجور اليومية', value: loading ? '...' : formatCurrency(stats.totalWages), icon: DollarSign, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`size-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                {loading ? <Skeleton className="h-4 w-12 mt-0.5" /> : <p className={`text-xs font-bold ${c.color}`}>{c.value}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو التخصص..." className="pr-9 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-28 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">متوقف</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-28 rounded-xl"><SelectValue placeholder="التخصص" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {workerTypes.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)}
        </div>
      )}

      {/* Workers Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(worker => {
            const project = projects.find(p => p.id === worker.project_id);
            return (
              <Card key={worker.id} className={`border-0 shadow-sm transition-all ${!worker.is_active ? 'opacity-60' : 'hover:shadow-md'}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${worker.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                      <User className={`size-5 ${worker.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold truncate">{worker.name}</h3>
                        {worker.is_active ? (
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">نشط</Badge>
                        ) : (
                          <Badge className="text-[9px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">متوقف</Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Briefcase className="size-3" /> {worker.type}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <DollarSign className="size-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[10px] text-muted-foreground">الأجر اليومي</p>
                      <p className="text-xs font-bold">{formatCurrency(worker.dailyWage)}</p>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <Building className="size-3.5 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[10px] text-muted-foreground">المشروع</p>
                      <p className="text-[10px] font-medium truncate">{project?.name || 'غير محدد'}</p>
                    </div>
                  </div>

                  {worker.phone && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3" /> {worker.phone}
                    </p>
                  )}

                  <div className="flex gap-1.5 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg h-8" onClick={() => openEdit(worker.id)}>
                      <Edit className="size-3 ml-1" /> تعديل
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className={`text-xs rounded-lg h-8 ${worker.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      onClick={async () => {
                        const result = await toggleWorkerActive(worker.id);
                        if (result) toast({ title: result.is_active ? 'تم التفعيل' : 'تم الإيقاف' });
                      }}
                    >
                      <Power className="size-3" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs rounded-lg h-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(worker.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {selectedProjectId ? `لا يوجد عمال في ${projects.find(p => p.id === selectedProjectId)?.name || 'هذا المشروع'}` : 'لا يوجد عمال'}
          </p>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="mt-3 rounded-xl">
            <Plus className="size-4 ml-1" /> إضافة عامل جديد
          </Button>
        </div>
      )}

      {/* Create Bottom Sheet */}
      <BottomSheet open={showCreate} onOpenChange={setShowCreate} title="إضافة عامل جديد"
        footer={<Button onClick={handleCreate} disabled={saving} className="w-full rounded-xl">
          {saving && <Loader2 className="size-4 animate-spin ml-1" />}إضافة العامل
        </Button>}
      >
        <div className="space-y-4">{WorkerForm}</div>
      </BottomSheet>

      {/* Edit Bottom Sheet */}
      <BottomSheet open={!!editingWorker} onOpenChange={open => { if (!open) setEditingWorker(null); }} title="تعديل العامل"
        footer={<Button onClick={handleEdit} disabled={saving} className="w-full rounded-xl bg-amber-600 hover:bg-amber-700">
          {saving && <Loader2 className="size-4 animate-spin ml-1" />}حفظ التعديلات
        </Button>}
      >
        <div className="space-y-4">{WorkerForm}</div>
      </BottomSheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف العامل</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا العامل؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
