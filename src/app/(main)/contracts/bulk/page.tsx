"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckSquare, Square, Save, RefreshCw, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmployeeAvatar } from "@/components/employee-avatar";

type Emp = {
  id: string; employeeNumber: string; firstName: string; lastName: string;
  photo?: string | null; jobTitle?: string; department?: string;
  startDate: string;
  endDate?: string | null;
  contractDuration?: number | null;
  noticePeriodDays: number;
};

type Row = Emp & {
  selected: boolean;
  newDuration: string;   // بالسنوات
  newEndDate: string;
  newNotice: string;     // بالأيام
};

function addYears(dateStr: string, years: number): string {
  if (!dateStr || isNaN(years) || years <= 0) return "";
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + Math.floor(years));
  // نصف سنة → 6 أشهر
  const remainder = years % 1;
  if (remainder) d.setMonth(d.getMonth() + Math.round(remainder * 12));
  return d.toISOString().slice(0, 10);
}

export default function BulkContractsPage() {
  const router = useRouter();
  const [rows, setRows]             = useState<Row[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState("");

  // الإعدادات الافتراضية
  const [defDuration, setDefDuration] = useState("1");
  const [defNotice,   setDefNotice]   = useState("60");
  const [search,      setSearch]      = useState("");

  useEffect(() => {
    fetch("/api/employees?all=1")
      .then(r => r.json())
      .then(d => {
        const list: Emp[] = Array.isArray(d) ? d : (d.data ?? []);
        setRows(list.map(e => ({
          ...e,
          selected: true,
          newDuration: e.contractDuration ? String(e.contractDuration) : "1",
          newEndDate:  e.endDate ? e.endDate.slice(0, 10) : addYears(e.startDate, 1),
          newNotice:   String(e.noticePeriodDays ?? 60),
        })));
        setLoading(false);
      });
  }, []);

  // تطبيق الإعدادات الافتراضية على المحددين
  const applyDefaults = () => {
    const dur = parseFloat(defDuration) || 1;
    setRows(prev => prev.map(r =>
      r.selected ? {
        ...r,
        newDuration: defDuration,
        newEndDate: addYears(r.startDate, dur),
        newNotice: defNotice,
      } : r
    ));
  };

  const toggleAll = () => {
    const allSel = filtered.every(r => r.selected);
    const ids = new Set(filtered.map(r => r.id));
    setRows(prev => prev.map(r => ids.has(r.id) ? { ...r, selected: !allSel } : r));
  };

  const toggle = (id: string) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, selected: !r.selected } : r));

  const updateRow = (id: string, field: keyof Row, val: string) =>
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: val };
      // إذا تغيرت المدة → أعد حساب تاريخ الانتهاء
      if (field === "newDuration") {
        const dur = parseFloat(val);
        updated.newEndDate = dur > 0 ? addYears(r.startDate, dur) : r.newEndDate;
      }
      return updated;
    }));

  const filtered = useMemo(() =>
    rows.filter(r =>
      `${r.firstName} ${r.lastName} ${r.employeeNumber} ${r.department ?? ""}`.toLowerCase().includes(search.toLowerCase())
    ), [rows, search]);

  const selectedCount = filtered.filter(r => r.selected).length;

  const save = async () => {
    const toSave = rows.filter(r => r.selected);
    if (toSave.length === 0) { setError("لم يتم تحديد أي موظف"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/contracts/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: toSave.map(r => ({
          id: r.id,
          contractDuration: parseFloat(r.newDuration) || null,
          endDate: r.newEndDate || null,
          noticePeriodDays: parseInt(r.newNotice) || 60,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => router.push("/contracts"), 1200); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "حدث خطأ"); }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/contracts")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">تعيين عقود جماعي</h1>
          <p className="text-sm text-gray-500">ضبط العقود لكل الموظفين دفعة واحدة</p>
        </div>
      </div>

      {/* الإعدادات الافتراضية */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 mb-5 shadow-sm">
        <p className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-blue-600" />
          الإعدادات الافتراضية — تُطبَّق على المحددين
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">مدة العقد</label>
            <Select value={["1","2",""].includes(defDuration) ? defDuration : "custom"}
              onValueChange={v => v && v !== "custom" && setDefDuration(v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">سنة واحدة</SelectItem>
                <SelectItem value="2">سنتان</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>
            {!["1","2"].includes(defDuration) && (
              <Input className="h-10 mt-2" type="number" min="0.5" step="0.5" placeholder="مثال: 3"
                value={defDuration} onChange={e => setDefDuration(e.target.value)} />
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">فترة الإشعار</label>
            <Select value={["30","60","90"].includes(defNotice) ? defNotice : "custom"}
              onValueChange={v => v && v !== "custom" && setDefNotice(v)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="30">شهر (30 يوم)</SelectItem>
                <SelectItem value="60">شهران (60 يوم)</SelectItem>
                <SelectItem value="90">3 أشهر (90 يوم)</SelectItem>
                <SelectItem value="custom">مخصص</SelectItem>
              </SelectContent>
            </Select>
            {!["30","60","90"].includes(defNotice) && (
              <Input className="h-10 mt-2" type="number" min="1" placeholder="عدد الأيام"
                value={defNotice} onChange={e => setDefNotice(e.target.value)} />
            )}
          </div>
          <div className="flex items-end">
            <Button onClick={applyDefaults} className="w-full h-10 gap-2" variant="outline">
              <RefreshCw className="h-4 w-4" />
              تطبيق على المحددين ({selectedCount})
            </Button>
          </div>
        </div>
      </div>

      {/* شريط البحث + تحديد الكل + حفظ */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input placeholder="بحث بالاسم أو القسم..." value={search}
          onChange={e => setSearch(e.target.value)} className="h-9 text-sm flex-1" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={toggleAll} className="gap-1.5 h-9">
            {filtered.every(r => r.selected)
              ? <><CheckSquare className="h-4 w-4" /> إلغاء الكل</>
              : <><Square className="h-4 w-4" /> تحديد الكل</>}
          </Button>
          <Button onClick={save} disabled={saving || saved} className="gap-1.5 h-9 min-w-28">
            {saved
              ? "✅ تم الحفظ"
              : saving
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> جارٍ الحفظ...</>
              : <><Save className="h-4 w-4" /> حفظ ({rows.filter(r => r.selected).length})</>}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}

      {/* الجدول */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-white dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          {/* Header الجدول */}
          <div className="hidden sm:grid grid-cols-[auto_1fr_120px_140px_100px_36px] gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <div className="w-6" />
            <div>الموظف</div>
            <div>مدة العقد (سنوات)</div>
            <div>تاريخ الانتهاء</div>
            <div>فترة الإشعار (أيام)</div>
            <div />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map(row => (
              <div key={row.id}
                className={`grid grid-cols-1 sm:grid-cols-[auto_1fr_120px_140px_100px_36px] gap-3 px-4 py-3 items-center transition-colors ${row.selected ? "bg-white dark:bg-gray-800" : "bg-gray-50/60 dark:bg-gray-800/40 opacity-60"}`}>

                {/* Checkbox */}
                <button onClick={() => toggle(row.id)} className="shrink-0">
                  {row.selected
                    ? <CheckSquare className="h-5 w-5 text-blue-600" />
                    : <Square className="h-5 w-5 text-gray-300" />}
                </button>

                {/* الموظف */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <EmployeeAvatar photo={row.photo} firstName={row.firstName} lastName={row.lastName} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{row.firstName} {row.lastName}</p>
                    <p className="text-[10px] text-gray-400">
                      {row.employeeNumber}
                      {row.department ? ` · ${row.department}` : ""}
                      <span className="mr-1 text-gray-300">
                        · بداية: {new Date(row.startDate).toLocaleDateString("ar-SA")}
                      </span>
                    </p>
                  </div>
                </div>

                {/* المدة */}
                <div>
                  <label className="text-[10px] text-gray-400 sm:hidden block mb-1">مدة العقد (سنوات)</label>
                  <Input
                    type="number" min="0.5" step="0.5"
                    className="h-8 text-sm text-center"
                    value={row.newDuration}
                    onChange={e => updateRow(row.id, "newDuration", e.target.value)}
                  />
                </div>

                {/* تاريخ الانتهاء */}
                <div>
                  <label className="text-[10px] text-gray-400 sm:hidden block mb-1">تاريخ الانتهاء</label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={row.newEndDate}
                    onChange={e => updateRow(row.id, "newEndDate", e.target.value)}
                  />
                </div>

                {/* الإشعار */}
                <div>
                  <label className="text-[10px] text-gray-400 sm:hidden block mb-1">أيام الإشعار</label>
                  <Input
                    type="number" min="1"
                    className="h-8 text-sm text-center"
                    value={row.newNotice}
                    onChange={e => updateRow(row.id, "newNotice", e.target.value)}
                  />
                </div>

                {/* مؤشر الحالة */}
                <div className="hidden sm:flex justify-center">
                  {row.endDate
                    ? <span className="w-2 h-2 rounded-full bg-green-400" title="لديه عقد" />
                    : <span className="w-2 h-2 rounded-full bg-gray-200" title="بدون عقد" />}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" /> لديه عقد</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-200" /> بدون عقد</span>
            </div>
            <span>{rows.filter(r => r.selected).length} موظف محدد من {rows.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
