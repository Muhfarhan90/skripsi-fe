"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Image as ImageIcon, Loader2, RefreshCcw, Save, Signature } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminCertificateSettings,
  updateAdminCertificateSettings,
  uploadAdminCertificateAsset,
  type AdminCertificateSetting,
  type CertificateSettingPayload,
} from "@/features/admin/api/master-api";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { ApiError } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/env";

interface CertificateSettingFormState {
  organization_name: string;
  certificate_title: string;
  certificate_prefix: string;
  signatory_name: string;
  signatory_title: string;
  signature_image: string;
  background_image: string;
  footer_note: string;
  expires_after_months: string;
}

const defaultForm: CertificateSettingFormState = {
  organization_name: "OpenLearning LMS",
  certificate_title: "Certificate of Completion",
  certificate_prefix: "CERT",
  signatory_name: "",
  signatory_title: "",
  signature_image: "",
  background_image: "",
  footer_note: "This certificate is generated automatically by the system.",
  expires_after_months: "",
};

function mapSettingToForm(setting: AdminCertificateSetting): CertificateSettingFormState {
  return {
    organization_name: setting.organization_name ?? "",
    certificate_title: setting.certificate_title ?? "",
    certificate_prefix: setting.certificate_prefix ?? "",
    signatory_name: setting.signatory_name ?? "",
    signatory_title: setting.signatory_title ?? "",
    signature_image: setting.signature_image ?? "",
    background_image: setting.background_image ?? "",
    footer_note: setting.footer_note ?? "",
    expires_after_months:
      setting.expires_after_months !== null && setting.expires_after_months !== undefined
        ? String(setting.expires_after_months)
        : "",
  };
}

function toPositiveInteger(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 1) return null;

  return parsed;
}

