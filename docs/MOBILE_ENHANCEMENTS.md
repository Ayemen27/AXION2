# تحسينات تجربة الموبايل - دليل الاستخدام

## الميزات المضافة

### 1. Pull to Refresh (السحب للتحديث)
- **الاستخدام**: اسحب الصفحة من الأعلى للأسفل لتحديث البيانات
- **مطبق على**: صفحة المشاريع (مثال)
- **المؤشر**: دائرة دوارة تظهر عند السحب

```tsx
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh-indicator';

const { containerRef, pullDistance, isRefreshing, progress } = usePullToRefresh({
  onRefresh: async () => {
    // تحديث البيانات
  },
  threshold: 80,
});

<div ref={containerRef}>
  <PullToRefreshIndicator {...{ pullDistance, isRefreshing, progress }} />
  {/* المحتوى */}
</div>
```

### 2. Haptic Feedback (الاهتزاز)
- **الأنواع**: light, medium, heavy, success, warning, error, selection
- **الاستخدام**: ردود فعل اهتزازية للأزرار والإجراءات

```tsx
import { useHaptic } from '@/hooks/useHaptic';

const { vibrate, notification, selection, impact } = useHaptic();

// عند الضغط على زر
onClick={() => {
  vibrate('medium');
  // الإجراء
}}

// عند نجاح عملية
notification('success');

// عند التنقل
selection();
```

### 3. Swipe Gestures (السحب الجانبي)
- **الاتجاهات**: left, right, up, down
- **مطبق على**: AppLayout - فتح/إغلاق القائمة الجانبية
- **الحد الأدنى**: 80 بكسل للتفعيل

```tsx
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

const swipeRef = useSwipeGesture({
  onSwipeRight: () => {
    // فتح القائمة
  },
  onSwipeLeft: () => {
    // إغلاق القائمة
  },
  threshold: 80,
});

<div ref={swipeRef}>{/* المحتوى */}</div>
```

### 4. Bottom Sheet (اللوحة السفلية)
- **الاستخدام**: بديل ذكي للـ Dialog على الموبايل
- **التكيف**: Dialog على الديسكتوب، Drawer على الموبايل
- **مطبق على**: نماذج المشاريع

```tsx
import { BottomSheet } from '@/components/ui/bottom-sheet';

<BottomSheet
  open={open}
  onOpenChange={setOpen}
  title="عنوان اللوحة"
  description="وصف اختياري"
  footer={<>أزرار الإجراءات</>}
>
  {/* المحتوى */}
</BottomSheet>
```

## التطبيق على الصفحات الأخرى

لتطبيق هذه الميزات على صفحات أخرى:

1. **أضف Pull to Refresh**:
   - استورد `usePullToRefresh` و `PullToRefreshIndicator`
   - أضف `ref={containerRef}` للحاوية الرئيسية
   - أضف المؤشر في أعلى الصفحة

2. **أضف Haptic Feedback**:
   - استورد `useHaptic`
   - أضف `vibrate()` للأزرار المهمة
   - أضف `notification()` للعمليات الناجحة/الفاشلة

3. **حول Dialogs لـ BottomSheets**:
   - استبدل `Dialog` بـ `BottomSheet`
   - انقل المحتوى والأزرار

## الدعم والمتصفحات

- **Vibration API**: مدعوم في معظم المتصفحات الحديثة على الموبايل
- **Touch Events**: مدعوم بالكامل
- **Responsive**: يعمل بسلاسة على جميع الأحجام

## نصائح الأداء

- Pull to Refresh يعمل فقط عندما الصفحة في الأعلى
- Haptic يتحقق من الدعم تلقائياً
- Swipe Gestures لا تتعارض مع التمرير العادي
- Bottom Sheet يتكيف تلقائياً حسب حجم الشاشة
