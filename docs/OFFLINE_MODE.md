# نظام العمل الأوفلاين المتطور

نظام متكامل للعمل بدون اتصال بالإنترنت مع مزامنة تلقائية ذكية وحل التضارب.

---

## 🎯 المميزات

### 1️⃣ **Service Worker للتخزين المحلي**
- تخزين الملفات الأساسية للتطبيق
- استراتيجية Network First مع Cache Fallback
- تحديث تلقائي للكاش عند توفر الإنترنت

### 2️⃣ **مراقبة حالة الاتصال**
- مؤشر مباشر لحالة الاتصال (متصل/غير متصل)
- عرض جودة الاتصال (ممتاز/جيد/بطيء)
- معلومات تفصيلية: نوع الشبكة، السرعة، التأخير

### 3️⃣ **قائمة انتظار العمليات**
- حفظ جميع العمليات أثناء عدم الاتصال في IndexedDB
- عرض تفصيلي لكل عملية معلقة مع الوقت
- إحصائيات العمليات وعدد المحاولات

### 4️⃣ **المزامنة التلقائية**
- مزامنة فورية عند استعادة الاتصال
- إعادة محاولة ذكية (حتى 3 محاولات)
- Background Sync API للمزامنة في الخلفية

### 5️⃣ **حل تضارب البيانات**
- نظام Timestamp لتحديد الأحدث
- إعادة محاولة العمليات الفاشلة
- حذف تلقائي للعمليات بعد 3 محاولات فاشلة

---

## 📦 المكونات

### **Hooks**

#### `useConnectionStatus()`
```typescript
const { isOnline, effectiveType, downlink, rtt, saveData } = useConnectionStatus();
```
- **isOnline**: حالة الاتصال (true/false)
- **effectiveType**: نوع الشبكة ('4g', '3g', '2g', etc.)
- **downlink**: سرعة التحميل (Mbps)
- **rtt**: زمن الاستجابة (ms)
- **saveData**: وضع توفير البيانات

#### `useOfflineSync()`
```typescript
const {
  pendingOperations,    // قائمة العمليات المعلقة
  isSyncing,            // حالة المزامنة
  addPendingOperation,  // إضافة عملية جديدة
  syncPendingOperations, // مزامنة يدوية
  deletePendingOperation, // حذف عملية محددة
  clearAllOperations,    // مسح الكل
} = useOfflineSync();
```

---

## 🚀 الاستخدام

### 1. **إضافة عملية معلقة**

```typescript
// في أي صفحة أو مكون
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

function MyComponent() {
  const { addPendingOperation } = useOfflineSync();
  const { isOnline } = useConnectionStatus();

  const handleCreate = async (data) => {
    if (!isOnline) {
      // حفظ محلياً
      await addPendingOperation('create', 'project', data);
      toast({ title: 'تم الحفظ محلياً', description: 'سيتم المزامنة لاحقاً' });
    } else {
      // حفظ على الخادم مباشرة
      await saveToServer(data);
    }
  };

  return <button onClick={handleCreate}>إضافة</button>;
}
```

### 2. **عرض مؤشر الاتصال**

```typescript
import { ConnectionIndicator } from '@/components/ui/connection-indicator';

// في أي مكان في واجهة المستخدم
<ConnectionIndicator />
```

### 3. **عرض قائمة الانتظار**

```typescript
import { OfflineQueue } from '@/components/ui/offline-queue';

// في الشريط العلوي أو القائمة
<OfflineQueue />
```

---

## 🔧 التكوين المتقدم

### **Service Worker Cache Strategy**

في ملف `public/sw.js`:

```javascript
// تخصيص الملفات المخزنة مسبقاً
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  // أضف ملفات إضافية هنا
];

// تخصيص استراتيجية التخزين
// Network First: حاول الشبكة أولاً، ثم الكاش
// Cache First: استخدم الكاش أولاً، ثم الشبكة
```

### **تخصيص المزامنة**

في `useOfflineSync.tsx`:

```typescript
// تخصيص عدد المحاولات
if (operation.retryCount < 3) {  // غيّر الرقم هنا
  await offlineDB.updateOperation(operation);
}

// تخصيص وقت الانتظار بين المحاولات
await new Promise(resolve => setTimeout(resolve, 1000)); // بالملي ثانية
```