function buildPayload(form: CertificateSettingFormState): CertificateSettingPayload {
  const expiresAfterMonths = form.expires_after_months.trim()
    ? toPositiveInteger(form.expires_after_months)
    : null;

  if (form.expires_after_months.trim() && expiresAfterMonths === null) {
    throw new Error("Masa berlaku sertifikat harus berupa angka minimal 1 bulan");
  }

  if (!form.organization_name.trim()) {
    throw new Error("Nama organisasi wajib diisi");
  }

  if (!form.certificate_title.trim()) {
    throw new Error("Judul sertifikat wajib diisi");
  }

  if (!form.certificate_prefix.trim()) {
    throw new Error("Prefix nomor sertifikat wajib diisi");
  }

  return {
    organization_name: form.organization_name.trim(),
    certificate_title: form.certificate_title.trim(),
    certificate_prefix: form.certificate_prefix.trim(),
    signatory_name: form.signatory_name.trim() || null,
    signatory_title: form.signatory_title.trim() || null,
    signature_image: form.signature_image.trim() || null,
    background_image: form.background_image.trim() || null,
    footer_note: form.footer_note.trim() || null,
    expires_after_months: expiresAfterMonths,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const firstError = error.errors ? Object.values(error.errors)[0]?.[0] : null;
    return firstError ? String(firstError) : error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

function resolveAssetPreviewUrl(path: string): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }

  const appBaseUrl = getApiBaseUrl().replace(/\/api\/?$/, "");
  return `${appBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function CertificateSettingsPage() {
  const queryClient = useQueryClient();
  const [draftForm, setDraftForm] = useState<CertificateSettingFormState | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["admin", "certificate-settings"],
    queryFn: getAdminCertificateSettings,
  });

  const form = useMemo(
    () => draftForm ?? (settingsQuery.data ? mapSettingToForm(settingsQuery.data) : defaultForm),
    [draftForm, settingsQuery.data],
  );

  const updateForm = (field: keyof CertificateSettingFormState, value: string) => {
    setDraftForm((prev) => ({
      ...(prev ?? form),
      [field]: value,
    }));
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CertificateSettingPayload) => updateAdminCertificateSettings(payload),
    onSuccess: (setting) => {
      queryClient.setQueryData(["admin", "certificate-settings"], setting);
      setDraftForm(null);
      toast.success("Pengaturan sertifikat berhasil disimpan");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Gagal menyimpan pengaturan sertifikat"));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ type, file }: { type: "background_image" | "signature_image"; file: File }) =>
      uploadAdminCertificateAsset(type, file),
    onSuccess: (asset, variables) => {
      updateForm(variables.type, asset.path);
      toast.success("Asset sertifikat berhasil diupload");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Gagal upload asset sertifikat"));
    },
  });

  const handleSave = () => {
    try {
      saveMutation.mutate(buildPayload(form));
    } catch (error) {
      toast.error(getErrorMessage(error, "Pengaturan sertifikat tidak valid"));
    }
  };

  const handleUploadAsset = (type: "background_image" | "signature_image", file: File | null) => {
    if (!file) return;
    uploadMutation.mutate({ type, file });
  };

  const backgroundPreviewUrl = resolveAssetPreviewUrl(form.background_image);
  const signaturePreviewUrl = resolveAssetPreviewUrl(form.signature_image);
  const isUploadingBackground = uploadMutation.isPending && uploadMutation.variables?.type === "background_image";
  const isUploadingSignature = uploadMutation.isPending && uploadMutation.variables?.type === "signature_image";
  const previewCertificateNumber = `${form.certificate_prefix.trim() || "CERT"}-20260517-PREVIEW`;

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Certificate Settings"
        description="Atur data global yang dipakai saat sertifikat diterbitkan dan diunduh."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                <Award className="size-5" />
                <span>Template Metadata</span>
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Perubahan ini dipakai untuk sertifikat baru dan saat admin melakukan regenerate.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDraftForm(null);
                  settingsQuery.refetch();
                }}
                disabled={settingsQuery.isFetching || saveMutation.isPending}
              >
                <RefreshCcw className={settingsQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
                <span>Refresh</span>
              </Button>
              <Button type="button" onClick={handleSave} disabled={settingsQuery.isLoading || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                <span>Simpan Setting</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-5">
          {settingsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />
              Memuat pengaturan sertifikat...
            </div>
          ) : null}

          {settingsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">Gagal memuat pengaturan sertifikat.</p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="certificate-organization">Nama Organisasi</Label>
              <Input
                id="certificate-organization"
                value={form.organization_name}
                onChange={(event) => updateForm("organization_name", event.target.value)}
                placeholder="OpenLearning LMS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-title">Judul Sertifikat</Label>
              <Input
                id="certificate-title"
                value={form.certificate_title}
                onChange={(event) => updateForm("certificate_title", event.target.value)}
                placeholder="Certificate of Completion"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-prefix">Prefix Nomor</Label>
              <Input
                id="certificate-prefix"
                value={form.certificate_prefix}
                onChange={(event) => updateForm("certificate_prefix", event.target.value)}
                placeholder="CERT"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-expiry">Masa Berlaku (bulan)</Label>
              <Input
                id="certificate-expiry"
                value={form.expires_after_months}
                onChange={(event) => updateForm("expires_after_months", event.target.value)}
                placeholder="Kosongkan jika tidak expired"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-signatory-name">Nama Penandatangan</Label>
              <Input
                id="certificate-signatory-name"
                value={form.signatory_name}
                onChange={(event) => updateForm("signatory_name", event.target.value)}
                placeholder="Nama pemberi sertifikat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate-signatory-title">Jabatan Penandatangan</Label>
              <Input
                id="certificate-signatory-title"
                value={form.signatory_title}
                onChange={(event) => updateForm("signatory_title", event.target.value)}
                placeholder="Program Director"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <ImageIcon className="size-4" />
                <span>Visual Assets</span>
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certificate-background">Upload Background</Label>
                  <Input
                    id="certificate-background"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleUploadAsset("background_image", event.target.files?.[0] ?? null)}
                    disabled={isUploadingBackground}
                  />
                  {isUploadingBackground ? (
                    <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <Loader2 className="size-3 animate-spin" />
                      Mengupload background...
                    </p>
                  ) : null}
                  {form.background_image ? (
                    <p className="break-all text-xs text-[var(--muted-foreground)]">{form.background_image}</p>
                  ) : null}
                  {backgroundPreviewUrl ? (
                    <div
                      className="aspect-[297/210] w-full rounded-md border border-[var(--border)] bg-cover bg-center"
                      style={{ backgroundImage: `url(${backgroundPreviewUrl})` }}
                    />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificate-signature">Upload Tanda Tangan</Label>
                  <Input
                    id="certificate-signature"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => handleUploadAsset("signature_image", event.target.files?.[0] ?? null)}
                    disabled={isUploadingSignature}
                  />
                  {isUploadingSignature ? (
                    <p className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <Loader2 className="size-3 animate-spin" />
                      Mengupload tanda tangan...
                    </p>
                  ) : null}
                  {form.signature_image ? (
                    <p className="break-all text-xs text-[var(--muted-foreground)]">{form.signature_image}</p>
                  ) : null}
                  {signaturePreviewUrl ? (
                    <div
                      className="h-24 rounded-md border border-[var(--border)] bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${signaturePreviewUrl})` }}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <Signature className="size-4" />
                <span>Footer Note</span>
              </h3>
              <div>
                <Textarea
                  value={form.footer_note}
                  onChange={(event) => updateForm("footer_note", event.target.value)}
                  placeholder="Catatan footer sertifikat"
                  className="min-h-36"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Preview Sertifikat</h3>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Preview ini mengikuti rasio A4 landscape untuk mengecek posisi background dan teks.
                </p>
              </div>
            </div>

            <div
              className="relative aspect-[297/210] w-full overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-sm"
              style={
                backgroundPreviewUrl
                  ? {
                      backgroundImage: `url(${backgroundPreviewUrl})`,
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "cover",
                    }
                  : undefined
              }
            >
              <div className="absolute inset-6 flex flex-col items-center justify-center border-2 border-emerald-800/90 bg-white/70 px-8 text-center">
                <p className="text-[10px] font-medium tracking-[0.28em] text-slate-500 uppercase">
                  {form.organization_name || "OpenLearning LMS"}
                </p>
                <p className="mt-4 text-2xl font-bold text-emerald-900">
                  {form.certificate_title || "Certificate of Completion"}
                </p>
                <p className="mt-3 text-xs text-slate-700">This certificate is presented to</p>
                <p className="mt-4 border-b border-slate-300 px-10 pb-2 text-3xl font-bold text-slate-950">
                  Student Preview
                </p>
                <p className="mt-5 text-xs text-slate-700">for successfully completing the class</p>
                <p className="mt-3 text-xl font-bold text-emerald-900">Course Preview</p>

                <div className="mt-8 space-y-1 text-xs text-slate-700">
                  <p>
                    <span className="font-bold text-slate-950">Certificate Number:</span> {previewCertificateNumber}
                  </p>
                  <p>
                    <span className="font-bold text-slate-950">Issue Date:</span> 17 Mei 2026
                  </p>
                </div>

                {(signaturePreviewUrl || form.signatory_name || form.signatory_title) ? (
                  <div className="absolute right-8 bottom-7 min-w-36 text-center">
                    {signaturePreviewUrl ? (
                      <div
                        className="mx-auto h-12 w-32 bg-contain bg-center bg-no-repeat"
                        style={{ backgroundImage: `url(${signaturePreviewUrl})` }}
                      />
                    ) : null}
                    {form.signatory_name ? (
                      <p className="mt-1 text-xs font-bold text-slate-950">{form.signatory_name}</p>
                    ) : null}
                    {form.signatory_title ? (
                      <p className="text-[10px] text-slate-500">{form.signatory_title}</p>
                    ) : null}
                  </div>
                ) : null}

                {form.footer_note ? (
                  <p className="absolute bottom-4 left-8 right-8 text-[10px] text-slate-400">{form.footer_note}</p>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
