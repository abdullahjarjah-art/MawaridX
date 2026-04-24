"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";

type Log = {
  id: string; userId?: string; userName?: string;
  action: string; entity: string; entityId?: string;
  details?: string; createdAt: string;
};

const actionMap: Record<string, { label: string; color: string }> = {
  create: { label: "إنشاء", color: "bg-green-100 text-green-700" },
  update: { label: "تعديل", color: "bg-sky-100 text-sky-700" },
  delete: { label: "حذف", color: "bg-red-100 text-red-700" },
  approve: { label: "موافقة", color: "bg-emerald-100 text-emerald-700" },
  reject: { label: "رفض", color: "bg-orange-100 text-orange-700" },
  login: { label: "دخول", color: "bg-purple-100 text-purple-700" },
};

const entityMap: Record<string, string> = {
  employee: "موظف", request: "طلب", salary: "راتب",
  leave: "إجازة", attendance: "حضور", announcement: "إعلان",
  settings: "إعدادات", user: "مستخدم",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState("all");
  const [action, setAction] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (entity !== "all") params.set("entity", entity);
    if (action !== "all") params.set("action", action);

    fetch(`/api/audit-log?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs ?? []); setTotal(d.total ?? 0); setPages(d.pages ?? 1); })
      .catch(() => {});
  }, [page, entity, action]);

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">سجل التدقيق</h1>
            <p className="text-sm text-gray-500">{total} عملية مسجلة</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={entity} onValueChange={v => { setEntity(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-32 h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="الكيان" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {Object.entries(entityMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={action} onValueChange={v => { setAction(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-28 h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="الإجراء" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {Object.entries(actionMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>لا توجد سجلات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const a = actionMap[log.action] ?? { label: log.action, color: "bg-gray-100 text-gray-700" };
            return (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.color}`}>{a.label}</span>
                      <Badge variant="outline" className="text-xs">{entityMap[log.entity] ?? log.entity}</Badge>
                      <span className="text-sm text-gray-700">{log.details ?? "—"}</span>
                    </div>
                    <div className="text-left text-xs text-gray-400 shrink-0">
                      <p>{log.userName ?? "نظام"}</p>
                      <p>{new Date(log.createdAt).toLocaleString("ar-SA")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={pages} total={total} pageSize={20} onPage={setPage} />
    </div>
  );
}
