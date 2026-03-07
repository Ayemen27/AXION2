// Core Types for Axion Project Management System

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  project_type_id?: number;
  project_type_name?: string;
  engineer_id?: string;
  engineer_name?: string;
  location?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  // flat fields (matched to DB columns)
  total_workers?: number;
  total_expenses?: number;
  total_income?: number;
  current_balance?: number;
  active_workers?: number;
  completed_days?: number;
  material_purchases?: number;
  last_activity?: string;
  // legacy nested stats (kept for backward compat)
  stats?: ProjectStats;
}

export interface ProjectStats {
  totalWorkers: number;
  totalExpenses: number;
  totalIncome: number;
  currentBalance: number;
  activeWorkers: number;
  completedDays: number;
  materialPurchases: number;
  lastActivity: string;
}

export interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: number;
  phone?: string;
  hireDate?: string;
  is_active: boolean;
  project_id?: string;
  created_at: string;
}

export interface WorkerStats {
  totalWorkDays: number;
  totalTransfers: number;
  totalEarnings: number;
  projectsWorked: number;
  lastAttendanceDate: string | null;
  monthlyAttendanceRate: number;
}

export interface DailyExpense {
  id: string;
  project_id: string;
  project_name: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  well_id?: string;           // البئر المرتبط (اختياري)
  created_by: string;
  receipt_url?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  type: string;
  totalPurchases: number;
  totalPayments: number;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface MaterialPurchase {
  id: string;
  project_id: string;
  supplier_id: string;
  supplier_name: string;
  material_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  date: string;
  well_id?: string;           // البئر المرتبط (اختياري)
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'system' | 'project' | 'financial' | 'alert';
  priority: number;
  isRead: boolean;
  created_at: string;
}

export interface RecentActivity {
  id: string;
  type: 'expense' | 'worker' | 'project' | 'material' | 'transfer';
  title: string;
  description: string;
  amount?: number;
  project_name?: string;
  created_at: string;
}

export interface ProjectType {
  id: number;
  name: string;
}

export interface WorkerType {
  id: string;
  name: string;
  usageCount: number;
}

export interface AttendanceRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  worker_type: string;
  project_id?: string;
  project_name?: string;
  well_id?: string;           // البئر المرتبط (اختياري)
  date: string;
  status: 'present' | 'absent' | 'half' | 'overtime';
  hours: number;
  daily_wage: number;
  earned: number;
  notes?: string;
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  notes?: string;
  date: string;
  created_by: string;
  created_at: string;
}

// حوالة مالية للعامل (تحويل أموال بطرق مختلفة)
export interface WorkerTransfer {
  id: string;
  worker_id: string;
  worker_name: string;
  project_id: string;
  project_name: string;
  amount: number;
  recipientName: string;       // اسم المستلم (العامل نفسه أو شخص آخر)
  recipientPhone?: string;      // رقم هاتف المستلم
  transferMethod: 'cash' | 'bank' | 'hawaleh'; // نقد / بنك / حوالة
  transferNumber?: string;      // رقم الحوالة أو رقم المعاملة البنكية
  transferDate: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

// نثريات العمال اليومية (مصروفات صغيرة مرتبطة بيوم الحضور)
export interface WorkerMiscExpense {
  id: string;
  worker_id: string;
  worker_name: string;
  project_id: string;
  project_name: string;
  amount: number;
  description: string;  // وصف النثرية (وجبات، مواصلات، ...)
  date: string;
  well_id?: string;           // البئر المرتبط (اختياري)
  notes?: string;
  created_at: string;
}

// العهد المالية (تحويلات عهدة للمشاريع أو الأفراد)
export interface FundCustody {
  id: string;
  amount: number;
  senderName: string;           // اسم المرسل
  transferType: 'bank' | 'cash' | 'hawaleh' | 'other';  // نوع التحويل
  transferNumber?: string;       // رقم الحوالة أو المعاملة
  project_id: string;
  project_name: string;
  date: string;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  projectsCount: number;
  activeWorkersCount: number;
}
