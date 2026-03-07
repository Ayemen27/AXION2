import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { usePurchases, useSuppliers, useProjects } from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/constants/config';
import {
  Plus, Search, ShoppingCart, Trash2, Building2, Package,
  DollarSign, Hash, Calendar, Truck, Filter, Pencil, Loader2,
} from 'lucide-react';

const UNITS = ['كيس', 'طن', 'متر', 'م²', 'م³', 'قطعة', 'لتر', 'برميل', 'كيلو', 'رزمة', 'لوح', 'مجموعة'];
const MATERIALS = ['إسمنت', 'حديد تسليح', 'رمل ناعم', 'رمل خشن', 'حصى', 'طوب أحمر', 'بلاط', 'خرسانة جاهزة', 'وقود ديزل', 'أنابيب PVC', 'أسلاك كهربائية', 'دهانات', 'ألمنيوم', 'زجاج', 'خشب', 'أخرى'];

export default function PurchasesPage() {
  const { toast } = useToast();
  const { purchases, loading: loadingPurchases, addPurchase, removePurchase } = usePurchases();
  const { suppliers } = useSuppliers();
  const { projects } = useProjects();
  const { selectedProjectId } = useSelectedProject();
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState(selectedProjectId || 'all');
  const [supplierFilter, setSupplierFilter] = useState('all');

  useEffect(() => { setProjectFilter(selectedProjectId || 'all'); }, [selectedProjectId]);

  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');

  const [form, setForm] = useState({
    supplier_id: '', material_name: '', quantity: '', unit: 'كيس', unit_price: '',
    date: new Date().toISOString().split('T')[0], notes: '',
  });

  const resetForm = useCallback(() => {
    setEditingPurchaseId(null);
    setForm({ supplier_id: '', material_name: '', quantity: '', unit: 'كيس', unit_price: '', date: new Date().toISOString().split('T')[0], notes: '' });
  }, []);

  const openEdit = useCallback((id: string) => {
    const p = purchases.find(x => x.id === id);
    if (!p) return;
    setForm({ supplier_id: p.supplier_id, material_name: p.material_name, quantity: String(p.quantity), unit: p.unit, unit_price: String(p.unit_price), date: p.date, notes: p.notes || '' });
    setEditingPurchaseId(id);
    setShowCreate(true);
  }, [purchases]);

  const totalPrice = Number(form.quantity) * Number(form.unit_price) || 0;

  const filtered = useMemo(() => purchases.filter(p => {
    const matchSearch = p.material_name.includes(search) || p.supplier_name.includes(search);
    const matchProject = projectFilter === 'all' || p.project_id === projectFilter;
    const matchSupplier = supplierFilter === 'all' || p.supplier_id === supplierFilter;
    return matchSearch && matchProject && matchSupplier;
  }), [purchases, search, projectFilter, supplierFilter]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, p) => s + p.total_price, 0);
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = purchases.filter(p => p.date === today).reduce((s, p) => s + p.total_price, 0);
    const byProject: Record<string, number> = {};
    filtered.forEach(p => {
      const proj = projects.find(x => x.id === p.project_id);
      const name = proj?.name || 'غير محدد';
      byProject[name] = (byProject[name] || 0) + p.total_price;
    });
    return { total, todayTotal, count: filtered.length, byProject };
  }, [filtered, purchases, projects]);

  const handleCreate = async () => {
    if (!form.supplier_id || !form.material_name || !form.quantity || !form.unit_price) {
      toast({ title: 'خطأ', description: 'يرجى ملء جميع الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    const supplier = suppliers.find(s => s.id === form.supplier_id);
    if (!supplier) return;
    setSaving(true);

    if (editingPurchaseId) {
      const old = purchases.find(p => p.id === editingPurchaseId);
      if (!old) { setSaving(false); return; }
      await removePurchase(editingPurchaseId);
      await addPurchase({ project_id: old.project_id, supplier_id: supplier.id, supplier_name: supplier.name, material_name: form.material_name, quantity: Number(form.quantity), unit: form.unit, unit_price: Number(form.unit_price), total_price: Number(form.quantity) * Number(form.unit_price), date: form.date, notes: form.notes || undefined });
      toast({ title: 'تم التعديل', description: `تم تعديل مشتريات ${form.material_name}` });
    } else {
      if (!selectedProjectId) { toast({ title: 'خطأ', description: 'يرجى اختيار مشروع من الشريط العلوي أولاً', variant: 'destructive' }); setSaving(false); return; }
      const project = projects.find(p => p.id === selectedProjectId);
      await addPurchase({ project_id: selectedProjectId, supplier_id: supplier.id, supplier_name: supplier.name, material_name: form.material_name, quantity: Number(form.quantity), unit: form.unit, unit_price: Number(form.unit_price), total_price: Number(form.quantity) * Number(form.unit_price), date: form.date, notes: form.notes || undefined });
      toast({ title: 'تم بنجاح', description: `تم تسجيل شراء ${form.material_name} في ${project?.name || 'المشروع'}` });
    }
    setSaving(false);
    setShowCreate(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const ok = await removePurchase(deleteId);
    if (ok) toast({ title: 'تم الحذف', description: 'تم حذف سجل الشراء' });
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          {loadingPurchases && <Loader2 className="size-3 animate-spin" />}
          {loadingPurchases ? 'جاري التحميل...' : `${stats.count} عملية شراء`}
        </p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
          <Plus className="size-4 ml-1" /> تسجيل شراء
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المشتريات', value: formatCurrency(stats.total), icon: ShoppingCart, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'مشتريات اليوم', value: formatCurrency(stats.todayTotal), icon: Calendar, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'عدد الفواتير', value: stats.count, icon: Hash, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'عدد الموردين', value: new Set(filtered.map(p => p.supplier_id)).size, icon: Truck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}><c.icon className={`size-4 ${c.color}`} /></div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{c.label}</p>
                {loadingPurchases ? <Skeleton className="h-4 w-16 mt-0.5" /> : <p className={`text-xs font-bold ${c.color}`}>{c.value}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="rounded-xl">
          <TabsTrigger value="list" className="rounded-lg text-xs">قائمة المشتريات</TabsTrigger>
          <TabsTrigger value="summary" className="rounded-lg text-xs">ملخص بالمشروع</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالمادة أو المورد..." className="pr-9 rounded-xl" />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-36 rounded-xl"><Building2 className="size-3 ml-1" /><SelectValue placeholder="المشروع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المشاريع</SelectItem>
                {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-36 rounded-xl"><Truck className="size-3 ml-1" /><SelectValue placeholder="المورد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الموردين</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loadingPurchases ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(purchase => {
                const project = projects.find(p => p.id === purchase.project_id);
                return (
                  <Card key={purchase.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><Package className="size-5 text-blue-600 dark:text-blue-400" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-sm font-semibold truncate">{purchase.material_name}</h3>
                          <Badge className="text-[9px] border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{purchase.quantity} {purchase.unit}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{purchase.supplier_name} • {project?.name || 'غير محدد'} • {formatDate(purchase.date)}</p>
                        {purchase.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic">{purchase.notes}</p>}
                      </div>
                      <div className="text-left shrink-0 flex items-center gap-1">
                        <div className="text-right ml-1">
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(purchase.total_price)}</p>
                          <p className="text-[10px] text-muted-foreground">{formatCurrency(purchase.unit_price)} / {purchase.unit}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="size-8 p-0 text-amber-500 hover:text-amber-700" onClick={() => openEdit(purchase.id)}><Pencil className="size-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="size-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(purchase.id)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <ShoppingCart className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد مشتريات مسجلة</p>
                  <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="mt-3 rounded-xl">
                    <Plus className="size-4 ml-1" /> تسجيل أول شراء
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Building2 className="size-4 text-primary" /> توزيع المشتريات على المشاريع</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(stats.byProject).length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p> : (
                  Object.entries(stats.byProject).sort(([, a], [, b]) => b - a).map(([name, amount]) => {
                    const pct = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="font-medium truncate max-w-[150px]">{name}</span><span className="text-muted-foreground">{formatCurrency(amount)}</span></div>
                        <div className="h-1.5 bg-accent rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Truck className="size-4 text-primary" /> أكثر الموردين مشترياتاً</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {purchases.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات</p> : (
                  Object.entries(purchases.reduce((acc, p) => { acc[p.supplier_name] = (acc[p.supplier_name] || 0) + p.total_price; return acc; }, {} as Record<string, number>))
                    .sort(([, a], [, b]) => b - a).slice(0, 5).map(([name, amount]) => {
                      const total = purchases.reduce((s, p) => s + p.total_price, 0);
                      const pct = total > 0 ? (amount / total) * 100 : 0;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs"><span className="font-medium truncate max-w-[150px]">{name}</span><span className="text-muted-foreground">{formatCurrency(amount)}</span></div>
                          <div className="h-1.5 bg-accent rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingPurchaseId ? 'تعديل بيانات الشراء' : 'تسجيل شراء مواد جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {!editingPurchaseId && selectedProjectId && (
                <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-blue-600" />
                    <div><p className="text-[10px] text-muted-foreground">المشروع المحدد</p><p className="text-xs font-bold text-blue-600 dark:text-blue-400">{projects.find(p => p.id === selectedProjectId)?.name || 'غير محدد'}</p></div>
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <Label>المورد <span className="text-destructive">*</span></Label>
                <Select value={form.supplier_id} onValueChange={v => setForm(f => ({ ...f, supplier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر المورد" /></SelectTrigger>
                  <SelectContent>{suppliers.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.name} — {s.type}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>المادة <span className="text-destructive">*</span></Label>
                <Select value={form.material_name} onValueChange={v => setForm(f => ({ ...f, material_name: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر المادة" /></SelectTrigger>
                  <SelectContent>{MATERIALS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الكمية <span className="text-destructive">*</span></Label><Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="50" /></div>
              <div>
                <Label>الوحدة</Label>
                <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>سعر الوحدة <span className="text-destructive">*</span></Label><Input type="number" value={form.unit_price} onChange={e => setForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="15000" /></div>
              <div><Label>التاريخ</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div className="col-span-2"><Label>ملاحظات</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي ملاحظات إضافية..." /></div>
            </div>
            {totalPrice > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">الإجمالي</span>
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">{formatCurrency(totalPrice)}</span>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleCreate} disabled={saving} className={`rounded-xl ${editingPurchaseId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
                {saving && <Loader2 className="size-4 animate-spin ml-1" />}
                {editingPurchaseId ? 'تحديث الشراء' : 'تسجيل الشراء'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف سجل الشراء</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
