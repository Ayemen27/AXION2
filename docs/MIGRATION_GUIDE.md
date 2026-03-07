/**
 * Migration Guide: Mock → OnSpace Cloud
 * ─────────────────────────────────────────────────────────────────────────────
 * هذا الملف يشرح كيفية التحويل من Mock Data إلى OnSpace Cloud (Supabase)
 * بأقل تغيير ممكن في الكود
 * ─────────────────────────────────────────────────────────────────────────────
 */

# دليل الترحيل: Mock Data → OnSpace Cloud

## البنية الحالية (Service Layer)

```
src/services/
  ├── base.ts                  # أدوات مشتركة (readStore, writeStore, generateId)
  ├── index.ts                 # نقطة دخول موحدة
  ├── projectService.ts        # إدارة المشاريع
  ├── workerService.ts         # إدارة العمال
  ├── expenseService.ts        # المصروفات اليومية
  ├── supplierService.ts       # الموردين + المشتريات + المدفوعات
  ├── attendanceService.ts     # الحضور والغياب
  └── workerFinanceService.ts  # التحويلات + النثريات + العهد
```

## خطوات الترحيل

### 1. تفعيل OnSpace Cloud
من لوحة التحكم → OnSpace Cloud → Enable

### 2. إنشاء جداول قاعدة البيانات
```sql
-- مثال: جدول المشاريع
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  project_type_id INT,
  project_type_name TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. تحديث base.ts
```typescript
// قبل: localStorage
export function readStore<T>(key: string, fallback: T[]): T[] {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

// بعد: Supabase client
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 4. تحديث Service واحد (مثال: projectService.ts)
```typescript
// قبل (Mock):
async getAll(filters?: FilterOptions) {
  let data = readStore<Project>('axion_projects', mockProjects);
  // ... فلترة محلية
  return { data, count: data.length, error: null };
}

// بعد (Supabase):
async getAll(filters?: FilterOptions) {
  let query = supabase.from('projects').select('*', { count: 'exact' });
  
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  
  const { data, count, error } = await query;
  return { data: data || [], count: count || 0, error: error?.message || null };
}
```

## ملاحظات مهمة

- ✅ واجهة الدوال لا تتغير (نفس الـ params والـ return type)
- ✅ المكونات والـ hooks لا تحتاج أي تعديل
- ✅ يكفي تغيير محتوى service files فقط
- ⚠️ أضف RLS policies لكل جدول في Supabase
- ⚠️ استبدل `generateId()` بـ `DEFAULT gen_random_uuid()` في قاعدة البيانات
