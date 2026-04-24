"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClipboardList, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { EmployeeAvatar } from "@/components/employee-avatar";
import { useLang } from "@/components/lang-provider";

type Request = {
  id: string; type: string; title: string; details?: string;
  status: string; createdAt: string;
  managerId?: string; managerNote?: string; managerAt?: string;
  hrNote?: string; startDate?: string; endDate?: string; amount?: number;
  employee: { firstName: string; lastName: string; employeeNumber: string; department?: string; jobTitle?: string; managerId?: string; photo?: string | null };
};

export default function RequestsPage() {
  const { t } = useLang();
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Request | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const pageSize = 15;

  const requestTypes: Record<string, string> = {
    leave: t("طلب إجازة"), attendance_fix: t("تصحيح بصمة"), loan: t("طلب سلفة"),
    custody: t("طلب عهدة"), exit_return: t("طلب خروج وعودة"), resignation: t("طلب استقالة"),
    letter: t("طلب خطاب"), overtime: t("ساعات عمل إضافية"),
  };

  const statusMap: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> = {
    pending:          { label: t("بانتظار المدير"),   variant: "outline" },
    manager_approved: { label: t("بانتظارك"),          variant: "secondary" },
    approved:         { label: t("معتمدة"),             variant: "default" },
    rejected:         { label: t("مرفوض"),              variant: "destructive" },
  };

  const fetchRequests = () => {
    const params = new URLSearchParams();
    params.set("all", "1");
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (filter !== "all") params.set("status", filter === "pending" ? "pending" : filter);

    fetch(`/api/requests?${params}`)
      .then(r => r.json())
      .then(data => {
        setRequests(data.requests ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      })
      .catch(() => {});

    fetch("/api/requests?all=1")
      .then(r => r.json())
      .then(data => {
        const all = Array.isArray(data) ? data : [];
        setStats({
          all: all.length,
          pending: all.filter((r: Request) => r.status === "pending" || r.status === "manager_approved").length,
          approved: all.filter((r: Request) => r.status === "approved").length,
          rejected: all.filter((r: Request) => r.status === "rejected").length,
        });
      })
      .catch(() => {});
  };

  useEffect(() => { fetchRequests(); }, [page, filter]);

  const handleAction = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setLoading(true);
    await fetch(`/api/requests/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, hrNote: note, role: "hr" }),
    });
    setLoading(false);
    setSelected(null);
    setNote("");
    fetchRequests();
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("الطلبات")}</h1>
          <p className="text-sm text-gray-500">{t("جميع طلبات الموظفين")}</p>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { key: "all",      label: t("الكل"),    color: "bg-sky-50 text-sky-700",       icon: <ClipboardList className="h-4 w-4" /> },
          { key: "pending",  label: t("معلقة"),   color: "bg-yellow-50 text-yellow-700", icon: <Clock className="h-4 w-4" /> },
          { key: "approved", label: t("موافق"),   color: "bg-green-50 text-green-700",   icon: <CheckCircle className="h-4 w-4" /> },
          { key: "rejected", label: t("مرفوض"),   color: "bg-red-50 text-red-700",       icon: <XCircle className="h-4 w-4" /> },
        ].map(s => (
          <button key={s.key} onClick={() => { setFilter(s.key); setPage(1); }}
            className={`rounded-xl p-3 text-center transition-all border-2 ${s.color} ${filter === s.key ? "border-current" : "border-transparent"}`}>
            <div className="flex justify-center mb-1">{s.icon}</div>
            <p className="text-xl font-bold">{stats[s.key as keyof typeof stats]}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {requests.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-gray-400">{t("لا توجد طلبات")}</CardContent></Card>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الموظف")}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t("نوع الطلب")}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t("العنوان")}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t("التاريخ")}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">{t("الحالة")}</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map(r => {
                const s = statusMap[r.status] ?? statusMap.pending;
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <EmployeeAvatar photo={r.employee.photo} firstName={r.employee.firstName} lastName={r.employee.lastName} size="sm" />
                        <div>
                          <p className="font-medium text-gray-900">{r.employee.firstName} {r.employee.lastName}</p>
                          <p className="text-xs text-gray-400">{r.employee.department ?? r.employee.jobTitle ?? r.employee.employeeNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.type === "overtime" ? "bg-violet-100 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
                        {requestTypes[r.type] ?? r.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.title}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(r.createdAt).toLocaleDateString("ar-SA")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.variant}>{s.label}</Badge>
                      {r.status === "pending" && !r.managerId && (
                        <span className="block text-[10px] text-amber-600 mt-0.5">{t("بدون مدير")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(r); setNote(""); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />

      {/* تفاصيل الطلب */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("تفاصيل الطلب")}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${selected.type === "overtime" ? "bg-violet-100 text-violet-700" : "bg-sky-50 text-sky-700"}`}>
                  {requestTypes[selected.type] ?? selected.type}
                </span>
                <Badge variant={statusMap[selected.status]?.variant ?? "outline"}>{statusMap[selected.status]?.label}</Badge>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-900">{selected.title}</p>
                {selected.details && <p className="text-sm text-gray-600">{selected.details}</p>}
                {selected.startDate && <p className="text-xs text-gray-500">{t("من")}: {new Date(selected.startDate).toLocaleDateString("ar-SA")}</p>}
                {selected.endDate && <p className="text-xs text-gray-500">{t("إلى")}: {new Date(selected.endDate).toLocaleDateString("ar-SA")}</p>}
                {selected.type === "overtime" && selected.amount != null && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">
                      ⏱ {Math.floor(selected.amount / 60) > 0 ? `${Math.floor(selected.amount / 60)} س ` : ""}
                      {selected.amount % 60 > 0 ? `${Math.round(selected.amount % 60)} د` : ""}
                      {" "}({Math.round(selected.amount)} {t("دقيقة")})
                    </span>
                  </div>
                )}
                {selected.type !== "overtime" && selected.amount && <p className="text-xs text-gray-500">{t("المبلغ")}: {selected.amount.toLocaleString("ar-SA")} {t("ر.س")}</p>}
              </div>

              <div className="bg-sky-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-gray-700">{t("الموظف")}</p>
                <p className="text-gray-600">{selected.employee.firstName} {selected.employee.lastName}</p>
                <p className="text-xs text-gray-400">{selected.employee.department} — {selected.employee.jobTitle}</p>
              </div>

              {selected.managerNote && (
                <div className="bg-green-50 rounded-xl p-3 text-sm">
                  <p className="font-medium text-gray-700 mb-1">{t("ملاحظة المدير المباشر")}</p>
                  <p className="text-gray-600">{selected.managerNote}</p>
                  {selected.managerAt && <p className="text-xs text-gray-400 mt-1">{new Date(selected.managerAt).toLocaleDateString("ar-SA")}</p>}
                </div>
              )}

              {selected.status === "manager_approved" && (
                <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">
                  ✓ {t("وافق المدير المباشر — بانتظار موافقتك النهائية")}
                </div>
              )}

              {selected.status === "pending" && !selected.managerId && (
                <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
                  {t("الموظف ليس لديه مدير مباشر — الطلب يحتاج موافقتك مباشرة")}
                </div>
              )}

              {selected.status === "pending" && selected.managerId && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">
                  {t("الطلب بانتظار موافقة المدير المباشر أولاً")}
                </div>
              )}

              {(selected.status === "manager_approved" || (selected.status === "pending" && !selected.managerId)) && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">{t("ملاحظة الإدارة (اختياري)")}</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    rows={2}
                    placeholder={t("ملاحظة للموظف...")}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button variant="destructive" size="sm" className="flex-1" disabled={loading} onClick={() => handleAction("rejected")}>{t("رفض")}</Button>
                    <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading} onClick={() => handleAction("approved")}>{t("موافقة نهائية")}</Button>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>{t("إغلاق")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
