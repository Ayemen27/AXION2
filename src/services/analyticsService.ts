/**
 * AXION Analytics Service — خدمة التحليلات والإحصائيات
 */

import { supabase } from '@/lib/supabase';

export interface PageView {
  id: string;
  session_id: string;
  user_id?: string;
  page_path: string;
  page_title?: string;
  referrer?: string;
  ip_address?: string;
  country?: string;
  city?: string;
  device_type?: string;
  os?: string;
  browser?: string;
  screen_size?: string;
  language?: string;
  user_agent?: string;
  duration_seconds?: number;
  is_bounce?: boolean;
  created_at: string;
}

export interface AnalyticsSummary {
  totalVisitors: number;
  totalPageviews: number;
  viewsPerVisit: number;
  bounceRate: number;
  avgDuration: number;
}

export interface TrendData {
  date: string;
  visitors: number;
  pageviews: number;
}

export interface SourceData {
  source: string;
  visitors: number;
  percentage: number;
}

export interface PageData {
  page: string;
  views: number;
  percentage: number;
}

export interface CountryData {
  country: string;
  visitors: number;
  percentage: number;
}

export interface DeviceData {
  device: string;
  visitors: number;
  percentage: number;
}

// ── جمع معلومات الجهاز والمتصفح ─────────────────────────────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent;
  
  // نوع الجهاز
  let deviceType = 'desktop';
  if (/Mobile|Android|iPhone|iPad|iPod/.test(ua)) {
    deviceType = /iPad|Tablet/.test(ua) ? 'tablet' : 'mobile';
  }
  
  // نظام التشغيل
  let os = 'Unknown';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad/.test(ua)) os = 'iOS';
  
  // المتصفح
  let browser = 'Unknown';
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox/.test(ua)) browser = 'Firefox';
  else if (/Edg/.test(ua)) browser = 'Edge';
  else if (/MSIE|Trident/.test(ua)) browser = 'IE';
  
  return { deviceType, os, browser };
}

// ── الحصول على/إنشاء Session ID ───────────────────────────────────────────
function getSessionId(): string {
  let sessionId = localStorage.getItem('axion_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('axion_session_id', sessionId);
  }
  return sessionId;
}

// ── الحصول على الموقع الجغرافي من IP ──────────────────────────────────────
async function getGeoLocation(): Promise<{ country: string; city: string; ip: string }> {
  try {
    // استخدام خدمة ipapi.co المجانية (100 طلب/يوم)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(3000),
    });
    
    if (!response.ok) throw new Error('Geolocation failed');
    
    const data = await response.json();
    return {
      country: data.country_name || 'Unknown',
      city: data.city || 'Unknown',
      ip: data.ip || '',
    };
  } catch (error) {
    console.warn('[Analytics] Geolocation failed:', error);
    // Fallback: محاولة خدمة بديلة
    try {
      const fallback = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(2000),
      });
      const { ip } = await fallback.json();
      return { country: 'Unknown', city: 'Unknown', ip };
    } catch {
      return { country: 'Unknown', city: 'Unknown', ip: '' };
    }
  }
}

// ── تسجيل زيارة صفحة ──────────────────────────────────────────────────────
export async function trackPageView(pagePath: string, pageTitle?: string): Promise<void> {
  try {
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();
    const { deviceType, os, browser } = getDeviceInfo();
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    const language = navigator.language;
    const referrer = document.referrer || 'direct';
    
    // جلب الموقع الجغرافي
    const { country, city, ip } = await getGeoLocation();
    
    // تسجيل الزيارة
    await supabase.from('page_views').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      page_path: pagePath,
      page_title: pageTitle || document.title,
      referrer,
      ip_address: ip,
      country,
      city,
      device_type: deviceType,
      os,
      browser,
      screen_size: screenSize,
      language,
      user_agent: navigator.userAgent,
    });
    
    // تحديث/إنشاء الجلسة
    const { data: existingSession } = await supabase
      .from('analytics_sessions')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (existingSession) {
      // تحديث الجلسة الموجودة
      await supabase
        .from('analytics_sessions')
        .update({
          last_visit: new Date().toISOString(),
          total_views: (existingSession.total_views || 0) + 1,
        })
        .eq('session_id', sessionId);
    } else {
      // إنشاء جلسة جديدة
      await supabase.from('analytics_sessions').insert({
        session_id: sessionId,
        user_id: user?.id || null,
        ip_address: ip,
        country,
        device_type: deviceType,
        browser,
      });
    }
  } catch (error) {
    console.warn('[Analytics] Failed to track page view:', error);
  }
}

