"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Briefcase, ChevronDown, ChevronUp } from "lucide-react";

type Job = {
  id: string; jobTitle: string; department?: string; description?: string;
  requirements?: string; status: string; openDate: string; closeDate?: string;
  _count: { applications: number };
  applications?: Application[];
};
type Application = {
  id: string; applicantName: string; email: string; phone?: string;
  status: string; notes?: string; interviewDate?: string; createdAt: string;
};

const jobStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "مفتوحة", variant: "default" },
  closed: { label: "مغلقة", variant: "secondary" },
  on_hold: { label: "معلقة", variant: "outline" },
};
const appStatusMap: Record<string, string> = {
  new: "جديد", reviewed: "تمت المراجعة", interview: "مقابلة",
  offer: "عرض", hired: "تم التوظيف", rejected: "مرفوض",
};

const emptyJobForm = { jobTitle: "", department: "", description: "", requirements: "", closeDate: "" };
const emptyAppForm = { applicantName: "", email: "", phone: "", notes: "", interviewDate: "" };

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobOpen, setJobOpen] = useState(false);
  const [appOpen, setAppOpen] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [appForm, setAppForm] = useState(emptyAppForm);
  const [saving, setSaving] = useState(false);

  const fetchJobs = async () => {
    const res = await fetch("/api/recruitment");
    setJobs(await res.json());
  };

  const fetchJobDetails = async (id: string) => {
    const res = await fetch(`/api/recruitment/${id}`);
    const data = await res.json();
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, applications: data.applications } : j));
  };

  useEffect(() => { fetchJobs(); }, []);

  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const job = jobs.find(j => j.id === id);
    if (!job?.applications) await fetchJobDetails(id);
  };

  const saveJob = async () => {
    setSaving(true);
    await fetch("/api/recruitment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobForm),
    });
    setSaving(false); setJobOpen(false); fetchJobs();
  };

  const saveApp = async (jobId: string) => {
    setSaving(true);
    await fetch(`/api/recruitment/${jobId}/applications`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(appForm),
    });
    setSaving(false); setAppOpen(null);
    await fetchJobDetails(jobId); fetchJobs();
  };

  const updateJobStatus = async (id: string, status: string) => {
    const job = jobs.find(j => j.id === id)!;
    await fetch(`/api/recruitment/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...job, status }),
    });
    fetchJobs();
  };

  return (
    <div className="p-3 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">التوظيف</h1>
          <p className="text-sm text-gray-500 mt-1">{jobs.filter(j => j.status === "open").length} وظيفة مفتوحة</p>
        </div>
        <Button onClick={() => { setJobForm(emptyJobForm); setJobOpen(true); }} className="gap-2 h-8 sm:h-9 text-xs sm:text-sm">
          <Plus className="h-4 w-4" /> إضافة وظيفة
        </Button>
      </div>

      <div className="space-y-4">
        {jobs.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-gray-500">لا توجد وظائف — ابدأ بإضافة وظيفة شاغرة</CardContent></Card>
        ) : jobs.map((job) => (
          <Card key={job.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{job.jobTitle}</CardTitle>
                    <p className="text-sm text-gray-500">{job.department ?? "غير محدد"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={jobStatusMap[job.status]?.variant ?? "secondary"}>
                    {jobStatusMap[job.status]?.label ?? job.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    {job._count.applications} طلب
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {job.description && <p className="text-sm text-gray-600 mb-3">{job.description}</p>}
              <div className="flex items-center gap-2">
                {job.status === "open" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => { setAppForm(emptyAppForm); setAppOpen(job.id); }}>
                      <Plus className="h-3 w-3 ml-1" /> إضافة متقدم
                    </Button>
                    <Button size="sm" variant="outline" className="text-gray-500" onClick={() => updateJobStatus(job.id, "closed")}>
                      إغلاق الوظيفة
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => toggleExpand(job.id)} className="mr-auto gap-1">
                  {expanded === job.id ? <><ChevronUp className="h-4 w-4" /> إخفاء الطلبات</> : <><ChevronDown className="h-4 w-4" /> عرض الطلبات</>}
                </Button>
              </div>

              {expanded === job.id && job.applications && (
                <div className="mt-4 border-t pt-4">
                  {job.applications.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">لا توجد طلبات بعد</p>
                  ) : (
                    <div className="space-y-2">
                      {job.applications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                          <div>
                            <p className="font-medium text-sm">{app.applicantName}</p>
                            <p className="text-xs text-gray-500">{app.email} {app.phone && `· ${app.phone}`}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">{appStatusMap[app.status] ?? app.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Job Dialog */}
      <Dialog open={jobOpen} onOpenChange={setJobOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>إضافة وظيفة شاغرة</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>المسمى الوظيفي *</Label>
              <Input value={jobForm.jobTitle} onChange={(e) => setJobForm({ ...jobForm, jobTitle: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>القسم</Label>
              <Input value={jobForm.department} onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>المتطلبات</Label>
              <Textarea value={jobForm.requirements} onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>تاريخ الإغلاق</Label>
              <Input type="date" value={jobForm.closeDate} onChange={(e) => setJobForm({ ...jobForm, closeDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobOpen(false)}>إلغاء</Button>
            <Button onClick={saveJob} disabled={saving || !jobForm.jobTitle}>{saving ? "جارٍ الحفظ..." : "إضافة"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Application Dialog */}
      <Dialog open={!!appOpen} onOpenChange={() => setAppOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>إضافة متقدم</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>الاسم *</Label>
              <Input value={appForm.applicantName} onChange={(e) => setAppForm({ ...appForm, applicantName: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>البريد الإلكتروني *</Label>
              <Input type="email" value={appForm.email} onChange={(e) => setAppForm({ ...appForm, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>الهاتف</Label>
              <Input value={appForm.phone} onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>تاريخ المقابلة</Label>
              <Input type="datetime-local" value={appForm.interviewDate} onChange={(e) => setAppForm({ ...appForm, interviewDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>ملاحظات</Label>
              <Textarea value={appForm.notes} onChange={(e) => setAppForm({ ...appForm, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppOpen(null)}>إلغاء</Button>
            <Button onClick={() => saveApp(appOpen!)} disabled={saving || !appForm.applicantName || !appForm.email}>
              {saving ? "جارٍ الحفظ..." : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
