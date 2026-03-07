import { useState, useMemo } from 'react';
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
import { useSuppliers, usePurchases, useSupplierPayments } from '@/hooks/useCloudData';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/constants/config';
import {
  Truck, Phone, ArrowUpCircle, ArrowDownCircle, CheckCircle,
  Plus, Search, Trash2, Package, CreditCard, X,
  ShoppingCart, Receipt, Pencil, Loader2,
} from 'lucide-react';

const SUPPLIER_TYPES = ['حديد', 'إسمنت', 'وقود', 'تشطيبات', 'مواد بناء', 'خرسانة', 'نقل', 'معدات', 'كهرباء', 'سباكة', 'أخرى'];

export default function SuppliersPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { suppliers, loading: loadingSuppliers, addSupplier, updateSupplier, removeSupplier } = useSuppliers();
  const { purchases, loading: loadingPurchases } = usePurchases();
  const { payments, loading: loadingPayments, addPayment, removePayment } = useSupplierPayments();

  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [payDeleteId, setPayDeleteId] = useState<string | null>(null);
  const [editSupplierId, setEditSupplierId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', address: '', type: '' });
  const [payForm, setPayForm] = useState({ amount: '', notes: '', date: new Date().toISOString().split('T')[0] });

  const resetForm = () => { setForm({ name: '', phone: '', address: '', type: '' }); setEditSupplierId(null); };
  const resetPayForm = () => { setPayForm({ amount: '', notes: '', date: new Date().toISOString().split('T')[0] }); };

  const openEditSupplier = (id: string) => {
    const s = suppliers.find(x => x.id === id);
    if (!s) return;
    setForm({ name: s.name, phone: s.phone || '', address: s.address || '', type: s.type });
    setEditSupplierId(id);
    setShowCreate(true);
  };

  const filtered = useMemo(() => suppliers.filter(s =>
    s.name.includes(search) || s.type.includes(search)
  ), [suppliers, search]);

  const totalStats = useMemo(() => ({
    total: suppliers.length,
    totalPurchases: suppliers.reduce((s, sup) => s + (sup.totalPurchases || 0), 0),
    totalPayments: suppliers.reduce((s, sup) => s + (sup.totalPayments || 0), 0),
    totalBalance: suppliers.reduce((s, sup) => s + (sup.balance || 0), 0),
  }), [suppliers]);

  const selectedSupplier = selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId) : null;
  const supplierPurchases = useMemo(() => purchases.filter(p => p.supplier_id === selectedSupplierId), [purchases, selectedSupplierId]);
  const supplierPayments = useMemo(() => payments.filter(p => p.supplier_id === selectedSupplierId), [payments, selectedSupplierId]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.type) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    setSaving(true);
    if (editSupplierId) {
      const result = await updateSupplier(editSupplierId, { name: form.name, phone: form.phone || undefined, address: form.address || undefined, type: form.type });
      if (result) { toast({ title: 'تم التعديل', description: 'تم تعديل بيانات المورد' }); setShowCreate(false); resetForm(); }
    } else {
      const result = await addSupplier({ name: form.name, phone: form.phone || undefined, address: form.address || undefined, type: form.type, totalPurchases: 0, totalPayments: 0, balance: 0, is_active: true });
      if (result) { toast({ title: 'تم بنجاح', description: 'تم إضافة المورد' }); setShowCreate(false); resetForm(); }
    }
    setSaving(false);
  };

  const handlePayment = async () => {
    if (!selectedSupplierId || !payForm.amount) {
      toast({ title: 'خطأ', description: 'يرجى إدخال المبلغ', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const amount = Number(payForm.amount);
    const result = await addPayment({
      supplier_id: selectedSupplierId,
      supplier_name: selectedSupplier?.name || '',
      amount,
      notes: payForm.notes || undefined,
      date: payForm.date,
      created_by: user?.full_name || 'مستخدم',
    });
    if (result) {
      // Update supplier balance
      if (selectedSupplier) {
        await updateSupplier(selectedSupplierId, {
          totalPayments: (selectedSupplier.totalPayments || 0) + amount,
          balance: Math.max(0, (selectedSupplier.balance || 0) - amount),
        });
      }
      toast({ title: 'تم بنجاح', description: `تم تسجيل دفعة ${formatCurrency(amount)}` });
      setShowPayment(false);
      resetPayForm();
    }
    setSaving(false);
  };

  const handleDeleteSupplier = async () => {
    if (!deleteId) return;
    const ok = await removeSupplier(deleteId);
    if (ok) {
      if (selectedSupplierId === deleteId) setSelectedSupplierId(null);
      toast({ title: 'تم الحذف', description: 'تم حذف المورد' });
    }
    setDeleteId(null);
  };

  const handleDeletePayment = async () => {
    if (!payDeleteId) return;
    const pay = payments.find(p => p.id === payDeleteId);
    const ok = await removePayment(payDeleteId);
    if (ok) {
      if (pay && selectedSupplier) {
        await updateSupplier(selectedSupplier.id, {
          totalPayments: Math.max(0, (selectedSupplier.totalPayments || 0) - pay.amount),
          balance: (selectedSupplier.balance || 0) + pay.amount,
        });
      }
      toast({ title: 'تم الحذف', description: 'تم حذف الدفعة' });
    }
    setPayDeleteId(null);
  };

  const loading = loadingSuppliers;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
          {loading && <Loader2 className="size-3 animate-spin" />}
          {loading ? 'جاري التحميل...' : `${totalStats.total} مورد`}
        </p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
          <Plus className="size-4 ml-1" /> إضافة مورد
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'المشتريات', value: totalStats.totalPurchases, icon: ArrowUpCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'المدفوع', value: totalStats.totalPayments, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'المتبقي', value: totalStats.totalBalance, icon: ArrowDownCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`size-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                {loading ? <Skeleton className="h-4 w-16 mt-0.5" /> : <p className={`text-xs font-bold ${c.color}`}>{formatCurrency(c.value)}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Supplier List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="pr-9 rounded-xl" />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(supplier => (
                <Card
                  key={supplier.id}
                  className={`border-0 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedSupplierId === supplier.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedSupplierId(supplier.id === selectedSupplierId ? null : supplier.id)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Truck className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold truncate">{supplier.name}</h3>
                          <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">نشط</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{supplier.type}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-amber-500 hover:text-amber-700" onClick={e => { e.stopPropagation(); openEditSupplier(supplier.id); }}>
                          <Pencil className="size-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="size-7 p-0 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(supplier.id); }}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'مشتريات', value: supplier.totalPurchases || 0, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                        { label: 'مدفوع', value: supplier.totalPayments || 0, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                        { label: 'متبقي', value: supplier.balance || 0, color: (supplier.balance || 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400', bg: (supplier.balance || 0) > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20' },
                      ].map(s => (
                        <div key={s.label} className={`${s.bg} rounded-md p-1.5 text-center`}>
                          <p className={`text-[9px] ${s.color}`}>{s.label}</p>
                          <p className={`text-[9px] font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <Truck className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">لا يوجد موردين</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Supplier Detail */}
        <div className="lg:col-span-2">
          {selectedSupplier ? (
            <Card className="border-0 shadow-sm h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck className="size-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{selectedSupplier.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{selectedSupplier.type}</p>
                      {selectedSupplier.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="size-3" /> {selectedSupplier.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-xl text-xs" onClick={() => { resetPayForm(); setShowPayment(true); }}>
                      <CreditCard className="size-3 ml-1" /> تسجيل دفعة
                    </Button>
                    <Button variant="ghost" size="sm" className="size-8 p-0" onClick={() => setSelectedSupplierId(null)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="purchases">
                  <TabsList className="rounded-xl mb-4">
                    <TabsTrigger value="purchases" className="rounded-lg text-xs">
                      <ShoppingCart className="size-3 ml-1" /> المشتريات ({loadingPurchases ? '...' : supplierPurchases.length})
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="rounded-lg text-xs">
                      <Receipt className="size-3 ml-1" /> الدفعات ({loadingPayments ? '...' : supplierPayments.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="purchases" className="space-y-2 max-h-80 overflow-y-auto">
                    {loadingPurchases ? (
                      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                    ) : supplierPurchases.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">لا توجد مشتريات مسجلة من هذا المورد</p>
                    ) : (
                      supplierPurchases.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/40">
                          <Package className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">{p.material_name} — {p.quantity} {p.unit}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(p.date)}</p>
                          </div>
                          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">{formatCurrency(p.total_price)}</p>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="payments" className="space-y-2 max-h-80 overflow-y-auto">
                    {loadingPayments ? (
                      <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
                    ) : supplierPayments.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة</p>
                        <Button size="sm" variant="outline" className="mt-2 rounded-xl text-xs" onClick={() => { resetPayForm(); setShowPayment(true); }}>
                          <Plus className="size-3 ml-1" /> تسجيل دفعة
                        </Button>
                      </div>
                    ) : (
                      supplierPayments.map(p => (
                        <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-accent/40">
                          <CreditCard className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium">دفعة — {p.created_by}</p>
                            {p.notes && <p className="text-[10px] text-muted-foreground italic">{p.notes}</p>}
                            <p className="text-[10px] text-muted-foreground">{formatDate(p.date)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.amount)}</p>
                            <Button variant="ghost" size="sm" className="size-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => setPayDeleteId(p.id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-border rounded-2xl p-8">
              <div className="text-center">
                <Truck className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">اختر مورداً لعرض تفاصيله</p>
                <p className="text-xs text-muted-foreground/60 mt-1">انقر على أي مورد من القائمة</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Supplier Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editSupplierId ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>اسم المورد <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مؤسسة الرواد للحديد" />
              </div>
              <div className="col-span-2">
                <Label>نوع البضاعة <span className="text-destructive">*</span></Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="777123456" />
              </div>
              <div>
                <Label>العنوان</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="صنعاء - الزبيري" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleCreate} disabled={saving} className={`rounded-xl ${editSupplierId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
                {saving && <Loader2 className="size-4 animate-spin ml-1" />}
                {editSupplierId ? 'حفظ التعديلات' : 'إضافة المورد'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={open => { if (!open) resetPayForm(); setShowPayment(open); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{`تسجيل دفعة لـ ${selectedSupplier?.name}`}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>المبلغ المدفوع <span className="text-destructive">*</span></Label>
                <Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000000" />
              </div>
              <div>
                <Label>التاريخ</Label>
                <Input type="date" value={payForm.date} onChange={e => setPayForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <Label>ملاحظات</Label>
                <Input value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} placeholder="دفعة جزئية..." />
              </div>
            </div>
            {selectedSupplier && (
              <div className="bg-accent/50 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">الرصيد الحالي</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(selectedSupplier.balance || 0)}</span>
                </div>
                {payForm.amount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">الرصيد بعد الدفع</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Math.max(0, (selectedSupplier.balance || 0) - Number(payForm.amount)))}
                    </span>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowPayment(false); resetPayForm(); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handlePayment} disabled={saving} className="rounded-xl">
                {saving && <Loader2 className="size-4 animate-spin ml-1" />}تسجيل الدفعة
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Supplier */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المورد</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا المورد؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSupplier} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment */}
      <AlertDialog open={!!payDeleteId} onOpenChange={open => { if (!open) setPayDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدفعة</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه الدفعة؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePayment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