// ── الحصول على الملخص الإحصائي ───────────────────────────────────────────
export async function getSummary(
  startDate: string,
  endDate: string
): Promise<AnalyticsSummary> {
  const { data: views } = await supabase
    .from('page_views')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('*')
    .gte('first_visit', startDate)
    .lte('last_visit', endDate);
  
  const totalVisitors = sessions?.length || 0;
  const totalPageviews = views?.length || 0;
  const viewsPerVisit = totalVisitors > 0 ? totalPageviews / totalVisitors : 0;
  
  // Bounce rate (نسبة الزوار الذين غادروا مباشرة)
  const bouncedSessions = sessions?.filter(s => s.total_views === 1).length || 0;
  const bounceRate = totalVisitors > 0 ? (bouncedSessions / totalVisitors) * 100 : 0;
  
  // متوسط المدة
  const totalDuration = views?.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) || 0;
  const avgDuration = totalPageviews > 0 ? totalDuration / totalPageviews : 0;
  
  return {
    totalVisitors,
    totalPageviews,
    viewsPerVisit: Math.round(viewsPerVisit * 10) / 10,
    bounceRate: Math.round(bounceRate),
    avgDuration: Math.round(avgDuration),
  };
}

// ── الحصول على بيانات الاتجاه (Trend) ──────────────────────────────────────
export async function getTrend(
  startDate: string,
  endDate: string
): Promise<TrendData[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('created_at, session_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });
  
  if (!views || views.length === 0) return [];
  
  // تجميع حسب التاريخ
  const grouped = views.reduce((acc, view) => {
    const date = new Date(view.created_at).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = { visitors: new Set(), pageviews: 0 };
    }
    acc[date].visitors.add(view.session_id);
    acc[date].pageviews += 1;
    return acc;
  }, {} as Record<string, { visitors: Set<string>; pageviews: number }>);
  
  return Object.entries(grouped)
    .map(([date, data]) => ({
      date,
      visitors: data.visitors.size,
      pageviews: data.pageviews,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// ── الحصول على بيانات المصدر (Source) ────────────────────────────────────
export async function getSourceData(
  startDate: string,
  endDate: string
): Promise<SourceData[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('referrer, session_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views || views.length === 0) return [];
  
  const grouped = views.reduce((acc, view) => {
    const source = view.referrer || 'direct';
    const domain = source === 'direct' ? 'Direct' : new URL(source).hostname;
    
    if (!acc[domain]) {
      acc[domain] = new Set();
    }
    acc[domain].add(view.session_id);
    return acc;
  }, {} as Record<string, Set<string>>);
  
  const total = new Set(views.map(v => v.session_id)).size;
  
  return Object.entries(grouped)
    .map(([source, sessions]) => ({
      source,
      visitors: sessions.size,
      percentage: Math.round((sessions.size / total) * 100),
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);
}

// ── الحصول على بيانات الصفحات ────────────────────────────────────────────
export async function getPageData(
  startDate: string,
  endDate: string
): Promise<PageData[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('page_path')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views || views.length === 0) return [];
  
  const grouped = views.reduce((acc, view) => {
    const page = view.page_path;
    acc[page] = (acc[page] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const total = views.length;
  
  return Object.entries(grouped)
    .map(([page, count]) => ({
      page,
      views: count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

// ── الحصول على بيانات الدول ──────────────────────────────────────────────
export async function getCountryData(
  startDate: string,
  endDate: string
): Promise<CountryData[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('country, session_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views || views.length === 0) return [];
  
  const grouped = views.reduce((acc, view) => {
    const country = view.country || 'Unknown';
    if (!acc[country]) {
      acc[country] = new Set();
    }
    acc[country].add(view.session_id);
    return acc;
  }, {} as Record<string, Set<string>>);
  
  const total = new Set(views.map(v => v.session_id)).size;
  
  return Object.entries(grouped)
    .map(([country, sessions]) => ({
      country,
      visitors: sessions.size,
      percentage: Math.round((sessions.size / total) * 100),
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);
}

// ── الحصول على بيانات الأجهزة ─────────────────────────────────────────────
export async function getDeviceData(
  startDate: string,
  endDate: string
): Promise<DeviceData[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('device_type, session_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views || views.length === 0) return [];
  
  const grouped = views.reduce((acc, view) => {
    const device = view.device_type || 'Unknown';
    if (!acc[device]) {
      acc[device] = new Set();
    }
    acc[device].add(view.session_id);
    return acc;
  }, {} as Record<string, Set<string>>);
  
  const total = new Set(views.map(v => v.session_id)).size;
  
  return Object.entries(grouped)
    .map(([device, sessions]) => ({
      device,
      visitors: sessions.size,
      percentage: Math.round((sessions.size / total) * 100),
    }))
    .sort((a, b) => b.visitors - a.visitors);
}

// ── الحصول على عدد الزوار الحاليين (Real-time) ───────────────────────────
export async function getCurrentVisitors(): Promise<number> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('session_id')
    .gte('last_visit', fiveMinutesAgo);
  
  return sessions?.length || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Real-Time Analytics Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface ActiveVisitor {
  session_id: string;
  user_id?: string;
  last_visit: string;
  country?: string;
  device_type?: string;
  browser?: string;
  current_page?: string;
  current_title?: string;
  seconds_on_page?: number;
}

export async function getActiveVisitors(): Promise<ActiveVisitor[]> {
  const { data } = await supabase
    .from('active_visitors')
    .select('*');
  
  return data || [];
}

export interface GeoLocation {
  country: string;
  count: number;
  latitude?: number;
  longitude?: number;
}

export async function getGeoLocations(): Promise<GeoLocation[]> {
  const visitors = await getActiveVisitors();
  
  const grouped = visitors.reduce((acc, v) => {
    const country = v.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // خريطة شاملة لإحداثيات الدول
  const countryCoords: Record<string, { lat: number; lng: number }> = {
    'Yemen': { lat: 15.5527, lng: 48.5164 },
    'Saudi Arabia': { lat: 23.8859, lng: 45.0792 },
    'United Arab Emirates': { lat: 23.4241, lng: 53.8478 },
    'UAE': { lat: 23.4241, lng: 53.8478 },
    'Egypt': { lat: 26.8206, lng: 30.8025 },
    'Jordan': { lat: 30.5852, lng: 36.2384 },
    'Lebanon': { lat: 33.8547, lng: 35.8623 },
    'Syria': { lat: 34.8021, lng: 38.9968 },
    'Iraq': { lat: 33.2232, lng: 43.6793 },
    'Palestine': { lat: 31.9522, lng: 35.2332 },
    'Kuwait': { lat: 29.3117, lng: 47.4818 },
    'Qatar': { lat: 25.3548, lng: 51.1839 },
    'Bahrain': { lat: 26.0667, lng: 50.5577 },
    'Oman': { lat: 21.4735, lng: 55.9754 },
    'United States': { lat: 37.0902, lng: -95.7129 },
    'United Kingdom': { lat: 55.3781, lng: -3.4360 },
    'Germany': { lat: 51.1657, lng: 10.4515 },
    'France': { lat: 46.2276, lng: 2.2137 },
    'Unknown': { lat: 0, lng: 0 },
  };
  
  return Object.entries(grouped).map(([country, count]) => ({
    country,
    count,
    latitude: countryCoords[country]?.lat || 0,
    longitude: countryCoords[country]?.lng || 0,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// User Behavior Analytics Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface UserJourney {
  session_id: string;
  path: string[];
  timestamps: string[];
  durations: number[];
}

export async function getUserJourneys(
  startDate: string,
  endDate: string,
  limit = 50
): Promise<UserJourney[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('session_id, page_path, created_at, duration_seconds')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });
  
  if (!views) return [];
  
  const journeys = views.reduce((acc, view) => {
    if (!acc[view.session_id]) {
      acc[view.session_id] = { path: [], timestamps: [], durations: [] };
    }
    acc[view.session_id].path.push(view.page_path);
    acc[view.session_id].timestamps.push(view.created_at);
    acc[view.session_id].durations.push(view.duration_seconds || 0);
    return acc;
  }, {} as Record<string, { path: string[]; timestamps: string[]; durations: number[] }>);
  
  return Object.entries(journeys)
    .map(([session_id, data]) => ({
      session_id,
      ...data,
    }))
    .slice(0, limit);
}

export interface PageBounceRate {
  page: string;
  views: number;
  bounces: number;
  bounceRate: number;
  avgDuration: number;
}

export async function getPageBounceRates(
  startDate: string,
  endDate: string
): Promise<PageBounceRate[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('page_path, is_bounce, duration_seconds')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views) return [];
  
  const grouped = views.reduce((acc, view) => {
    const page = view.page_path;
    if (!acc[page]) {
      acc[page] = { views: 0, bounces: 0, totalDuration: 0 };
    }
    acc[page].views += 1;
    if (view.is_bounce) acc[page].bounces += 1;
    acc[page].totalDuration += view.duration_seconds || 0;
    return acc;
  }, {} as Record<string, { views: number; bounces: number; totalDuration: number }>);
  
  return Object.entries(grouped)
    .map(([page, data]) => ({
      page,
      views: data.views,
      bounces: data.bounces,
      bounceRate: Math.round((data.bounces / data.views) * 100),
      avgDuration: Math.round(data.totalDuration / data.views),
    }))
    .sort((a, b) => b.views - a.views);
}

export interface ExitPage {
  page: string;
  exits: number;
  views: number;
  exitRate: number;
}

export async function getExitPages(
  startDate: string,
  endDate: string
): Promise<ExitPage[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('page_path, exit_page')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views) return [];
  
  const grouped = views.reduce((acc, view) => {
    const page = view.page_path;
    if (!acc[page]) {
      acc[page] = { exits: 0, views: 0 };
    }
    acc[page].views += 1;
    if (view.exit_page) acc[page].exits += 1;
    return acc;
  }, {} as Record<string, { exits: number; views: number }>);
  
  return Object.entries(grouped)
    .map(([page, data]) => ({
      page,
      exits: data.exits,
      views: data.views,
      exitRate: Math.round((data.exits / data.views) * 100),
    }))
    .sort((a, b) => b.exitRate - a.exitRate)
    .slice(0, 10);
}

export interface ClickHeatmapData {
  page: string;
  clicks: Array<{
    x: number;
    y: number;
    element?: string;
    count: number;
  }>;
}

export async function getClickHeatmap(
  pagePath: string,
  startDate: string,
  endDate: string
): Promise<ClickHeatmapData> {
  const { data: clicks } = await supabase
    .from('click_events')
    .select('position_x, position_y, element_type')
    .eq('page_path', pagePath)
    .gte('timestamp', startDate)
    .lte('timestamp', endDate);
  
  if (!clicks) return { page: pagePath, clicks: [] };
  
  // تجميع النقرات حسب الموقع
  const grouped = clicks.reduce((acc, click) => {
    const key = `${click.position_x},${click.position_y}`;
    if (!acc[key]) {
      acc[key] = {
        x: click.position_x,
        y: click.position_y,
        element: click.element_type,
        count: 0,
      };
    }
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { x: number; y: number; element?: string; count: number }>);
  
  return {
    page: pagePath,
    clicks: Object.values(grouped),
  };
}

// ── تسجيل نقرة (Click Event) ────────────────────────────────────────────────
export async function trackClick(
  pagePath: string,
  element: {
    type?: string;
    id?: string;
    text?: string;
  },
  position: { x: number; y: number }
): Promise<void> {
  try {
    const sessionId = getSessionId();
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('click_events').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      page_path: pagePath,
      element_type: element.type,
      element_id: element.id,
      element_text: element.text,
      position_x: position.x,
      position_y: position.y,
    });
  } catch (error) {
    console.warn('[Analytics] Failed to track click:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Saved Date Filters Management
// ═══════════════════════════════════════════════════════════════════════════

export interface SavedDateFilter {
  id: string;
  filter_name: string;
  start_date: string;
  end_date: string;
  is_default: boolean;
}

export async function getSavedFilters(userId: string): Promise<SavedDateFilter[]> {
  const { data } = await supabase
    .from('saved_date_filters')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  return data || [];
}

export async function saveFilter(
  userId: string,
  name: string,
  startDate: string,
  endDate: string,
  isDefault = false
): Promise<void> {
  // إذا كان هذا الفلتر افتراضي، نلغي الافتراضية عن الباقي
  if (isDefault) {
    await supabase
      .from('saved_date_filters')
      .update({ is_default: false })
      .eq('user_id', userId);
  }
  
  await supabase.from('saved_date_filters').insert({
    user_id: userId,
    filter_name: name,
    start_date: startDate,
    end_date: endDate,
    is_default: isDefault,
  });
}

export async function deleteFilter(filterId: string): Promise<void> {
  await supabase.from('saved_date_filters').delete().eq('id', filterId);
}

// ═══════════════════════════════════════════════════════════════════════════
// Advanced Analytics Functions
// ═══════════════════════════════════════════════════════════════════════════

export interface BrowserData {
  browser: string;
  visitors: number;
  percentage: number;
}

export async function getBrowserData(
  startDate: string,
  endDate: string
): Promise<BrowserData[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('browser, session_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views || views.length === 0) return [];
  
  const grouped = views.reduce((acc, view) => {
    const browser = view.browser || 'Unknown';
    if (!acc[browser]) {
      acc[browser] = new Set();
    }
    acc[browser].add(view.session_id);
    return acc;
  }, {} as Record<string, Set<string>>);
  
  const total = new Set(views.map(v => v.session_id)).size;
  
  return Object.entries(grouped)
    .map(([browser, sessions]) => ({
      browser,
      visitors: sessions.size,
      percentage: Math.round((sessions.size / total) * 100),
    }))
    .sort((a, b) => b.visitors - a.visitors);
}

export interface OSData {
  os: string;
  visitors: number;
  percentage: number;
}

export async function getOSData(
  startDate: string,
  endDate: string
): Promise<OSData[]> {
  const { data: views } = await supabase
    .from('page_views')
    .select('os, session_id')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  if (!views || views.length === 0) return [];
  
  const grouped = views.reduce((acc, view) => {
    const os = view.os || 'Unknown';
    if (!acc[os]) {
      acc[os] = new Set();
    }
    acc[os].add(view.session_id);
    return acc;
  }, {} as Record<string, Set<string>>);
  
  const total = new Set(views.map(v => v.session_id)).size;
  
  return Object.entries(grouped)
    .map(([os, sessions]) => ({
      os,
      visitors: sessions.size,
      percentage: Math.round((sessions.size / total) * 100),
    }))
    .sort((a, b) => b.visitors - a.visitors);
}