---

## 📊 هيكل البيانات

### **PendingOperation**

```typescript
interface PendingOperation {
  id: string;              // معرف فريد
  type: 'create' | 'update' | 'delete'; // نوع العملية
  entity: string;          // نوع الكيان (project, worker, etc.)
  data: any;               // البيانات الفعلية
  timestamp: number;       // وقت الإنشاء
  retryCount: number;      // عدد المحاولات
}
```

---

## 🎨 واجهة المستخدم

### **مؤشر الاتصال - ConnectionIndicator**

- ✅ **متصل - ممتاز**: شبكة 4G أو أسرع (أخضر)
- 🟦 **متصل - جيد**: شبكة 3G (أزرق)
- 🟨 **متصل - بطيء**: شبكة 2G (كهرماني)
- 🔴 **غير متصل**: لا يوجد اتصال (أحمر)

### **قائمة الانتظار - OfflineQueue**

- عرض تفصيلي لكل عملية معلقة
- أيقونات ملونة حسب نوع العملية:
  - ✅ **إضافة** (أخضر)
  - 🔄 **تعديل** (أزرق)
  - ❌ **حذف** (أحمر)
- وقت العملية بالعربية (منذ دقيقتين، منذ ساعة، إلخ)
- زر مزامنة يدوية
- زر مسح الكل

---

## 🔐 الأمان والخصوصية

- ✅ جميع البيانات المخزنة محلياً في IndexedDB (داخل المتصفح)
- ✅ لا يتم إرسال أي بيانات للخادم إلا عند المزامنة
- ✅ يمكن حذف جميع البيانات المحلية في أي وقت
- ✅ Service Worker يعمل فقط ضمن نطاق التطبيق

---

## 📱 دعم المتصفحات

| المتصفح | Service Worker | IndexedDB | Network Info API |
|---------|---------------|-----------|------------------|
| Chrome  | ✅            | ✅        | ✅               |
| Firefox | ✅            | ✅        | ⚠️ جزئي          |
| Safari  | ✅            | ✅        | ❌               |
| Edge    | ✅            | ✅        | ✅               |

⚠️ **ملاحظة**: Network Info API غير مدعوم في Safari، لكن النظام يعمل بدونه.

---

## 🐛 استكشاف الأخطاء

### **المشكلة: Service Worker لا يعمل**

✅ **الحل**:
1. تأكد من تشغيل التطبيق على HTTPS أو localhost
2. افتح DevTools → Application → Service Workers
3. تأكد من تفعيل "Update on reload"

### **المشكلة: العمليات لا تُحفظ محلياً**

✅ **الحل**:
1. افتح DevTools → Application → IndexedDB
2. تحقق من وجود قاعدة بيانات `axion-offline`
3. تأكد من السماح بتخزين البيانات في المتصفح

### **المشكلة: المزامنة لا تحدث تلقائياً**

✅ **الحل**:
1. تحقق من حدث `app-online` في Console
2. تأكد من تسجيل Service Worker بنجاح
3. جرّب المزامنة اليدوية من قائمة الانتظار

---

## 🚀 التحسينات المستقبلية

- [ ] دعم Conflict Resolution المتقدم (Last-Write-Wins, Merge Strategies)
- [ ] رسائل تنبيه عند اقتراب الوصول لحد التخزين المحلي
- [ ] تصدير/استيراد العمليات المعلقة كملف JSON
- [ ] إحصائيات مفصلة عن استخدام الكاش
- [ ] دعم مزامنة جزئية للبيانات الكبيرة
- [ ] Optimistic UI Updates

---

## 📚 موارد إضافية

- [Service Worker API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Background Sync API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
- [Network Information API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)

---

## 💡 نصائح الأداء

1. **تجنب تخزين البيانات الكبيرة**: IndexedDB له حدود تخزين
2. **نظّف الكاش بانتظام**: احذف البيانات القديمة
3. **استخدم Compression**: لتقليل حجم البيانات المخزنة
4. **راقب الاستخدام**: تتبع عدد العمليات المعلقة

---

**تم بناء النظام بواسطة OnSpace AI** 🚀
