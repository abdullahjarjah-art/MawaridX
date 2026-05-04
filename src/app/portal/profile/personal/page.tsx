"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronRight, Save, Pencil, X, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Employee = {
  id: string; employeeNumber: string; firstName: string; lastName: string;
  arabicName?: string; email: string; phone?: string; nationalId?: string;
  birthDate?: string; gender?: string; maritalStatus?: string;
  address?: string; city?: string; buildingNumber?: string; streetName?: string;
  region?: string; postalCode?: string; nationality?: string; iqamaExpiry?: string;
  religion?: string; idType?: string; bankName?: string; iban?: string;
  jobTitle?: string; position: string; department?: string; photo?: string | null;
};

type Form = {
  phone: string; maritalStatus: string;
  buildingNumber: string; streetName: string; region: string; city: string; postalCode: string;
  religion: string; idType: string;
  bankName: string; iban: string;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-1 pt-2 pb-1">
      <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider">{title}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300">—</span>}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1 text-right">{label}</label>
      {children}
    </div>
  );
}

const genderMap: Record<string, string> = { male: "ذكر", female: "أنثى" };
const maritalMap: Record<string, string> = { single: "أعزب", married: "متزوج" };
const nationalityMap: Record<string, string> = { saudi: "سعودي", non_saudi: "غير سعودي" };
const idTypeMap: Record<string, string> = { national_id: "هوية وطنية", iqama: "إقامة", passport: "جواز سفر" };

