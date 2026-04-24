"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowRight, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

    if (data.resetUrl) setResetUrl(data.resetUrl);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + resetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sky-600 rounded-2xl flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">نسيت كلمة المرور؟</h1>
          <p className="text-gray-500 text-sm mt-1">أدخل بريدك لإعادة الضبط</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">إعادة ضبط كلمة المرور</CardTitle>
          </CardHeader>
          <CardContent>
            {!resetUrl ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label>البريد الإلكتروني</Label>
                  <Input
                    type="email"
                    placeholder="example@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "جارٍ المعالجة..." : "إرسال رابط الإعادة"}
                </Button>

                <Link href="/login" className="flex items-center justify-center gap-1 text-sm text-sky-600 hover:underline">
                  <ArrowRight className="h-4 w-4" />
                  العودة لتسجيل الدخول
                </Link>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-medium text-sm mb-1">تم إنشاء الرابط بنجاح</p>
                  <p className="text-green-600 text-xs">الرابط صالح لمدة ساعة واحدة</p>
                </div>

                <div className="space-y-1">
                  <Label>رابط إعادة الضبط</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={window.location.origin + resetUrl}
                      className="text-xs text-gray-500"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <Link href={resetUrl}>
                  <Button className="w-full">الذهاب لصفحة إعادة الضبط</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
