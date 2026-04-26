"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminModal } from "@/features/admin/components/admin-modal";
import { StatusBadge } from "@/features/admin/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import {
  createAdminVoucher,
  deleteAdminVoucher,
  getAdminVouchers,
  updateAdminVoucher,
  type AdminVoucher,
  type VoucherPayload,
} from "@/features/admin/api/master-api";

interface VoucherFormState {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_amount: string;
  min_purchase: string;
  max_discount: string;
  usage_limit: string;
  is_active: boolean;
  expired_at: string;
}

const defaultForm: VoucherFormState = {
  code: "",
  discount_type: "percentage",
  discount_amount: "",
  min_purchase: "",
  max_discount: "",
  usage_limit: "",
  is_active: true,
  expired_at: "",
};

function toNullableNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  return Number(raw);
}

function normalizeError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan tak terduga";
}

function toPayload(form: VoucherFormState): VoucherPayload {
  return {
    code: form.code.trim(),
    discount_type: form.discount_type,
    discount_amount: Number(form.discount_amount),
    min_purchase: toNullableNumber(form.min_purchase),
    max_discount: toNullableNumber(form.max_discount),
    usage_limit: toNullableNumber(form.usage_limit),
    is_active: form.is_active,
    expired_at: form.expired_at || null,
  };
}

function formatDiscount(voucher: AdminVoucher): string {
  const amount = Number(voucher.discount_amount);
  return voucher.discount_type === "percentage" ? `${amount}%` : `Rp${amount.toLocaleString("id-ID")}`;
}

