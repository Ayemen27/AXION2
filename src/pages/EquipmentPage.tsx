/**
 * صفحة إدارة المعدات والأدوات — متصلة بـ OnSpace Cloud
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { equipmentService, type Equipment } from '@/services/extraServices';
import { formatCurrency } from '@/constants/config';
import {
  Plus, Search, Wrench, Edit, Trash2, Package,
  CheckCircle2, Settings, DollarSign, Building2,
  Hash, BarChart3, Loader2,
} from 'lucide-react';

const EQUIPMENT_TYPES = [
  'أدوات كهربائية', 'أدوات يدوية', 'أدوات قياس', 'معدات لحام',
  'معدات حفر', 'معدات قطع', 'أدوات ربط', 'مواد كهربائية',
  'معدات أمان', 'أدوات نقل', 'مضخات', 'كمبريسور', 'أخرى',
];

const STATUS_CONFIG = {
  available:     { label: 'متاحة',        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  assigned:      { label: 'مخصصة',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  maintenance:   { label: 'في الصيانة',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  out_of_service:{ label: 'خارج الخدمة', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const CONDITION_CONFIG = {
  excellent: { label: 'ممتاز', color: 'text-emerald-600' },
  good:      { label: 'جيد',   color: 'text-blue-600' },
  fair:      { label: 'مقبول', color: 'text-amber-600' },
  poor:      { label: 'ضعيف',  color: 'text-red-600' },
};

const UNITS = ['قطعة', 'طقم', 'جهاز', 'خرطوم', 'متر', 'لتر'];

export default function EquipmentPage() {
  const { toast } = useToast();
  const { projects } = useProjects();
  const { selectedProjectId } = useSelectedProject();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const emptyForm = {
    name: '', code: '', type: '', unit: 'قطعة', quantity: '1',
    status:      'available' as Equipment['status'],
    condition:   'good'      as Equipment['condition'],
    project_id:  selectedProjectId || '',
    purchase_price: '', purchase_date: '', description: '',
  };
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => { setForm({ ...emptyForm, project_id: selectedProjectId || '' }); setEditingId(null); };

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    const { data, error } = await equipmentService.getAll();
    if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
    else setEquipment(data);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  const filtered = useMemo(() => equipment.filter(e => {
    const matchSearch  = !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.code || '').includes(search) || e.type.includes(search);
    const matchType    = typeFilter   === 'all' || e.type   === typeFilter;
    const matchStatus  = statusFilter === 'all' || e.status === statusFilter;
    const matchProject = !selectedProjectId || !e.project_id || e.project_id === selectedProjectId;
    return matchSearch && matchType && matchStatus && matchProject;
  }), [equipment, search, typeFilter, statusFilter, selectedProjectId]);

  const stats = useMemo(() => ({
    total:       equipment.length,
    available:   equipment.filter(e => e.status === 'available').length,
    maintenance: equipment.filter(e => e.status === 'maintenance').length,
    totalValue:  equipment.reduce((s, e) => s + ((e.purchase_price || 0) * e.quantity), 0),
  }), [equipment]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.type) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name:           form.name,
      code:           form.code           || undefined,
      type:           form.type,
      unit:           form.unit,
      quantity:       Number(form.quantity) || 1,
      status:         form.status,
      condition:      form.condition,
      project_id:     form.project_id     || undefined,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
      purchase_date:  form.purchase_date  || undefined,
      description:    form.description    || undefined,
    };

    if (editingId) {
      const { data, error } = await equipmentService.update(editingId, payload);
      if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
      else { setEquipment(prev => prev.map(e => e.id === editingId ? data! : e)); toast({ title: 'تم التعديل' }); }
    } else {
      const { data, error } = await equipmentService.create(payload as any);
      if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
      else { setEquipment(prev => [data!, ...prev]); toast({ title: 'تمت الإضافة', description: `تم إضافة ${form.name}` }); }
    }
    setSaving(false);
    setShowCreate(false);
    resetForm();
  };

  const openEdit = (e: Equipment) => {
    setForm({
      name: e.name, code: e.code || '', type: e.type, unit: e.unit,
      quantity: String(e.quantity), status: e.status, condition: e.condition,
      project_id: e.project_id || '',
      purchase_price: e.purchase_price ? String(e.purchase_price) : '',
      purchase_date: e.purchase_date || '', description: e.description || '',
    });
    setEditingId(e.id);
    setShowCreate(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const e = equipment.find(x => x.id === deleteId);
    const { error } = await equipmentService.delete(deleteId);
    if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
    else { setEquipment(prev => prev.filter(x => x.id !== deleteId)); toast({ title: 'تم الحذف', description: `تم حذف ${e?.name}` }); }
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{stats.total} معدة وأداة</p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
          <Plus className="size-4 ml-1" /> إضافة معدة
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المعدات', value: stats.total,                      icon: Package,     color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'متاحة',          value: stats.available,                  icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'في الصيانة',     value: stats.maintenance,                icon: Settings,    color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'القيمة الإجمالية', value: formatCurrency(stats.totalValue), icon: DollarSign,  color: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`size-4 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
                <p className={`text-xs font-bold ${c.color}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الرمز أو النوع..." className="pr-9 rounded-xl" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36 rounded-xl"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            {EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(eq => {
            const statusCfg    = STATUS_CONFIG[eq.status];
            const conditionCfg = CONDITION_CONFIG[eq.condition];
            const project      = eq.project_id ? projects.find(p => p.id === eq.project_id) : null;
            return (
              <Card key={eq.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                      <Wrench className="size-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold truncate">{eq.name}</h3>
                        <Badge className={`text-[9px] border-0 ${statusCfg.color}`}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground">{eq.type}</span>
                        {eq.code && <><span className="text-[11px] text-muted-foreground">•</span><span className="text-[11px] font-mono text-muted-foreground">{eq.code}</span></>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <Hash className="size-3 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground">الكمية</p>
                      <p className="text-[11px] font-bold">{eq.quantity} {eq.unit}</p>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <BarChart3 className="size-3 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground">الحالة</p>
                      <p className={`text-[10px] font-bold ${conditionCfg.color}`}>{conditionCfg.label}</p>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <DollarSign className="size-3 text-muted-foreground mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground">السعر</p>
                      <p className="text-[10px] font-bold">{eq.purchase_price ? formatCurrency(eq.purchase_price) : '—'}</p>
                    </div>
                  </div>

                  {project && (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-primary/5">
                      <Building2 className="size-3 text-primary" />
                      <span className="text-[11px] text-primary font-medium truncate">{project.name}</span>
                    </div>
                  )}
                  {eq.description && <p className="text-[10px] text-muted-foreground italic">{eq.description}</p>}

                  <div className="flex gap-1.5 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg h-8" onClick={() => openEdit(eq)}>
                      <Edit className="size-3 ml-1" /> تعديل
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs rounded-lg h-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(eq.id)}>
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
          <Wrench className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لا توجد معدات مسجلة</p>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="mt-3 rounded-xl">
            <Plus className="size-4 ml-1" /> إضافة معدة جديدة
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'تعديل المعدة' : 'إضافة معدة جديدة'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>اسم المعدة / الأداة <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: مثقاب كهربائي" className="rounded-xl" />
              </div>
              <div>
                <Label>رمز المعدة</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="EQ-001" className="rounded-xl" />
              </div>
              <div>
                <Label>الوحدة</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>النوع / الفئة <span className="text-destructive">*</span></Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>{EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الكمية</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="1" className="rounded-xl" />
              </div>
              <div>
                <Label>حالة المعدة</Label>
                <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v as Equipment['condition'] }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CONDITION_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الحالة التشغيلية</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Equipment['status'] }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>المشروع المخصص</Label>
                <Select value={form.project_id || '_none'} onValueChange={v => setForm(f => ({ ...f, project_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="بدون تخصيص" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">بدون تخصيص (مستودع)</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>سعر الشراء</Label>
                <Input type="number" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} placeholder="0" className="rounded-xl" />
              </div>
              <div>
                <Label>تاريخ الشراء</Label>
                <Input type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>الوصف</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للمعدة..." className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleSubmit} disabled={saving} className={`rounded-xl ${editingId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : editingId ? 'حفظ التعديلات' : 'إضافة المعدة'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المعدة</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه المعدة؟</AlertDialogDescription>
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
