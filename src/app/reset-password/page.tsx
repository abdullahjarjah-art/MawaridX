"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, CheckCircle } from "lucide-react";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) setError("رابط غير صالح");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (form.password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">تعيين كلمة مرور جديدة</CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-gray-900">تم تغيير كلمة المرور بنجاح!</p>
            <p className="text-sm text-gray-500">سيتم توجيهك لتسجيل الدخول...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>كلمة المرور الجديدة</Label>
              <Input
                type="password"
                placeholder="6 أحرف على الأقل"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>تأكيد كلمة المرور</Label>
              <Input
                type="password"
                placeholder="أعد كتابة كلمة المرور"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور الجديدة"}
            </Button>

            <Link href="/login" className="block text-center text-sm text-sky-600 hover:underline">
              العودة لتسجيل الدخول
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">إعادة ضبط كلمة المرور</h1>
        </div>
        <Suspense fallback={<div className="text-center text-gray-500">جارٍ التحميل...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