export default function AdminVouchersPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [form, setForm] = useState<VoucherFormState>(defaultForm);

  const voucherQuery = useQuery({
    queryKey: ["admin", "vouchers"],
    queryFn: getAdminVouchers,
  });

  const sortedVouchers = useMemo(
    () => [...(voucherQuery.data ?? [])].sort((a, b) => b.id - a.id),
    [voucherQuery.data],
  );

  const filteredVouchers = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return sortedVouchers;
    }

    return sortedVouchers.filter((voucher) => {
      const labelParts = [
        voucher.code,
        voucher.discount_type,
        formatDiscount(voucher),
        voucher.is_active ? "aktif" : "nonaktif",
      ];

      return labelParts.some((value) => value.toLowerCase().includes(keyword));
    });
  }, [searchKeyword, sortedVouchers]);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const closeModal = () => {
    if (saveMutation.isPending) return;
    setIsModalOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.code.trim() || !form.discount_amount.trim()) {
        throw new Error("Kode voucher dan nominal diskon wajib diisi");
      }

      const payload = toPayload(form);
      if (Number.isNaN(payload.discount_amount)) {
        throw new Error("Nominal diskon harus berupa angka");
      }

      if (editingId) {
        return updateAdminVoucher(editingId, payload);
      }

      return createAdminVoucher(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vouchers"] });
      toast.success(editingId ? "Voucher berhasil diperbarui" : "Voucher berhasil ditambahkan");
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminVoucher,
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "vouchers"] });
      toast.success(message || "Voucher berhasil dihapus");
    },
    onError: (error) => {
      toast.error(normalizeError(error));
    },
  });

  const onEdit = (voucher: AdminVoucher) => {
    setEditingId(voucher.id);
    setForm({
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_amount: String(voucher.discount_amount),
      min_purchase: voucher.min_purchase ? String(voucher.min_purchase) : "",
      max_discount: voucher.max_discount ? String(voucher.max_discount) : "",
      usage_limit: voucher.usage_limit ? String(voucher.usage_limit) : "",
      is_active: voucher.is_active,
      expired_at: voucher.expired_at ? voucher.expired_at.slice(0, 10) : "",
    });
    setIsModalOpen(true);
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Kelola Vouchers"
        description="Atur voucher promo untuk skenario diskon pada proses transaksi."
      />

      <Card className="border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-sm">
        <CardHeader className="space-y-4 border-b border-[var(--admin-border)] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-[var(--admin-foreground)]">
                Daftar Vouchers
              </CardTitle>
              <p className="mt-1 text-sm text-[var(--admin-muted-foreground)]">
                Kelola voucher aktif/nonaktif beserta parameter diskon.
              </p>
              <span className="mt-2 inline-flex rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-2 py-0.5 text-xs font-medium text-[var(--admin-muted-foreground)]">
                {filteredVouchers.length} data
              </span>
            </div>

            <Button
              type="button"
              onClick={openCreateModal}
              size="lg"
              className="h-10 bg-[var(--admin-brand)] px-4 text-white hover:opacity-90"
            >
              <Plus className="size-4" />
              <span>Buat Voucher</span>
            </Button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-[var(--admin-muted-foreground)]" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Cari voucher..."
              className="h-9 border-[var(--admin-border)] bg-[var(--admin-surface-soft)] pl-9 text-[var(--admin-foreground)]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto rounded-b-2xl">
            <table className="min-w-full divide-y divide-[var(--admin-border)]">
              <thead className="bg-[var(--admin-surface-soft)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Kode
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Diskon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Batas Pakai
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold tracking-wide text-[var(--admin-muted-foreground)] uppercase">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {voucherQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--admin-muted-foreground)]">
                      Memuat vouchers...
                    </td>
                  </tr>
                ) : voucherQuery.isError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-red-600">
                      Gagal memuat vouchers. Coba refresh halaman.
                    </td>
                  </tr>
                ) : filteredVouchers.length > 0 ? (
                  filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-[var(--admin-surface-soft)]">
                      <td className="px-4 py-3 text-sm font-medium text-[var(--admin-foreground)]">{voucher.code}</td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">
                        {formatDiscount(voucher)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--admin-muted-foreground)]">
                        {voucher.usage_limit ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <StatusBadge value={voucher.is_active ? "Aktif" : "Nonaktif"} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => onEdit(voucher)}
                            className="border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-foreground)]"
                            aria-label={`Edit ${voucher.code}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-sm"
                            onClick={() => {
                              if (window.confirm(`Hapus voucher "${voucher.code}"?`)) {
                                deleteMutation.mutate(voucher.id);
                              }
                            }}
                            className="border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                            aria-label={`Hapus ${voucher.code}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-[var(--admin-muted-foreground)]">
                      Belum ada data vouchers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AdminModal
        open={isModalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Voucher" : "Buat Voucher"}
        description="Atur parameter diskon dan status voucher."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] p-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="voucher-code">Kode</Label>
              <Input
                id="voucher-code"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Tipe Diskon</Label>
              <Select
                value={form.discount_type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    discount_type: (value as VoucherFormState["discount_type"]) ?? "percentage",
                  }))
                }
              >
                <SelectTrigger className="h-9 w-full border-[var(--admin-border)] bg-[var(--admin-surface)]">
                  <SelectValue placeholder="Pilih tipe diskon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="voucher-discount-amount">Nominal Diskon</Label>
              <Input
                id="voucher-discount-amount"
                type="number"
                min={0}
                value={form.discount_amount}
                onChange={(event) => setForm((prev) => ({ ...prev, discount_amount: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="voucher-min-purchase">Minimal Purchase</Label>
              <Input
                id="voucher-min-purchase"
                type="number"
                min={0}
                value={form.min_purchase}
                onChange={(event) => setForm((prev) => ({ ...prev, min_purchase: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="voucher-max-discount">Maksimal Diskon</Label>
              <Input
                id="voucher-max-discount"
                type="number"
                min={0}
                value={form.max_discount}
                onChange={(event) => setForm((prev) => ({ ...prev, max_discount: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="voucher-usage-limit">Batas Pemakaian</Label>
              <Input
                id="voucher-usage-limit"
                type="number"
                min={1}
                value={form.usage_limit}
                onChange={(event) => setForm((prev) => ({ ...prev, usage_limit: event.target.value }))}
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="voucher-expired-at">Tanggal Expired</Label>
              <DatePicker
                value={form.expired_at}
                onChange={(value) => setForm((prev) => ({ ...prev, expired_at: value }))}
                placeholder="Pilih tanggal expired"
                className="border-[var(--admin-border)] bg-[var(--admin-surface)]"
              />
            </div>
          </div>

          <label
            htmlFor="voucher-is-active"
            className="inline-flex items-center gap-2 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-soft)] px-3 py-2 text-sm text-[var(--admin-foreground)]"
          >
            <Checkbox
              id="voucher-is-active"
              checked={form.is_active}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, is_active: checked }))}
            />
            Voucher aktif
          </label>

          <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--admin-border)] pt-3">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saveMutation.isPending}>
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-[var(--admin-brand)] text-white hover:opacity-90"
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              <span>{editingId ? "Simpan Perubahan" : "Simpan Voucher"}</span>
            </Button>
          </div>
        </div>
      </AdminModal>
    </section>
  );
}

