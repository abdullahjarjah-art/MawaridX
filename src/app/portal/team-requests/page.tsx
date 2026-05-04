"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckSquare, Clock, CheckCircle, XCircle, CalendarDays } from "lucide-react";

type Request = {
  id: string; type: string; title: string; details?: string;
  status: string; createdAt: string;
  managerNote?: string; hrNote?: string;
  startDate?: string; endDate?: string; amount?: number;
  employee: { firstName: string; lastName: string; employeeNumber: string; department?: string; jobTitle?: string };
};

type Leave = {
  id: string; type: string; startDate: string; endDate: string;
  days: number; reason?: string; status: string; attachmentUrl?: string | null;
  employee: { firstName: string; lastName: string; employeeNumber: string };
};

const requestTypes: Record<string, string> = {
  leave: "طلب إجازة", attendance_fix: "تصحيح بصمة", loan: "طلب سلفة",
  custody: "طلب عهدة", exit_return: "طلب خروج وعودة", resignation: "طلب استقالة", letter: "طلب خطاب",
};

const leaveTypeMap: Record<string, string> = {
  annual: "سنوية", sick: "مرضية", emergency: "طارئة",
  unpaid: "بدون راتب", maternity: "أمومة", paternity: "أبوة",
};

const statusMap: Record<string, { label: string; variant: "default" | "outline" | "destructive" | "secondary" }> = {
  pending:           { label: "بانتظار موافقتك",  variant: "outline" },
  manager_approved:  { label: "بانتظار الإدارة",   variant: "secondary" },
  approved:          { label: "معتمد",             variant: "default" },
  rejected:          { label: "مرفوض",             variant: "destructive" },
};

