"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Package, CalendarDays, Plane, Monitor, CheckCircle2, XCircle, Clock,
  Laptop, Smartphone, Car, Key, CreditCard, ShieldCheck, Boxes, ArrowLeft,
} from "lucide-react";
import { useLang } from "@/components/lang-provider";

type Custody = {
  id: string;
  type: string;
  title: string;
  description?: string;
  quantity?: number;
  unit?: string;
  status: string;
  createdBy: string;
  approvedAt?: string;
  employeeNote?: string;
  createdAt: string;
};

const typeIcon: Record<string, React.ElementType> = {
  leave_balance: CalendarDays,
  travel_ticket: Plane,
  equipment: Monitor,
  other: Package,
};

const typeLabel: Record<string, string> = {
  leave_balance: "رصيد إجازة",
  travel_ticket: "تذكرة سفر",
  equipment: "جهاز / معدة",
  other: "أخرى",
};

const typeColor: Record<string, string> = {
  leave_balance: "from-emerald-500 to-teal-500",
  travel_ticket: "from-sky-500 to-blue-500",
  equipment: "from-violet-500 to-purple-500",
  other: "from-gray-500 to-slate-500",
};

const typeBg: Record<string, string> = {
  leave_balance: "bg-emerald-100 text-emerald-600",
  travel_ticket: "bg-sky-100 text-sky-600",
  equipment: "bg-violet-100 text-violet-600",
  other: "bg-gray-100 text-gray-600",
};

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:  { label: "بانتظار موافقتك", color: "text-amber-600", bg: "bg-amber-50 border-amber-200",  icon: Clock },
  approved: { label: "تم الاستلام",     color: "text-green-600", bg: "bg-green-50 border-green-200",  icon: CheckCircle2 },
  rejected: { label: "مرفوضة",          color: "text-red-500",   bg: "bg-red-50 border-red-200",      icon: XCircle },
};

type Tab = "all" | "pending" | "approved" | "rejected";

// Smart icon based on title keywords
function getSmartIcon(custody: Custody) {
  const title = custody.title.toLowerCase();
  if (title.includes("لابتوب") || title.includes("laptop")) return Laptop;
  if (title.includes("هاتف") || title.includes("جوال") || title.includes("phone") || title.includes("mobile")) return Smartphone;
  if (title.includes("سيارة") || title.includes("car")) return Car;
  if (title.includes("مفتاح") || title.includes("key")) return Key;
  if (title.includes("بطاقة") || title.includes("card")) return CreditCard;
  return typeIcon[custody.type] ?? Package;
}

