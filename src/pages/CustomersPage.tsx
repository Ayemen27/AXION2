/**
 * صفحة إدارة الزبائن — متصلة بـ OnSpace Cloud
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
import { customerService, type Customer } from '@/services/extraServices';
import { formatDate } from '@/constants/config';
import {
  Plus, Search, Users, Phone, Mail, MapPin,
  Edit, Trash2, User, Building2,
  CheckCircle, XCircle, Loader2,
} from 'lucide-react';

export default function CustomersPage() {
  const { toast } = useToast();
  const { projects } = useProjects();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const emptyForm = {
    name: '', phone: '', email: '', address: '',
    type: 'individual' as Customer['type'],
    status: 'active' as Customer['status'],
    project_id: '', notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await customerService.getAll();
    if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
    else setCustomers(data);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const filtered = useMemo(() => customers.filter(c => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter   === 'all' || c.type   === typeFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  }), [customers, search, typeFilter, statusFilter]);

  const stats = useMemo(() => ({
    total:       customers.length,
    active:      customers.filter(c => c.status === 'active').length,
    companies:   customers.filter(c => c.type   === 'company').length,
    individuals: customers.filter(c => c.type   === 'individual').length,
  }), [customers]);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: 'خطأ', description: 'يرجى إدخال اسم الزبون', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name:       form.name,
      phone:      form.phone     || undefined,
      email:      form.email     || undefined,
      address:    form.address   || undefined,
      type:       form.type,
      status:     form.status,
      project_id: form.project_id || undefined,
      notes:      form.notes     || undefined,
    };

    if (editingId) {
      const { data, error } = await customerService.update(editingId, payload);
      if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); }
      else {
        setCustomers(prev => prev.map(c => c.id === editingId ? data! : c));
        toast({ title: 'تم التعديل', description: `تم تعديل بيانات ${form.name}` });
      }
    } else {
      const { data, error } = await customerService.create(payload as any);
      if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); }
      else {
        setCustomers(prev => [data!, ...prev]);
        toast({ title: 'تمت الإضافة', description: `تم إضافة ${form.name}` });
      }
    }
    setSaving(false);
    setShowCreate(false);
    resetForm();
  };

  const openEdit = (c: Customer) => {
    setForm({
      name: c.name, phone: c.phone || '', email: c.email || '',
      address: c.address || '', type: c.type, status: c.status,
      project_id: c.project_id || '', notes: c.notes || '',
    });
    setEditingId(c.id);
    setShowCreate(true);
  };

  const handleToggleStatus = async (c: Customer) => {
    const newStatus = c.status === 'active' ? 'inactive' : 'active';
    const { data, error } = await customerService.update(c.id, { status: newStatus });
    if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
    else {
      setCustomers(prev => prev.map(x => x.id === c.id ? data! : x));
      toast({ title: newStatus === 'active' ? 'تم التفعيل' : 'تم الإيقاف' });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const c = customers.find(x => x.id === deleteId);
    const { error } = await customerService.delete(deleteId);
    if (error) { toast({ title: 'خطأ', description: error, variant: 'destructive' }); }
    else {
      setCustomers(prev => prev.filter(x => x.id !== deleteId));
      toast({ title: 'تم الحذف', description: `تم حذف ${c?.name}` });
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{stats.total} زبون</p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
          <Plus className="size-4 ml-1" /> إضافة زبون
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الزبائن', value: stats.total,       icon: Users,     color: 'text-indigo-600 dark:text-indigo-400',   bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: 'نشطون',          value: stats.active,       icon: CheckCircle,color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'شركات',          value: stats.companies,    icon: Building2, color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'أفراد',          value: stats.individuals,  icon: User,      color: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`size-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                <p className={`text-lg font-bold ${c.color}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف أو البريد..." className="pr-9 rounded-xl" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="النوع" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="individual">أفراد</SelectItem>
            <SelectItem value="company">شركات</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(customer => {
            const project = customer.project_id ? projects.find(p => p.id === customer.project_id) : null;
            return (
              <Card key={customer.id} className={`border-0 shadow-sm hover:shadow-md transition-all ${customer.status === 'inactive' ? 'opacity-70' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`size-11 rounded-xl flex items-center justify-center shrink-0 ${customer.type === 'company' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'}`}>
                      {customer.type === 'company'
                        ? <Building2 className="size-5 text-blue-600 dark:text-blue-400" />
                        : <User className="size-5 text-indigo-600 dark:text-indigo-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold truncate">{customer.name}</h3>
                        <Badge className={`text-[9px] border-0 ${customer.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'}`}>
                          {customer.status === 'active' ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </div>
                      <Badge className={`text-[9px] border-0 mt-0.5 ${customer.type === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
                        {customer.type === 'company' ? 'شركة' : 'فرد'}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {customer.phone && <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Phone className="size-3 shrink-0" />{customer.phone}</div>}
                    {customer.email && <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Mail className="size-3 shrink-0" />{customer.email}</div>}
                    {customer.address && <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><MapPin className="size-3 shrink-0" />{customer.address}</div>}
                    {project && <div className="flex items-center gap-2 text-[11px] text-primary font-medium"><Building2 className="size-3 shrink-0" />{project.name}</div>}
                  </div>

                  {customer.notes && <p className="text-[10px] text-muted-foreground italic border-t border-border pt-2">{customer.notes}</p>}

                  <div className="flex gap-1.5 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg h-8" onClick={() => openEdit(customer)}>
                      <Edit className="size-3 ml-1" /> تعديل
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className={`text-xs rounded-lg h-8 ${customer.status === 'active' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                      onClick={() => handleToggleStatus(customer)}
                    >
                      {customer.status === 'active' ? <XCircle className="size-3" /> : <CheckCircle className="size-3" />}
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs rounded-lg h-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(customer.id)}>
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
          <p className="text-sm text-muted-foreground">لا يوجد زبائن مسجلون</p>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="mt-3 rounded-xl">
            <Plus className="size-4 ml-1" /> إضافة أول زبون
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'تعديل بيانات الزبون' : 'إضافة زبون جديد'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>اسم الزبون <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="الاسم الكامل أو اسم الشركة" className="rounded-xl" />
              </div>
              <div>
                <Label>نوع الزبون</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as Customer['type'] }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">فرد</SelectItem>
                    <SelectItem value="company">شركة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Customer['status'] }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="777123456" className="rounded-xl" />
              </div>
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>العنوان</Label>
                <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="المدينة - الحي - الشارع" className="rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>المشروع المرتبط</Label>
                <Select value={form.project_id || '_none'} onValueChange={v => setForm(f => ({ ...f, project_id: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="بدون تخصيص" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">بدون ارتباط بمشروع</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>ملاحظات</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية..." className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleSubmit} disabled={saving} className={`rounded-xl ${editingId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : editingId ? 'حفظ التعديلات' : 'إضافة الزبون'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الزبون</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا الزبون؟</AlertDialogDescription>
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
