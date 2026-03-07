
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
import { useProjects } from '@/hooks/useCloudData';
import { formatCurrency, formatDate, PROJECT_STATUSES } from '@/constants/config';
import { getProjectTypes, type ProjectType } from '@/services/staticDataService';
import { useHaptic } from '@/hooks/useHaptic';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import {
  Plus, Search, Building2, Users, DollarSign,
  Edit, Trash2, MapPin, Calendar, Filter,
  ArrowUpCircle, ArrowDownCircle, Loader2,
} from 'lucide-react';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const { toast } = useToast();
  const { vibrate, notification } = useHaptic();
  const { projects, loading, refetch, addProject, updateProject, removeProject } = useProjects();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as Project['status'],
    project_type_id: 1,
    location: '',
  });

  const resetForm = () => setFormData({ name: '', description: '', status: 'active', project_type_id: 1, location: '' });

  // Load project types from database
  useEffect(() => {
    getProjectTypes().then(setProjectTypes);
  }, []);

  const handleRefresh = useCallback(async () => {
    vibrate('medium');
    await refetch();
    notification('success');
    toast({ title: 'تم التحديث', description: 'تم تحديث قائمة المشاريع' });
  }, [refetch, vibrate, notification, toast]);

  // Listen for ptr-refresh event from AppLayout's centralised pull-to-refresh
  useEffect(() => {
    window.addEventListener('ptr-refresh', handleRefresh);
    return () => window.removeEventListener('ptr-refresh', handleRefresh);
  }, [handleRefresh]);

  const filtered = useMemo(() => {
    return projects.filter(p => {
      const matchSearch = p.name.includes(search) || (p.description || '').includes(search);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [projects, search, statusFilter]);

  const totals = useMemo(() => {
    const income = filtered.reduce((s, p) => s + (p.total_income || 0), 0);
    const expensesSum = filtered.reduce((s, p) => s + (p.total_expenses || 0), 0);
    return { income, expenses: expensesSum, balance: income - expensesSum, count: filtered.length };
  }, [filtered]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'خطأ', description: 'اسم المشروع مطلوب', variant: 'destructive' });
      return;
    }
    setSaving(true);
    vibrate('medium');
    const pt = projectTypes.find(t => t.id === formData.project_type_id);
    const result = await addProject({
      name: formData.name,
      description: formData.description,
      status: formData.status,
      project_type_id: formData.project_type_id,
      project_type_name: pt?.name,
      location: formData.location,
    } as any);
    setSaving(false);
    if (result) {
      notification('success');
      toast({ title: 'تم بنجاح', description: 'تم إضافة المشروع' });
      setShowCreate(false);
      resetForm();
    }
  };

  const handleEdit = async () => {
    if (!editingProject || !formData.name.trim()) return;
    setSaving(true);
    vibrate('medium');
    const pt = projectTypes.find(t => t.id === formData.project_type_id);
    const result = await updateProject(editingProject, {
      name: formData.name,
      description: formData.description,
      status: formData.status,
      project_type_id: formData.project_type_id,
      project_type_name: pt?.name,
      location: formData.location,
    } as any);
    setSaving(false);
    if (result) {
      notification('success');
      toast({ title: 'تم التحديث', description: 'تم تحديث بيانات المشروع' });
      setEditingProject(null);
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    vibrate('heavy');
    const ok = await removeProject(deleteId);
    if (ok) {
      notification('warning');
      toast({ title: 'تم الحذف', description: 'تم حذف المشروع' });
    }
    setDeleteId(null);
  };

  const openEdit = useCallback((id: string) => {
    const p = projects.find(x => x.id === id);
    if (!p) return;
    setFormData({
      name: p.name,
      description: p.description || '',
      status: p.status,
      project_type_id: p.project_type_id || 1,
      location: p.location || '',
    });
    setEditingProject(id);
  }, [projects]);

  const ProjectForm = (
    <div className="space-y-4">
      <div className="form-grid">
        <div className="form-field-full">
          <Label>اسم المشروع</Label>
          <Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="مثال: بئر الخير" />
        </div>
        <div>
          <Label>نوع المشروع</Label>
          <Select value={String(formData.project_type_id)} onValueChange={v => setFormData(f => ({ ...f, project_type_id: Number(v) }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {projectTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>الحالة</Label>
          <Select value={formData.status} onValueChange={v => setFormData(f => ({ ...f, status: v as any }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="form-field-full">
          <Label>الموقع</Label>
          <Input value={formData.location} onChange={e => setFormData(f => ({ ...f, location: e.target.value }))} placeholder="مثال: صنعاء - حدة" />
        </div>
        <div className="form-field-full">
          <Label>الوصف</Label>
          <Input value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للمشروع" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 relative">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          {loading && <Loader2 className="size-3 animate-spin" />}
          {loading ? 'جاري التحميل...' : `${totals.count} مشروع`}
        </p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
          <Plus className="size-4 ml-1" /> إضافة مشروع
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <ArrowUpCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">الدخل</p>
              {loading ? <Skeleton className="h-4 w-16" /> : <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.income)}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <ArrowDownCircle className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">المصروفات</p>
              {loading ? <Skeleton className="h-4 w-16" /> : <p className="text-xs font-bold text-red-600 dark:text-red-400">{formatCurrency(totals.expenses)}</p>}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <DollarSign className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">الرصيد</p>
              {loading ? <Skeleton className="h-4 w-16" /> : <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totals.balance)}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="pr-9 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 rounded-xl"><Filter className="size-4 ml-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {PROJECT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {/* Projects Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const statusInfo = PROJECT_STATUSES.find(s => s.value === project.status) || PROJECT_STATUSES[0];
            return (
              <Card key={project.id} className="border-0 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 pb-3 border-b border-border">
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="size-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold truncate">{project.name}</h3>
                          <Badge className={`text-[9px] ${statusInfo.color} border-0`}>{statusInfo.label}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{project.project_type_name}</p>
                        {project.location && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3" /> {project.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-accent/50 rounded-lg p-2">
                        <Users className="size-3.5 text-muted-foreground mx-auto mb-0.5" />
                        <p className="text-[10px] text-muted-foreground">العمال</p>
                        <p className="text-xs font-bold">{project.total_workers || 0}</p>
                      </div>
                      <div className="bg-accent/50 rounded-lg p-2">
                        <Calendar className="size-3.5 text-muted-foreground mx-auto mb-0.5" />
                        <p className="text-[10px] text-muted-foreground">الأيام</p>
                        <p className="text-xs font-bold">{project.completed_days || 0}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400">الدخل</p>
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(project.total_income || 0)}</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
                        <p className="text-[9px] text-red-600 dark:text-red-400">المصروفات</p>
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400">{formatCurrency(project.total_expenses || 0)}</p>
                      </div>
                      <div className={`${(project.current_balance || 0) >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'} rounded-lg p-2 text-center`}>
                        <p className={`text-[9px] ${(project.current_balance || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>المتبقي</p>
                        <p className={`text-[10px] font-bold ${(project.current_balance || 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>{formatCurrency(project.current_balance || 0)}</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg h-8" onClick={() => openEdit(project.id)}>
                        <Edit className="size-3 ml-1" /> تعديل
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs rounded-lg h-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(project.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد مشاريع</p>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="mt-3 rounded-xl">
            <Plus className="size-4 ml-1" /> إضافة مشروع جديد
          </Button>
        </div>
      )}

      {/* Create Bottom Sheet */}
      <BottomSheet
        open={showCreate}
        onOpenChange={setShowCreate}
        title="إضافة مشروع جديد"
        footer={
          <Button onClick={handleCreate} disabled={saving} className="w-full rounded-xl">
            {saving ? <Loader2 className="size-4 animate-spin ml-1" /> : <Plus className="size-4 ml-1" />}
            إضافة المشروع
          </Button>
        }
      >
        {ProjectForm}
      </BottomSheet>

      {/* Edit Bottom Sheet */}
      <BottomSheet
        open={!!editingProject}
        onOpenChange={open => { if (!open) setEditingProject(null); }}
        title="تعديل المشروع"
        footer={
          <Button onClick={handleEdit} disabled={saving} className="w-full rounded-xl bg-amber-600 hover:bg-amber-700">
            {saving ? <Loader2 className="size-4 animate-spin ml-1" /> : null}
            حفظ التعديلات
          </Button>
        }
      >
        {ProjectForm}
      </BottomSheet>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المشروع</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
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
