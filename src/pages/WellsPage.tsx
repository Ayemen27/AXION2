/**
 * صفحة إدارة الآبار — متصلة بـ OnSpace Cloud
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useProjects, useAttendance, usePurchases, useExpenses, useWorkerMiscExpenses } from '@/hooks/useCloudData';
import { useSelectedProject } from '@/hooks/useSelectedProject';
import { wellService, type Well } from '@/services/extraServices';
import { formatCurrency } from '@/constants/config';
import {
  Plus, Search, MapPin, Edit, Trash2, Droplets,
  CheckCircle2, Clock, AlertCircle, BarChart3,
  Hash, Layers, ArrowDown, TrendingUp, Wrench,
  DollarSign, Users, Package, Truck, Receipt, Loader2,
} from 'lucide-react';

const REGIONS = [
  'دار حمدين', 'بيت الشعيب', 'الشبيطا', 'الحندج',
  'محيران', 'جربياح', 'الربعي', 'بيت الزين', 'أخرى',
];
const FAN_TYPES  = ['سابمرسبل', 'طردي', 'بستون', 'هيليكس', 'غاطس', 'أخرى'];
const PUMP_POWERS = ['1 حصان', '1.5 حصان', '2 حصان', '3 حصان', '5 حصان', '7.5 حصان', '10 حصان'];

const STATUS_CONFIG = {
  pending:     { label: 'لم يبدأ',      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',       icon: AlertCircle,  border: 'border-gray-200 dark:border-gray-700' },
  in_progress: { label: 'قيد التنفيذ', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',   icon: Clock,        border: 'border-amber-200 dark:border-amber-800' },
  completed:   { label: 'منجز',         color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle2, border: 'border-emerald-200 dark:border-emerald-800' },
};

export default function WellsPage() {
  const { toast } = useToast();
  const { projects } = useProjects();
  const { selectedProjectId } = useSelectedProject();
  const { attendance } = useAttendance();
  const { purchases }  = usePurchases();
  const { expenses }   = useExpenses();
  const { miscExpenses } = useWorkerMiscExpenses();

  const [wells, setWells] = useState<Well[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [costReportWellId, setCostReportWellId] = useState<string | null>(null);

  const fetchWells = useCallback(async () => {
    setLoading(true);
    const { data, error } = await wellService.getAll(selectedProjectId || undefined);
    if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
    else setWells(data);
    setLoading(false);
  }, [selectedProjectId, toast]);

  useEffect(() => { fetchWells(); }, [fetchWells]);

  const emptyForm = {
    ownerName: '', region: '', numberOfBases: '', numberOfPanels: '',
    wellDepth: '', waterLevel: '', numberOfPipes: '', fanType: '',
    pumpPower: '', status: 'pending' as Well['status'],
    completionPercentage: '0', startDate: '', completionDate: '', notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  // حساب تكلفة كل بئر
  const wellCosts = useMemo(() => {
    const map: Record<string, { wages: number; materials: number; transport: number; misc: number; total: number }> = {};
    wells.forEach(w => { map[w.id] = { wages: 0, materials: 0, transport: 0, misc: 0, total: 0 }; });

    attendance.forEach(a => {
      if (a.well_id && map[a.well_id]) { map[a.well_id].wages += a.earned; map[a.well_id].total += a.earned; }
    });
    purchases.forEach(p => {
      const wid = (p as any).well_id;
      if (wid && map[wid]) { map[wid].materials += p.total_price; map[wid].total += p.total_price; }
    });
    expenses.forEach(e => {
      const wid = (e as any).well_id;
      if (wid && map[wid]) { map[wid].transport += e.amount; map[wid].total += e.amount; }
    });
    miscExpenses.forEach(m => {
      const wid = (m as any).well_id;
      if (wid && map[wid]) { map[wid].misc += m.amount; map[wid].total += m.amount; }
    });
    return map;
  }, [wells, attendance, purchases, expenses, miscExpenses]);

  const getWellRecords = (wellId: string) => ({
    attendance: attendance.filter(a => a.well_id === wellId),
    purchases:  purchases.filter(p => (p as any).well_id === wellId),
    transport:  expenses.filter(e => (e as any).well_id === wellId),
    misc:       miscExpenses.filter(m => (m as any).well_id === wellId),
  });

  const filtered = useMemo(() =>
    wells.filter(w => {
      const matchSearch  = !search || w.owner_name.toLowerCase().includes(search.toLowerCase()) || String(w.well_number).includes(search) || w.region.includes(search);
      const matchRegion  = regionFilter === 'all' || w.region === regionFilter;
      const matchStatus  = statusFilter === 'all' || w.status === statusFilter;
      return matchSearch && matchRegion && matchStatus;
    }),
    [wells, search, regionFilter, statusFilter]
  );

  const stats = useMemo(() => ({
    total:      wells.length,
    completed:  wells.filter(w => w.status === 'completed').length,
    inProgress: wells.filter(w => w.status === 'in_progress').length,
    pending:    wells.filter(w => w.status === 'pending').length,
    totalCost:  wells.reduce((s, w) => s + (wellCosts[w.id]?.total || 0), 0),
  }), [wells, wellCosts]);

  const nextWellNumber = useMemo(() => {
    if (wells.length === 0) return 1;
    return Math.max(...wells.map(w => w.well_number)) + 1;
  }, [wells]);

  const handleSubmit = async () => {
    if (!form.ownerName.trim() || !form.region || !form.wellDepth) {
      toast({ title: 'خطأ', description: 'يرجى ملء الحقول المطلوبة', variant: 'destructive' });
      return;
    }
    if (!selectedProjectId && !editingId) {
      toast({ title: 'خطأ', description: 'يرجى اختيار مشروع من الشريط العلوي أولاً', variant: 'destructive' });
      return;
    }
    setSaving(true);

    if (editingId) {
      const { data, error } = await wellService.update(editingId, {
        owner_name:           form.ownerName,
        region:               form.region,
        number_of_bases:      Number(form.numberOfBases) || 0,
        number_of_panels:     Number(form.numberOfPanels) || 0,
        well_depth:           Number(form.wellDepth),
        water_level:          form.waterLevel ? Number(form.waterLevel) : undefined,
        number_of_pipes:      Number(form.numberOfPipes) || 0,
        fan_type:             form.fanType    || undefined,
        pump_power:           form.pumpPower  || undefined,
        status:               form.status,
        completion_percentage:Number(form.completionPercentage) || 0,
        start_date:           form.startDate      || undefined,
        completion_date:      form.completionDate || undefined,
        notes:                form.notes          || undefined,
      });
      if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
      else { setWells(prev => prev.map(w => w.id === editingId ? data! : w)); toast({ title: 'تم التعديل' }); }
    } else {
      const { data, error } = await wellService.create({
        project_id:           selectedProjectId!,
        well_number:          nextWellNumber,
        owner_name:           form.ownerName,
        region:               form.region,
        number_of_bases:      Number(form.numberOfBases) || 0,
        number_of_panels:     Number(form.numberOfPanels) || 0,
        well_depth:           Number(form.wellDepth),
        water_level:          form.waterLevel ? Number(form.waterLevel) : undefined,
        number_of_pipes:      Number(form.numberOfPipes) || 0,
        fan_type:             form.fanType    || undefined,
        pump_power:           form.pumpPower  || undefined,
        status:               form.status,
        completion_percentage:Number(form.completionPercentage) || 0,
        start_date:           form.startDate      || undefined,
        completion_date:      form.completionDate || undefined,
        notes:                form.notes          || undefined,
      });
      if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
      else {
        setWells(prev => [...prev, data!]);
        toast({ title: 'تمت الإضافة', description: `تم إضافة البئر رقم ${nextWellNumber} لـ ${form.ownerName}` });
      }
    }
    setSaving(false);
    setShowCreate(false);
    resetForm();
  };

  const openEdit = (w: Well) => {
    setForm({
      ownerName:            w.owner_name,
      region:               w.region,
      numberOfBases:        String(w.number_of_bases),
      numberOfPanels:       String(w.number_of_panels),
      wellDepth:            String(w.well_depth),
      waterLevel:           w.water_level    ? String(w.water_level) : '',
      numberOfPipes:        String(w.number_of_pipes),
      fanType:              w.fan_type        || '',
      pumpPower:            w.pump_power      || '',
      status:               w.status,
      completionPercentage: String(w.completion_percentage),
      startDate:            w.start_date      || '',
      completionDate:       w.completion_date || '',
      notes:                w.notes           || '',
    });
    setEditingId(w.id);
    setShowCreate(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const w = wells.find(x => x.id === deleteId);
    const { error } = await wellService.delete(deleteId);
    if (error) toast({ title: 'خطأ', description: error, variant: 'destructive' });
    else { setWells(prev => prev.filter(x => x.id !== deleteId)); toast({ title: 'تم الحذف', description: `تم حذف بئر ${w?.owner_name}` }); }
    setDeleteId(null);
  };

  const costReportWell = costReportWellId ? wells.find(w => w.id === costReportWellId) : null;
  const costReportData = costReportWellId ? wellCosts[costReportWellId] : null;
  const costReportRecords = costReportWellId ? getWellRecords(costReportWellId) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {stats.total} بئر
          {selectedProjectId && <span className="text-primary font-medium"> — {projects.find(p => p.id === selectedProjectId)?.name}</span>}
        </p>
        <Button onClick={() => { resetForm(); setShowCreate(true); }} className="rounded-xl">
          <Plus className="size-4 ml-1" /> إضافة بئر
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي الآبار',   value: stats.total,                      icon: Droplets,   color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'منجز',            value: stats.completed,                  icon: CheckCircle2,color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'قيد التنفيذ',     value: stats.inProgress,                 icon: Clock,      color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'إجمالي التكلفة', value: formatCurrency(stats.totalCost), icon: DollarSign, color: 'text-red-600 dark:text-red-400',           bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(c => (
          <Card key={c.label} className="border-0 shadow-sm">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`size-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`size-4 ${c.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                <p className={`text-xs font-bold ${c.color}`}>{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث باسم المالك أو رقم البئر..." className="pr-9 rounded-xl" />
        </div>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-36 rounded-xl"><MapPin className="size-3 ml-1" /><SelectValue placeholder="المنطقة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المناطق</SelectItem>
            {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 rounded-xl"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="pending">لم يبدأ</SelectItem>
            <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
            <SelectItem value="completed">منجز</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(well => {
            const cfg = STATUS_CONFIG[well.status];
            const StatusIcon = cfg.icon;
            const project = projects.find(p => p.id === well.project_id);
            const cost = wellCosts[well.id] || { wages: 0, materials: 0, transport: 0, misc: 0, total: 0 };
            return (
              <Card key={well.id} className={`border shadow-sm hover:shadow-md transition-all overflow-hidden ${cfg.border}`}>
                <CardContent className="p-0">
                  <div className="p-3 pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                          <Droplets className="size-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-muted-foreground">#{well.well_number}</span>
                            <h3 className="text-sm font-bold truncate">{well.owner_name}</h3>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 text-muted-foreground" />
                            <p className="text-[11px] text-muted-foreground">{well.region}</p>
                          </div>
                        </div>
                      </div>
                      <Badge className={`text-[9px] border-0 shrink-0 ${cfg.color}`}>
                        <StatusIcon className="size-2.5 ml-1" />{cfg.label}
                      </Badge>
                    </div>
                  </div>

                  {well.status !== 'pending' && (
                    <div className="px-3 pb-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>نسبة الإنجاز</span><span className="font-bold">{well.completion_percentage}%</span>
                      </div>
                      <div className="h-1.5 bg-accent rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${well.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${well.completion_percentage}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1 px-3 pb-2">
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <ArrowDown className="size-3 text-blue-500 mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground">العمق</p>
                      <p className="text-[10px] font-bold">{well.well_depth}م</p>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <Layers className="size-3 text-emerald-500 mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground">القواعد</p>
                      <p className="text-[10px] font-bold">{well.number_of_bases}</p>
                    </div>
                    <div className="bg-accent/50 rounded-lg p-2 text-center">
                      <Hash className="size-3 text-purple-500 mx-auto mb-0.5" />
                      <p className="text-[9px] text-muted-foreground">الأنابيب</p>
                      <p className="text-[10px] font-bold">{well.number_of_pipes}</p>
                    </div>
                  </div>

                  {cost.total > 0 ? (
                    <div className="mx-3 mb-2 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-900/30 p-2.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-red-700 dark:text-red-400 flex items-center gap-1"><DollarSign className="size-3" /> إجمالي التكلفة</span>
                        <span className="text-sm font-bold text-red-600 dark:text-red-400">{formatCurrency(cost.total)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {cost.wages     > 0 && <div className="flex items-center gap-1 text-[9px] text-muted-foreground"><Users className="size-2.5 text-blue-500" /><span>أجور: {formatCurrency(cost.wages)}</span></div>}
                        {cost.materials > 0 && <div className="flex items-center gap-1 text-[9px] text-muted-foreground"><Package className="size-2.5 text-emerald-500" /><span>مواد: {formatCurrency(cost.materials)}</span></div>}
                        {cost.transport > 0 && <div className="flex items-center gap-1 text-[9px] text-muted-foreground"><Truck className="size-2.5 text-orange-500" /><span>نقل: {formatCurrency(cost.transport)}</span></div>}
                        {cost.misc      > 0 && <div className="flex items-center gap-1 text-[9px] text-muted-foreground"><Receipt className="size-2.5 text-purple-500" /><span>نثريات: {formatCurrency(cost.misc)}</span></div>}
                      </div>
                    </div>
                  ) : (
                    <div className="mx-3 mb-2 rounded-xl bg-accent/30 p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">لا توجد تكاليف مرتبطة بعد</p>
                    </div>
                  )}

                  {(well.fan_type || well.pump_power || project) && (
                    <div className="px-3 pb-2 flex flex-wrap gap-1">
                      {well.fan_type  && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[10px]"><Wrench className="size-2.5" />{well.fan_type}</span>}
                      {well.pump_power && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-[10px]"><TrendingUp className="size-2.5" />{well.pump_power}</span>}
                      {project && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px]">{project.name}</span>}
                    </div>
                  )}

                  {well.notes && <p className="px-3 pb-2 text-[10px] text-muted-foreground italic">{well.notes}</p>}

                  <div className="flex gap-1.5 px-3 pb-3 pt-1 border-t border-border">
                    <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg h-8 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20" onClick={() => setCostReportWellId(well.id)}>
                      <BarChart3 className="size-3 ml-1" /> التكلفة
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs rounded-lg h-8" onClick={() => openEdit(well)}>
                      <Edit className="size-3 ml-1" /> تعديل
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs rounded-lg h-8 text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(well.id)}>
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
          <Droplets className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {selectedProjectId ? `لا توجد آبار في ${projects.find(p => p.id === selectedProjectId)?.name || 'هذا المشروع'}` : 'لا توجد آبار مسجلة'}
          </p>
          <Button onClick={() => { resetForm(); setShowCreate(true); }} variant="outline" className="mt-3 rounded-xl">
            <Plus className="size-4 ml-1" /> إضافة بئر جديد
          </Button>
        </div>
      )}

      {/* Cost Report Dialog */}
      <Dialog open={!!costReportWellId} onOpenChange={open => { if (!open) setCostReportWellId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="size-5 text-blue-500" />
              تقرير التكلفة — {costReportWell ? `#${costReportWell.well_number} ${costReportWell.owner_name}` : ''}
            </DialogTitle>
          </DialogHeader>
          {costReportWell && costReportData && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-muted-foreground">المنطقة</p><p className="text-xs font-bold">{costReportWell.region}</p></div>
                <div><p className="text-[10px] text-muted-foreground">العمق</p><p className="text-xs font-bold">{costReportWell.well_depth} م</p></div>
                <div><p className="text-[10px] text-muted-foreground">الحالة</p><Badge className={`text-[9px] border-0 ${STATUS_CONFIG[costReportWell.status].color}`}>{STATUS_CONFIG[costReportWell.status].label}</Badge></div>
                <div><p className="text-[10px] text-muted-foreground">نسبة الإنجاز</p><p className="text-xs font-bold">{costReportWell.completion_percentage}%</p></div>
              </div>

              <div className={`rounded-xl p-4 text-center ${costReportData.total > 0 ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-900/30' : 'bg-accent/50'}`}>
                <p className="text-xs text-muted-foreground mb-1">إجمالي التكلفة</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(costReportData.total)}</p>
              </div>

              {costReportData.total > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'أجور العمال', value: costReportData.wages,     icon: Users,    color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'مشتريات',     value: costReportData.materials,  icon: Package,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    { label: 'نقل',         value: costReportData.transport,  icon: Truck,    color: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-900/20' },
                    { label: 'نثريات',      value: costReportData.misc,       icon: Receipt,  color: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-900/20' },
                  ].map(c => {
                    const pct = costReportData.total > 0 ? Math.round((c.value / costReportData.total) * 100) : 0;
                    return (
                      <div key={c.label} className={`${c.bg} rounded-xl p-3`}>
                        <div className="flex items-center gap-1.5 mb-1"><c.icon className={`size-3.5 ${c.color}`} /><p className="text-[10px] text-muted-foreground">{c.label}</p></div>
                        <p className={`text-sm font-bold ${c.color}`}>{formatCurrency(c.value)}</p>
                        <div className="mt-1 h-1 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                          <div className="h-full bg-current rounded-full opacity-60" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{pct}% من الإجمالي</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {costReportRecords && costReportData.total === 0 && (
                <div className="text-center py-6">
                  <BarChart3 className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد سجلات مالية مرتبطة بهذا البئر</p>
                  <p className="text-[10px] text-muted-foreground mt-1">عند إضافة مصروفات، اختر رقم البئر لربطها بهذا التقرير</p>
                </div>
              )}

              {costReportRecords && costReportRecords.attendance.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1"><Users className="size-3.5" /> سجلات الأجور ({costReportRecords.attendance.length})</p>
                  <div className="space-y-1.5">
                    {costReportRecords.attendance.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10 text-xs">
                        <div><p className="font-medium">{a.worker_name}</p><p className="text-[10px] text-muted-foreground">{a.date} • {a.hours / 8} يوم</p></div>
                        <span className="font-bold text-blue-600">{formatCurrency(a.earned)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostReportWellId(null)} className="rounded-xl">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={open => { if (!open) resetForm(); setShowCreate(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="size-5 text-blue-500" />
              {editingId ? 'تعديل بيانات البئر' : `إضافة بئر جديد${selectedProjectId ? ` — ${projects.find(p => p.id === selectedProjectId)?.name}` : ''}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingId && selectedProjectId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 flex items-center gap-2">
                <BarChart3 className="size-4 text-blue-600" />
                <div>
                  <p className="text-[10px] text-muted-foreground">المشروع</p>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{projects.find(p => p.id === selectedProjectId)?.name}</p>
                </div>
                <div className="mr-auto bg-blue-100 dark:bg-blue-900/40 rounded-lg px-2 py-1">
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">رقم البئر: <span className="font-bold">{nextWellNumber}</span></p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>اسم المالك <span className="text-destructive">*</span></Label>
                <Input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} placeholder="اسم صاحب البئر" className="rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>المنطقة <span className="text-destructive">*</span></Label>
                <Select value={form.region} onValueChange={v => setForm(f => ({ ...f, region: v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                  <SelectContent>{REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>عمق البئر (م) <span className="text-destructive">*</span></Label>
                <Input type="number" value={form.wellDepth} onChange={e => setForm(f => ({ ...f, wellDepth: e.target.value }))} placeholder="120" className="rounded-xl" />
              </div>
              <div>
                <Label>مستوى الماء (م)</Label>
                <Input type="number" value={form.waterLevel} onChange={e => setForm(f => ({ ...f, waterLevel: e.target.value }))} placeholder="80" className="rounded-xl" />
              </div>
              <div>
                <Label>عدد القواعد</Label>
                <Input type="number" value={form.numberOfBases} onChange={e => setForm(f => ({ ...f, numberOfBases: e.target.value }))} placeholder="0" className="rounded-xl" />
              </div>
              <div>
                <Label>عدد اللوحات</Label>
                <Input type="number" value={form.numberOfPanels} onChange={e => setForm(f => ({ ...f, numberOfPanels: e.target.value }))} placeholder="0" className="rounded-xl" />
              </div>
              <div>
                <Label>عدد الأنابيب</Label>
                <Input type="number" value={form.numberOfPipes} onChange={e => setForm(f => ({ ...f, numberOfPipes: e.target.value }))} placeholder="0" className="rounded-xl" />
              </div>
              <div>
                <Label>نوع المروحة</Label>
                <Select value={form.fanType || '_none'} onValueChange={v => setForm(f => ({ ...f, fanType: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent><SelectItem value="_none">—</SelectItem>{FAN_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>قوة المضخة</Label>
                <Select value={form.pumpPower || '_none'} onValueChange={v => setForm(f => ({ ...f, pumpPower: v === '_none' ? '' : v }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="اختر القوة" /></SelectTrigger>
                  <SelectContent><SelectItem value="_none">—</SelectItem>{PUMP_POWERS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>الحالة</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Well['status'] }))}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">لم يبدأ</SelectItem>
                    <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                    <SelectItem value="completed">منجز</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>نسبة الإنجاز (%)</Label>
                <Input type="number" min="0" max="100" value={form.completionPercentage} onChange={e => setForm(f => ({ ...f, completionPercentage: e.target.value }))} placeholder="0" className="rounded-xl" />
              </div>
              <div>
                <Label>تاريخ البدء</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="rounded-xl" />
              </div>
              <div>
                <Label>تاريخ الإنجاز</Label>
                <Input type="date" value={form.completionDate} onChange={e => setForm(f => ({ ...f, completionDate: e.target.value }))} className="rounded-xl" />
              </div>
              <div className="col-span-2">
                <Label>ملاحظات</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="ملاحظات إضافية..." className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); resetForm(); }} className="rounded-xl">إلغاء</Button>
              <Button onClick={handleSubmit} disabled={saving} className={`rounded-xl ${editingId ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : editingId ? 'حفظ التعديلات' : 'إضافة البئر'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف البئر</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذا البئر؟ لا يمكن التراجع.</AlertDialogDescription>
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
