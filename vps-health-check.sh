#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
#  AXION VPS Health Check Script
#  فحص شامل لصحة السيرفر والتطبيق
#  Usage: bash vps-health-check.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       AXION VPS Health Check — فحص صحة السيرفر              ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

ISSUES=0

# ─── 1. System Info ────────────────────────────────────────────────────────────
echo -e "${YELLOW}[1] معلومات النظام${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

OS=$(lsb_release -d | awk -F'\t' '{print $2}')
KERNEL=$(uname -r)
UPTIME=$(uptime -p)

echo -e "${GREEN}[✓]${NC} نظام التشغيل: $OS"
echo -e "${GREEN}[✓]${NC} Kernel: $KERNEL"
echo -e "${GREEN}[✓]${NC} Uptime: $UPTIME"
echo ""

# ─── 2. Disk Usage ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[2] استخدام القرص${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$DISK_USAGE" -lt 80 ]; then
  echo -e "${GREEN}[✓]${NC} استخدام القرص: ${DISK_USAGE}% (جيد)"
elif [ "$DISK_USAGE" -lt 90 ]; then
  echo -e "${YELLOW}[!]${NC} استخدام القرص: ${DISK_USAGE}% (تحذير — قريب من الامتلاء)"
  ISSUES=$((ISSUES + 1))
else
  echo -e "${RED}[✗]${NC} استخدام القرص: ${DISK_USAGE}% (خطر — القرص ممتلئ)"
  ISSUES=$((ISSUES + 1))
fi
echo ""

# ─── 3. Memory Usage ───────────────────────────────────────────────────────────
echo -e "${YELLOW}[3] استخدام الذاكرة${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MEMORY=$(free -m | awk 'NR==2{printf "%.0f%%", $3*100/$2}')
MEM_NUM=$(free -m | awk 'NR==2{printf "%.0f", $3*100/$2}')

if [ "$MEM_NUM" -lt 80 ]; then
  echo -e "${GREEN}[✓]${NC} استخدام الذاكرة: ${MEMORY} (جيد)"
else
  echo -e "${YELLOW}[!]${NC} استخدام الذاكرة: ${MEMORY} (مرتفع)"
  ISSUES=$((ISSUES + 1))
fi
echo ""

# ─── 4. PostgreSQL ─────────────────────────────────────────────────────────────
echo -e "${YELLOW}[4] PostgreSQL Database${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if systemctl is-active --quiet postgresql; then
  echo -e "${GREEN}[✓]${NC} PostgreSQL يعمل"
  
  # Check database connection
  if sudo -u postgres psql -d axion_db -c "SELECT 1;" &>/dev/null; then
    echo -e "${GREEN}[✓]${NC} الاتصال بقاعدة البيانات: ناجح"
    
    # Count tables
    TABLE_COUNT=$(sudo -u postgres psql -d axion_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    echo -e "${GREEN}[✓]${NC} عدد الجداول: $TABLE_COUNT"
    
    if [ "$TABLE_COUNT" -lt 20 ]; then
      echo -e "${YELLOW}[!]${NC} تحذير: عدد الجداول قليل — قد يكون Migration غير مكتمل"
      ISSUES=$((ISSUES + 1))
    fi
  else
    echo -e "${RED}[✗]${NC} فشل الاتصال بقاعدة البيانات"
    ISSUES=$((ISSUES + 1))
  fi
else
  echo -e "${RED}[✗]${NC} PostgreSQL لا يعمل"
  ISSUES=$((ISSUES + 1))
fi
echo ""

# ─── 5. Nginx ──────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[5] Nginx Web Server${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}[✓]${NC} Nginx يعمل"
  
  # Test configuration
  if sudo nginx -t &>/dev/null; then
    echo -e "${GREEN}[✓]${NC} إعدادات Nginx: صحيحة"
  else
    echo -e "${RED}[✗]${NC} إعدادات Nginx: بها أخطاء"
    ISSUES=$((ISSUES + 1))
  fi
  
  # Check if axion site is enabled
  if [ -L "/etc/nginx/sites-enabled/axion" ]; then
    echo -e "${GREEN}[✓]${NC} موقع AXION: مفعّل"
  else
    echo -e "${YELLOW}[!]${NC} موقع AXION: غير مفعّل"
    ISSUES=$((ISSUES + 1))
  fi
else
  echo -e "${RED}[✗]${NC} Nginx لا يعمل"
  ISSUES=$((ISSUES + 1))
fi
echo ""

# ─── 6. SSL Certificate ────────────────────────────────────────────────────────
echo -e "${YELLOW}[6] SSL Certificate${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v certbot &> /dev/null; then
  echo -e "${GREEN}[✓]${NC} Certbot مثبت"
  
  # Check certificate validity
  CERT_LIST=$(sudo certbot certificates 2>/dev/null | grep "Certificate Path" | head -n 1)
  
  if [ -n "$CERT_LIST" ]; then
    echo -e "${GREEN}[✓]${NC} شهادة SSL موجودة"
    
    # Check expiry
    CERT_PATH=$(echo $CERT_LIST | awk '{print $3}')
    if [ -f "$CERT_PATH" ]; then
      EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
      EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
      NOW_EPOCH=$(date +%s)
      DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))
      
      if [ "$DAYS_LEFT" -gt 30 ]; then
        echo -e "${GREEN}[✓]${NC} الشهادة صالحة لـ $DAYS_LEFT يوم"
      elif [ "$DAYS_LEFT" -gt 7 ]; then
        echo -e "${YELLOW}[!]${NC} الشهادة تنتهي خلال $DAYS_LEFT يوم — سيتم تجديدها تلقائياً"
      else
        echo -e "${RED}[✗]${NC} الشهادة تنتهي خلال $DAYS_LEFT يوم — يُوصى بالتجديد اليدوي"
        ISSUES=$((ISSUES + 1))
      fi
    fi
  else
    echo -e "${YELLOW}[!]${NC} لا توجد شهادة SSL مُثبتة"
    ISSUES=$((ISSUES + 1))
  fi