export default function PortalCustodiesPage() {
  const { t } = useLang();
  const [custodies, setCustodies] = useState<Custody[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Custody | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("all");

  useEffect(() => {
    fetch("/api/employees/me/custodies")
      .then((r) => r.json())
      .then((data) => { setCustodies(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAction = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/custodies/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, employeeNote: note }),
    });
    if (res.ok) {
      const updated = await res.json();
      setCustodies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setSelected(null);
      setNote("");
    }
    setSaving(false);
  };

  const pendingCount  = custodies.filter((c) => c.status === "pending").length;
  const approvedCount = custodies.filter((c) => c.status === "approved").length;
  const rejectedCount = custodies.filter((c) => c.status === "rejected").length;

  const filtered = tab === "all" ? custodies : custodies.filter((c) => c.status === tab);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all",      label: "الكل",    count: custodies.length },
    { key: "pending",  label: "معلقة",   count: pendingCount },
    { key: "approved", label: "مستلمة",  count: approvedCount },
    { key: "rejected", label: "مرفوضة",  count: rejectedCount },
  ];

  return (
    <div className="p-3 sm:p-6 max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="bg-gradient-to-l from-sky-600 via-sky-500 to-indigo-500 rounded-2xl p-5 sm:p-6 text-white mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-8 translate-y-8" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Boxes className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t("عهدتي")}</h1>
              <p className="text-sky-100 text-sm">{t("العهد والمستلزمات المسندة إليك")}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{custodies.length}</p>
              <p className="text-[11px] text-sky-100">{t("إجمالي العهد")}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{approvedCount}</p>
              <p className="text-[11px] text-sky-100">{t("مستلمة")}</p>
            </div>
            <div className={`backdrop-blur-sm rounded-xl p-3 text-center ${pendingCount > 0 ? "bg-amber-400/30" : "bg-white/15"}`}>
              <p className="text-2xl font-bold">{pendingCount}</p>
              <p className="text-[11px] text-sky-100">{t("بانتظار موافقتك")}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`mr-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                tab === t.key ? "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400" : "bg-gray-200 dark:bg-gray-700 text-gray-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
            <Package className="h-10 w-10 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {tab === "all" ? t("لا توجد عهد مسندة إليك") : t("لا توجد عهد في هذه الفئة")}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t("ستظهر هنا عند إسنادها من قبل الإدارة")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <CustodyCard key={c.id} custody={c} onAction={() => { setSelected(c); setNote(""); }} />
          ))}
        </div>
      )}

      {/* ── Approval Dialog ── */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("مراجعة العهدة")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${typeBg[selected.type] ?? "bg-gray-100 text-gray-600"} flex items-center justify-center`}>
                    {(() => { const Icon = getSmartIcon(selected); return <Icon className="h-5 w-5" />; })()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{selected.title}</p>
                    <p className="text-xs text-gray-500">{typeLabel[selected.type] ?? selected.type}</p>
                  </div>
                </div>
                {selected.description && <p className="text-sm text-gray-600 dark:text-gray-400">{selected.description}</p>}
                {selected.quantity != null && (
                  <div className="flex items-center gap-2 mt-2 bg-sky-50 dark:bg-sky-900/20 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-semibold text-sky-700 dark:text-sky-400">{selected.quantity} {selected.unit ?? ""}</span>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-3">{t("أضافها")}: {selected.createdBy} — {new Date(selected.createdAt).toLocaleDateString("ar-SA")}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">{t("ملاحظة (اختياري)")}</label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("يمكنك إضافة ملاحظة...")} className="text-sm" rows={3} />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 flex-row-reverse">
            <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={saving} onClick={() => handleAction("approved")}>
              <CheckCircle2 className="h-4 w-4 ml-1" /> {t("استلام وموافقة")}
            </Button>
            <Button variant="destructive" className="flex-1" disabled={saving} onClick={() => handleAction("rejected")}>
              <XCircle className="h-4 w-4 ml-1" /> {t("رفض")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustodyCard({ custody, onAction }: { custody: Custody; onAction?: () => void }) {
  const Icon = getSmartIcon(custody);
  const st = statusConfig[custody.status] ?? statusConfig.pending;
  const StIcon = st.icon;
  const gradColor = typeColor[custody.type] ?? "from-gray-500 to-slate-500";
  const bgColor = typeBg[custody.type] ?? "bg-gray-100 text-gray-600";

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-md ${
      custody.status === "pending" ? "border-amber-200 dark:border-amber-800 ring-1 ring-amber-100 dark:ring-amber-900/30" : "border-gray-100 dark:border-gray-700"
    }`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon with gradient accent */}
          <div className="relative">
            <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
              <Icon className="h-6 w-6" />
            </div>
            {custody.status === "pending" && (
              <span className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white dark:border-gray-800 animate-pulse" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title + Status */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900 dark:text-white text-sm">{custody.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{typeLabel[custody.type] ?? custody.type}</p>
              </div>
              <Badge className={`text-[10px] border shrink-0 ${st.bg} ${st.color}`} variant="outline">
                <StIcon className="h-3 w-3 ml-0.5" />{st.label}
              </Badge>
            </div>

            {/* Description */}
            {custody.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{custody.description}</p>
            )}

            {/* Quantity + Meta row */}
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2.5">
              {custody.quantity != null && (
                <span className="text-xs font-semibold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 px-2 py-0.5 rounded-md">
                  {custody.quantity} {custody.unit ?? ""}
                </span>
              )}
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {new Date(custody.createdAt).toLocaleDateString("ar-SA")}
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                بواسطة: {custody.createdBy}
              </span>
            </div>

            {/* Employee note */}
            {custody.employeeNote && (
              <div className="mt-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                  <span className="font-medium not-italic">ملاحظتك:</span> {custody.employeeNote}
                </p>
              </div>
            )}

            {/* Approval date */}
            {custody.approvedAt && custody.status === "approved" && (
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                تم الاستلام: {new Date(custody.approvedAt).toLocaleDateString("ar-SA")}
              </p>
            )}
          </div>
        </div>

        {/* Pending action button */}
        {custody.status === "pending" && onAction && (
          <button
            onClick={onAction}
            className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-l from-amber-500 to-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98]"
          >
            <ShieldCheck className="h-4 w-4" />
            مراجعة والموافقة
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