export default function PersonalPage() {
  const router = useRouter();
  const [emp, setEmp] = useState<Employee | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "avatars");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        setPhotoPreview(data.url);
        // حفظ الصورة فوراً
        await fetch("/api/employees/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photo: data.url }),
        });
        setEmp(prev => prev ? { ...prev, photo: data.url } : prev);
      }
    } finally {
      setUploadingPhoto(false);
    }
  };
  const [form, setForm] = useState<Form>({
    phone: "", maritalStatus: "",
    buildingNumber: "", streetName: "", region: "", city: "", postalCode: "",
    religion: "", idType: "",
    bankName: "", iban: "",
  });

  useEffect(() => {
    fetch("/api/employees/me").then(r => r.json()).then(data => {
      if (!data.error) {
        setEmp(data);
        setForm({
          phone: data.phone ?? "",
          maritalStatus: data.maritalStatus ?? "",
          buildingNumber: data.buildingNumber ?? "",
          streetName: data.streetName ?? "",
          region: data.region ?? "",
          city: data.city ?? "",
          postalCode: data.postalCode ?? "",
          religion: data.religion ?? "",
          idType: data.idType ?? "",
          bankName: data.bankName ?? "",
          iban: data.iban ?? "",
        });
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/employees/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    if (!updated.error) {
      setEmp(updated);
      setEditing(false);
    }
    setSaving(false);
  };

  const cancelEdit = () => {
    if (!emp) return;
    setForm({
      phone: emp.phone ?? "",
      maritalStatus: emp.maritalStatus ?? "",
      buildingNumber: emp.buildingNumber ?? "",
      streetName: emp.streetName ?? "",
      region: emp.region ?? "",
      city: emp.city ?? "",
      postalCode: emp.postalCode ?? "",
      religion: emp.religion ?? "",
      idType: emp.idType ?? "",
      bankName: emp.bankName ?? "",
      iban: emp.iban ?? "",
    });
    setEditing(false);
  };

  if (!emp) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const birthFormatted = emp.birthDate ? new Date(emp.birthDate).toLocaleDateString("ar-SA") : null;
  const iqamaFormatted = emp.iqamaExpiry ? new Date(emp.iqamaExpiry).toLocaleDateString("ar-SA") : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
        <p className="text-base font-bold text-gray-900 flex-1">المعلومات الشخصية</p>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sky-600 text-sm font-medium px-3 py-1.5 bg-sky-50 rounded-lg">
            <Pencil className="h-3.5 w-3.5" /> تعديل
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-gray-100 text-gray-600">
              <X className="h-4 w-4" />
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 text-white text-sm font-medium px-3 py-1.5 bg-sky-600 rounded-lg">
              <Save className="h-3.5 w-3.5" /> {saving ? "..." : "حفظ"}
            </button>
          </div>
        )}
      </div>

      {/* الصورة الشخصية */}
      <div className="px-4 py-5 flex flex-col items-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-sky-100 border-4 border-white shadow-lg">
            {(photoPreview || emp.photo) ? (
              <img
                src={photoPreview ?? emp.photo!}
                alt={emp.firstName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-sky-600">
                {emp.firstName?.[0]}{emp.lastName?.[0]}
              </div>
            )}
          </div>
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute bottom-0 left-0 w-7 h-7 bg-sky-600 hover:bg-sky-700 rounded-full flex items-center justify-center shadow-md border-2 border-white transition-colors"
            title="تغيير الصورة"
          >
            {uploadingPhoto
              ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Camera className="w-3.5 h-3.5 text-white" />
            }
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>
        <p className="mt-3 font-bold text-gray-900 text-lg">{emp.firstName} {emp.lastName}</p>
        <p className="text-xs text-gray-400 mt-0.5">{emp.jobTitle ?? emp.department}</p>
        <p className="text-[11px] text-gray-400 mt-1">اضغط على أيقونة الكاميرا لتغيير الصورة</p>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* المعلومات العامة */}
        <div>
          <SectionHeader title="المعلومات العامة" />
          <div className="bg-white rounded-2xl px-4">
            <InfoRow label="الرقم الوظيفي" value={emp.employeeNumber} />
            <InfoRow label="الاسم الأول" value={emp.firstName} />
            <InfoRow label="الاسم الأخير" value={emp.lastName} />
            <InfoRow label="الجنس" value={genderMap[emp.gender ?? ""] || emp.gender} />
            <InfoRow label="البريد الإلكتروني" value={emp.email} />
            {!editing ? (
              <>
                <InfoRow label="الحالة الاجتماعية" value={maritalMap[emp.maritalStatus ?? ""] || emp.maritalStatus} />
                <InfoRow label="تاريخ الميلاد" value={birthFormatted} />
                <InfoRow label="رقم الهاتف" value={emp.phone} />
              </>
            ) : (
              <div className="py-3 space-y-3">
                <Field label="رقم الهاتف">
                  <Input dir="ltr" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="05XXXXXXXX" className="bg-white text-right" />
                </Field>
                <Field label="الحالة الاجتماعية">
                  <Select value={form.maritalStatus} onValueChange={v => setForm({ ...form, maritalStatus: v ?? "" })}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">أعزب</SelectItem>
                      <SelectItem value="married">متزوج</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* تفاصيل الهوية */}
        <div>
          <SectionHeader title="تفاصيل الهوية" />
          <div className="bg-white rounded-2xl px-4">
            <InfoRow label="الجنسية" value={nationalityMap[emp.nationality ?? ""] || emp.nationality} />
            {!editing ? (
              <>
                <InfoRow label="الديانة" value={emp.religion} />
                <InfoRow label="نوع الهوية" value={idTypeMap[emp.idType ?? ""] || emp.idType} />
                <InfoRow label="رقم الهوية" value={emp.nationalId} />
                <InfoRow label="تاريخ انتهاء الهوية" value={iqamaFormatted} />
              </>
            ) : (
              <div className="py-3 space-y-3">
                <Field label="الديانة">
                  <Input value={form.religion} onChange={e => setForm({ ...form, religion: e.target.value })} placeholder="الإسلام" className="bg-white" />
                </Field>
                <Field label="نوع الهوية">
                  <Select value={form.idType} onValueChange={v => setForm({ ...form, idType: v ?? "" })}>
                    <SelectTrigger className="bg-white"><SelectValue placeholder="اختر" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national_id">هوية وطنية</SelectItem>
                      <SelectItem value="iqama">إقامة</SelectItem>
                      <SelectItem value="passport">جواز سفر</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <InfoRow label="رقم الهوية" value={emp.nationalId} />
                <InfoRow label="تاريخ انتهاء الهوية" value={iqamaFormatted} />
              </div>
            )}
          </div>
        </div>

        {/* العنوان */}
        <div>
          <SectionHeader title="العنوان" />
          <div className="bg-white rounded-2xl px-4">
            {!editing ? (
              <>
                <InfoRow label="رقم المبنى" value={emp.buildingNumber} />
                <InfoRow label="اسم الشارع" value={emp.streetName} />
                <InfoRow label="المنطقة" value={emp.region} />
                <InfoRow label="المدينة" value={emp.city} />
                <InfoRow label="الرمز البريدي" value={emp.postalCode} />
              </>
            ) : (
              <div className="py-3 space-y-3">
                <Field label="رقم المبنى">
                  <Input value={form.buildingNumber} onChange={e => setForm({ ...form, buildingNumber: e.target.value })} placeholder="1234" className="bg-white" />
                </Field>
                <Field label="اسم الشارع">
                  <Input value={form.streetName} onChange={e => setForm({ ...form, streetName: e.target.value })} placeholder="شارع الملك فهد" className="bg-white" />
                </Field>
                <Field label="المنطقة">
                  <Input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="منطقة الرياض" className="bg-white" />
                </Field>
                <Field label="المدينة">
                  <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="الرياض" className="bg-white" />
                </Field>
                <Field label="الرمز البريدي">
                  <Input value={form.postalCode} onChange={e => setForm({ ...form, postalCode: e.target.value })} placeholder="12345" className="bg-white" />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* تفاصيل حساب البنك */}
        <div>
          <SectionHeader title="تفاصيل حساب البنك" />
          <div className="bg-white rounded-2xl px-4">
            {!editing ? (
              <>
                <InfoRow label="اسم البنك" value={emp.bankName} />
                <InfoRow label="IBAN" value={emp.iban} />
              </>
            ) : (
              <div className="py-3 space-y-3">
                <Field label="اسم البنك">
                  <Input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} placeholder="بنك الراجحي" className="bg-white" />
                </Field>
                <Field label="IBAN">
                  <Input dir="ltr" value={form.iban} onChange={e => setForm({ ...form, iban: e.target.value })} placeholder="SA..." className="bg-white text-left" />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