else
  echo -e "${YELLOW}[!]${NC} Certbot غير مثبت"
  ISSUES=$((ISSUES + 1))
fi
echo ""

# ─── 7. Application Files ──────────────────────────────────────────────────────
echo -e "${YELLOW}[7] ملفات التطبيق${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "/var/www/axion" ]; then
  echo -e "${GREEN}[✓]${NC} مجلد التطبيق موجود: /var/www/axion"
  
  if [ -d "/var/www/axion/dist" ]; then
    echo -e "${GREEN}[✓]${NC} المجلد المبني موجود: /var/www/axion/dist"
    
    # Check index.html
    if [ -f "/var/www/axion/dist/index.html" ]; then
      echo -e "${GREEN}[✓]${NC} الملف الرئيسي موجود: index.html"
    else
      echo -e "${RED}[✗]${NC} index.html غير موجود — التطبيق غير مبني"
      ISSUES=$((ISSUES + 1))
    fi
  else
    echo -e "${RED}[✗]${NC} مجلد dist غير موجود — التطبيق غير مبني"
    echo -e "    ${BLUE}الحل:${NC} cd /var/www/axion && npm run build"
    ISSUES=$((ISSUES + 1))
  fi
  
  # Check .env file
  if [ -f "/var/www/axion/.env" ]; then
    echo -e "${GREEN}[✓]${NC} ملف .env موجود"
  else
    echo -e "${YELLOW}[!]${NC} ملف .env غير موجود — قد تحتاج لإنشائه"
    ISSUES=$((ISSUES + 1))
  fi
else
  echo -e "${RED}[✗]${NC} مجلد التطبيق غير موجود: /var/www/axion"
  ISSUES=$((ISSUES + 1))
fi
echo ""

# ─── 8. Firewall ───────────────────────────────────────────────────────────────
echo -e "${YELLOW}[8] الجدار الناري (UFW)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v ufw &> /dev/null; then
  if sudo ufw status | grep -q "Status: active"; then
    echo -e "${GREEN}[✓]${NC} الجدار الناري مفعّل"
    
    # Check critical ports
    if sudo ufw status | grep -q "80/tcp"; then
      echo -e "${GREEN}[✓]${NC} المنفذ 80 (HTTP): مفتوح"
    else
      echo -e "${YELLOW}[!]${NC} المنفذ 80 (HTTP): مغلق"
    fi
    
    if sudo ufw status | grep -q "443/tcp"; then
      echo -e "${GREEN}[✓]${NC} المنفذ 443 (HTTPS): مفتوح"
    else
      echo -e "${YELLOW}[!]${NC} المنفذ 443 (HTTPS): مغلق"
    fi
  else
    echo -e "${YELLOW}[!]${NC} الجدار الناري غير مفعّل"
    echo -e "    ${BLUE}تفعيله:${NC} sudo ufw enable"
  fi
