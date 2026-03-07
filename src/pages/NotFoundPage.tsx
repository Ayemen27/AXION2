import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, AlertTriangle } from 'lucide-react';
import axionLogo from '@/assets/axion-logo.png';

export default function NotFoundPage() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-[1.5px] shadow-xl shadow-blue-500/20">
            <div className="w-full h-full rounded-[14px] bg-background/90 backdrop-blur flex items-center justify-center overflow-hidden">
              <img src={axionLogo} alt="AXION" className="size-10 object-contain" />
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-24 h-24 mb-5">
          <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="relative size-24 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="size-12 text-amber-500/60" />
          </div>
        </div>

        <h1 className="text-5xl font-black text-foreground mb-2">404</h1>
        <h2 className="text-lg font-bold text-foreground mb-2">الصفحة غير موجودة</h2>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>

        <Button asChild className="rounded-2xl px-8" style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
          <Link to="/">
            <Home className="size-4 ml-2" />
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
}