export default function TeamRequestsPage() {
  const [managerId, setManagerId] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [tab, setTab] = useState<"requests" | "leaves">("leaves");
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<Request | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(async data => {
      if (data.employee?.id) {
        const empId = data.employee.id;
        setManagerId(empId);
        fetchRequests(empId);

        // جلب موظفي الفريق
        const empRes = await fetch("/api/employees");
        const employees = await empRes.json();
        const teamIds = (Array.isArray(employees) ? employees : [])
          .filter((e: { managerId?: string }) => e.managerId === empId)
          .map((e: { id: string }) => e.id);
        setEmployeeIds(teamIds);
        fetchLeaves(teamIds);
      }
    });
  }, []);

  const fetchRequests = (mgrId?: string) => {
    const id = mgrId ?? managerId;
    if (!id) return;
    fetch(`/api/requests?managerId=${id}`)
      .then(r => r.json())
      .then(data => setRequests(Array.isArray(data) ? data : []));
  };

  const fetchLeaves = async (ids: string[]) => {
    if (!ids.length) return;
    const all: Leave[] = [];
    for (const id of ids) {
      const res = await fetch(`/api/leaves?employeeId=${id}`);
      const data = await res.json();
      if (Array.isArray(data)) all.push(...data);
    }
    setLeaves(all.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
  };

  const filtered = requests.filter(r => filter === "all" ? true : r.status === filter);
  const pendingLeaves = leaves.filter(l => l.status === "pending");

  const stats = {
    all: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    rejected: requests.filter(r => r.status === "rejected").length,
  };

  const handleAction = async (status: "approved" | "rejected") => {
    if (!selected) return;
    setLoading(true);
    await fetch(`/api/requests/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, managerNote: note, role: "manager" }),
    });
    setLoading(false);
    setSelected(null);
    setNote("");
    fetchRequests();
  };

  const handleLeaveAction = async (status: "manager_approved" | "rejected") => {
    if (!selectedLeave) return;
    setLoading(true);
    await fetch(`/api/leaves/${selectedLeave.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, notes: note }),
    });
    setLoading(false);
    setSelectedLeave(null);
    setNote("");
    fetchLeaves(employeeIds);
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
          <CheckSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">طلبات الفريق</h1>
          <p className="text-sm text-gray-500">الطلبات الواردة من موظفيك</p>
        </div>
      </div>

      {/* تبويبات */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button onClick={() => setTab("leaves")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "leaves" ? "border-sky-600 text-sky-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <CalendarDays className="h-4 w-4" />
          إجازات الفريق
          {pendingLeaves.length > 0 && (
            <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingLeaves.length}</span>
          )}
        </button>
        <button onClick={() => setTab("requests")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${tab === "requests" ? "border-sky-600 text-sky-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
          <CheckSquare className="h-4 w-4" />
          طلبات أخرى
          {stats.pending > 0 && (
            <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.pending}</span>
          )}
        </button>
      </div>

      {/* تبويب الإجازات */}
      {tab === "leaves" && (
        <>
          {leaves.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-gray-400">
              <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات إجازة من الفريق</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {leaves.map(l => (
                <Card key={l.id} className={`hover:shadow-sm transition-shadow cursor-pointer ${l.status === "pending" ? "border-yellow-200 bg-yellow-50/30" : ""}`}
                  onClick={() => { setSelectedLeave(l); setNote(""); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            إجازة {leaveTypeMap[l.type] ?? l.type}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{l.days} يوم</span>
                        </div>
                        <p className="font-semibold text-gray-900 text-sm">{l.employee.firstName} {l.employee.lastName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(l.startDate).toLocaleDateString("ar-SA")} — {new Date(l.endDate).toLocaleDateString("ar-SA")}
                        </p>
                        {l.reason && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{l.reason}</p>}
                        {l.attachmentUrl && (
                          <a
                            href={l.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 mt-1 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5 hover:bg-green-100"
                          >
                            📎 عذر طبي
                          </a>
                        )}
                      </div>
                      <div className="text-left shrink-0">
                        {l.status === "pending" ? (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full block text-center">بانتظار ردك</span>
                        ) : l.status === "manager_approved" ? (
                          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full block text-center">وافقت عليها</span>
                        ) : l.status === "approved" ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full block text-center">موافق عليها</span>
                        ) : (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full block text-center">مرفوضة</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* تبويب الطلبات الأخرى */}
      {tab === "requests" && (
        <>
          {/* إحصائيات */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { key: "all",      label: "الكل",    color: "bg-sky-50 text-sky-700",     icon: <CheckSquare className="h-4 w-4" /> },
              { key: "pending",  label: "معلقة",   color: "bg-yellow-50 text-yellow-700", icon: <Clock className="h-4 w-4" /> },
              { key: "approved", label: "موافق",   color: "bg-green-50 text-green-700",   icon: <CheckCircle className="h-4 w-4" /> },
              { key: "rejected", label: "مرفوض",   color: "bg-red-50 text-red-700",       icon: <XCircle className="h-4 w-4" /> },
            ].map(s => (
              <button key={s.key} onClick={() => setFilter(s.key)}
                className={`rounded-xl p-3 text-center transition-all border-2 ${s.color} ${filter === s.key ? "border-current" : "border-transparent"}`}>
                <div className="flex justify-center mb-1">{s.icon}</div>
                <p className="text-xl font-bold">{stats[s.key as keyof typeof stats]}</p>
                <p className="text-xs mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-gray-400">
              <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>{filter === "pending" ? "لا توجد طلبات معلقة" : "لا توجد طلبات"}</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filtered.map(r => {
                const s = statusMap[r.status] ?? statusMap.pending;
                return (
                  <Card key={r.id} className="hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => { setSelected(r); setNote(r.managerNote ?? ""); }}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                              {requestTypes[r.type] ?? r.type}
                            </span>
                            <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                          </div>
                          <p className="font-semibold text-gray-900 text-sm">{r.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {r.employee.firstName} {r.employee.lastName}
                            {r.employee.department && ` — ${r.employee.department}`}
                          </p>
                          {r.details && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{r.details}</p>}
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString("ar-SA")}</p>
                          {r.status === "pending" && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full mt-1 block text-center">
                              بانتظار ردك
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* تفاصيل الإجازة */}
      <Dialog open={!!selectedLeave} onOpenChange={() => setSelectedLeave(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>تفاصيل طلب الإجازة</DialogTitle></DialogHeader>
          {selectedLeave && (
            <div className="space-y-4">
              <div className="bg-purple-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-purple-800">إجازة {leaveTypeMap[selectedLeave.type] ?? selectedLeave.type}</span>
                  <span className="text-sm text-purple-600 font-medium">{selectedLeave.days} يوم</span>
                </div>
                <p className="text-sm text-gray-600">
                  {new Date(selectedLeave.startDate).toLocaleDateString("ar-SA")} — {new Date(selectedLeave.endDate).toLocaleDateString("ar-SA")}
                </p>
                {selectedLeave.reason && <p className="text-sm text-gray-500">{selectedLeave.reason}</p>}
              </div>

              <div className="bg-sky-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-gray-700">الموظف</p>
                <p className="text-gray-600">{selectedLeave.employee.firstName} {selectedLeave.employee.lastName}</p>
                <p className="text-xs text-gray-400">{selectedLeave.employee.employeeNumber}</p>
              </div>

              {selectedLeave.type === "sick" && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
                  <p className="font-medium text-green-800 mb-2">العذر الطبي</p>
                  {selectedLeave.attachmentUrl ? (
                    <div className="space-y-2">
                      <a
                        href={selectedLeave.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-green-700 hover:text-green-900 hover:underline"
                      >
                        📎 عرض المرفق الطبي
                      </a>
                      <p className="text-[11px] text-green-600">هذا الطلب لن يُخصم من رصيد الإجازة المرضية لوجود عذر طبي.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-orange-700">⚠️ لم يرفق الموظف عذراً طبياً — سيُخصم من رصيد الإجازة المرضية.</p>
                  )}
                </div>
              )}

              {selectedLeave.status === "pending" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">ملاحظة (اختياري)</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    rows={3}
                    placeholder="أضف ملاحظة..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedLeave(null)}>إغلاق</Button>
            {selectedLeave?.status === "pending" && (
              <>
                <Button variant="destructive" onClick={() => handleLeaveAction("rejected")} disabled={loading}>
                  {loading ? "..." : "رفض"}
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleLeaveAction("manager_approved")} disabled={loading}>
                  {loading ? "..." : "موافقة المدير"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* تفاصيل الطلب */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-full">
                  {requestTypes[selected.type] ?? selected.type}
                </span>
                <Badge variant={statusMap[selected.status]?.variant ?? "outline"}>
                  {statusMap[selected.status]?.label}
                </Badge>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-gray-900">{selected.title}</p>
                {selected.details && <p className="text-sm text-gray-600">{selected.details}</p>}
                {selected.startDate && (
                  <p className="text-xs text-gray-500">من: {new Date(selected.startDate).toLocaleDateString("ar-SA")}</p>
                )}
                {selected.endDate && (
                  <p className="text-xs text-gray-500">إلى: {new Date(selected.endDate).toLocaleDateString("ar-SA")}</p>
                )}
                {selected.amount != null && (
                  <p className="text-xs text-gray-500">المبلغ: {selected.amount.toLocaleString("ar-SA")} ر.س</p>
                )}
              </div>

              <div className="bg-sky-50 rounded-xl p-3 text-sm">
                <p className="font-medium text-gray-700">الموظف</p>
                <p className="text-gray-600">{selected.employee.firstName} {selected.employee.lastName}</p>
                <p className="text-xs text-gray-400">{selected.employee.department} — {selected.employee.jobTitle}</p>
              </div>

              {selected.status === "pending" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">ملاحظتك (اختياري)</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    rows={3}
                    placeholder="أضف ملاحظة للموظف..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </div>
              )}

              {selected.status !== "pending" && selected.managerNote && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <p className="font-medium text-gray-700 mb-1">ملاحظتك السابقة</p>
                  <p className="text-gray-600">{selected.managerNote}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>إغلاق</Button>
            {selected?.status === "pending" && (
              <>
                <Button variant="destructive" onClick={() => handleAction("rejected")} disabled={loading}>
                  {loading ? "..." : "رفض"}
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAction("approved")} disabled={loading}>
                  {loading ? "..." : "موافقة"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