else
  echo -e "${YELLOW}[!]${NC} UFW غير مثبت"
fi
echo ""

# ─── 9. Backups ────────────────────────────────────────────────────────────────
echo -e "${YELLOW}[9] النسخ الاحتياطية${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "/backups/axion" ]; then
  echo -e "${GREEN}[✓]${NC} مجلد النسخ الاحتياطي موجود"
  
  BACKUP_COUNT=$(find /backups/axion -name "*.sql" -type f | wc -l)
  echo -e "${GREEN}[✓]${NC} عدد النسخ الاحتياطية: $BACKUP_COUNT"
  
  if [ "$BACKUP_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}[!]${NC} لا توجد نسخ احتياطية — قد تحتاج لإعداد cron job"
  else
    LATEST_BACKUP=$(find /backups/axion -name "*.sql" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -f2- -d" ")
    BACKUP_AGE=$(stat -c %Y "$LATEST_BACKUP")
    NOW=$(date +%s)
    DAYS_OLD=$(( ($NOW - $BACKUP_AGE) / 86400 ))
    
    if [ "$DAYS_OLD" -eq 0 ]; then
      echo -e "${GREEN}[✓]${NC} آخر نسخة احتياطية: اليوم"
    elif [ "$DAYS_OLD" -le 2 ]; then
      echo -e "${GREEN}[✓]${NC} آخر نسخة احتياطية: منذ ${DAYS_OLD} يوم"
    else
      echo -e "${YELLOW}[!]${NC} آخر نسخة احتياطية: منذ ${DAYS_OLD} يوم (قديمة)"
      ISSUES=$((ISSUES + 1))
    fi
  fi
else
  echo -e "${YELLOW}[!]${NC} مجلد النسخ الاحتياطي غير موجود"
  echo -e "    ${BLUE}إنشاؤه:${NC} sudo mkdir -p /backups/axion"
  ISSUES=$((ISSUES + 1))
fi
echo ""

# ─── 10. Security Updates ──────────────────────────────────────────────────────
echo -e "${YELLOW}[10] التحديثات الأمنية${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

UPDATES_COUNT=$(apt list --upgradable 2>/dev/null | grep -c "upgradable" || echo "0")

if [ "$UPDATES_COUNT" -eq 0 ]; then
  echo -e "${GREEN}[✓]${NC} النظام محدّث بالكامل"
else
  echo -e "${YELLOW}[!]${NC} يوجد $UPDATES_COUNT تحديث متاح"
  echo -e "    ${BLUE}تحديثها:${NC} sudo apt update && sudo apt upgrade -y"
fi
echo ""

# ─── 11. Network Connectivity ──────────────────────────────────────────────────
echo -e "${YELLOW}[11] الاتصال بالشبكة${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ping -c 1 google.com &> /dev/null; then
  echo -e "${GREEN}[✓]${NC} الاتصال بالإنترنت: ناجح"
else
  echo -e "${RED}[✗]${NC} لا يوجد اتصال بالإنترنت"
  ISSUES=$((ISSUES + 1))
fi

# Check if public IP is accessible
PUBLIC_IP=$(curl -s https://api.ipify.org)
if [ -n "$PUBLIC_IP" ]; then
  echo -e "${GREEN}[✓]${NC} عنوان IP العام: $PUBLIC_IP"
else
  echo -e "${YELLOW}[!]${NC} فشل جلب IP العام"
fi
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        النتيجة النهائية                      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✓ كل شيء يعمل بشكل ممتاز — لا توجد مشاكل${NC}"
  echo -e "${GREEN}  النظام صحي وجاهز للعمل${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠ يوجد ${ISSUES} مشكلة تحتاج إلى انتباه${NC}"
  echo -e "${YELLOW}  راجع التفاصيل أعلاه لمعرفة الحلول${NC}"
  exit 1
fi
