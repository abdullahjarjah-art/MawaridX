"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { EmployeeAvatar } from "@/components/employee-avatar";

type EmpNode = {
  id: string;
  firstName: string;
  lastName: string;
  arabicName?: string;
  jobTitle?: string;
  position: string;
  department?: string;
  status: string;
  photo?: string | null;
  managerId?: string | null;
  children?: EmpNode[];
};

const positionStyle: Record<string, { card: string; badge: string; label: string }> = {
  manager:    { card: "bg-sky-50 border-sky-400",   badge: "bg-sky-600 text-white",   label: "مدير" },
  supervisor: { card: "bg-purple-50 border-purple-400", badge: "bg-purple-600 text-white", label: "مشرف" },
  employee:   { card: "bg-gray-50 border-gray-300",   badge: "bg-gray-500 text-white",   label: "موظف" },
};

function buildTree(employees: EmpNode[]): EmpNode[] {
  const map = new Map<string, EmpNode>();
  employees.forEach(e => map.set(e.id, { ...e, children: [] }));
  const roots: EmpNode[] = [];
  map.forEach(emp => {
    if (emp.managerId && map.has(emp.managerId)) {
      map.get(emp.managerId)!.children!.push(emp);
    } else {
      roots.push(emp);
    }
  });
  return roots;
}

const deptColors: Record<string, string> = {
  "IT": "bg-sky-100 border-sky-300 text-sky-800",
  "HR": "bg-purple-100 border-purple-300 text-purple-800",
  "المالية": "bg-green-100 border-green-300 text-green-800",
  "المبيعات": "bg-orange-100 border-orange-300 text-orange-800",
  "العمليات": "bg-yellow-100 border-yellow-300 text-yellow-800",
};

function getColor(dept?: string) {
  if (!dept) return "bg-gray-100 border-gray-300 text-gray-800";
  return deptColors[dept] ?? "bg-sky-100 border-sky-300 text-sky-800";
}

function OrgCard({ node }: { node: EmpNode }) {
  const style = positionStyle[node.position] ?? positionStyle.employee;
  return (
    <div className="flex flex-col items-center">
      <div className={`border-2 rounded-xl px-4 py-3 min-w-[160px] max-w-[200px] text-center shadow-sm ${style.card}`}>
        <div className="mx-auto mb-2 border-2 border-white shadow rounded-full">
          <EmployeeAvatar photo={node.photo} firstName={node.firstName} lastName={node.lastName} size="lg" />
        </div>
        <p className="font-semibold text-sm text-gray-900">{node.firstName} {node.lastName}</p>
        {node.arabicName && <p className="text-xs text-gray-500">{node.arabicName}</p>}
        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${style.badge}`}>
          {style.label}
        </span>
        {node.jobTitle && <p className="text-xs mt-1 text-gray-500">{node.jobTitle}</p>}
        {node.department && (
          <p className="text-xs text-gray-400 mt-0.5">{node.department}</p>
        )}
      </div>

      {node.children && node.children.length > 0 && (
        <>
          {/* خط عمودي للأسفل */}
          <div className="w-0.5 h-6 bg-gray-300" />
          {/* خط أفقي */}
          {node.children.length > 1 && (
            <div className="relative flex items-start">
              <div
                className="absolute top-0 h-0.5 bg-gray-300"
                style={{
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: `calc(100% - 160px)`,
                  minWidth: "160px",
                }}
              />
            </div>
          )}
          <div className="flex gap-6 items-start">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-0.5 h-6 bg-gray-300" />
                <OrgCard node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function OrgTree({ roots }: { roots: EmpNode[] }) {
  if (roots.length === 0) return (
    <div className="text-center text-gray-400 py-20">لا يوجد موظفون</div>
  );

  return (
    <div className="flex gap-10 items-start justify-center flex-wrap py-6">
      {roots.map(root => <OrgCard key={root.id} node={root} />)}
    </div>
  );
}

export default function OrgChartPage() {
  const [roots, setRoots] = useState<EmpNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/employees/org-chart")
      .then(r => r.json())
      .then((data: EmpNode[]) => {
        setRoots(buildTree(data));
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
          <Users className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">الهيكل التنظيمي</h1>
          <p className="text-sm text-gray-500">التسلسل الوظيفي للشركة</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-auto p-6 min-h-[400px]">
          <OrgTree roots={roots} />
        </div>
      )}
    </div>
  );
}
