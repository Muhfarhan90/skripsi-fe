"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Loader2, RefreshCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createEmptyAdminPaginationMeta,
  getAdminAcademicPeriods,
  getAdminCourseOfferingById,
  getAdminCourseOfferings,
  listAdminCourseOfferingEnrollments,
} from "@/features/admin/api/master-api";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { StatusBadge } from "@/features/admin/components/status-badge";
import {
  buildOfferingOptionLabel,
  formatAssignmentRequirementSummary,
  formatProgress,
  formatRequirementStatus,
  parsePositiveIntegerParam,
} from "@/features/admin/lib/course-activity";
import { formatDateTime, toStatusLabel } from "@/features/admin/lib/offering-utils";

export function AdminCourseActivityStudentProgressPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const selectedOfferingId = parsePositiveIntegerParam(searchParams.get("offeringId"));
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);

  const activePeriodsQuery = useQuery({
    queryKey: ["admin", "course-activity", "student-progress", "active-period"],
    queryFn: () => getAdminAcademicPeriods({ is_active: true }),
    staleTime: 60_000,
  });

  const activePeriod = activePeriodsQuery.data?.[0] ?? null;
  const activePeriodId = activePeriod?.id ?? null;
  const activePeriodLabel = activePeriod?.name ?? activePeriod?.code ?? null;

  const offeringsQuery = useQuery({
    queryKey: ["admin", "course-activity", "student-progress", "offering-options", activePeriodId],
    queryFn: () => getAdminCourseOfferings({ academic_period_id: activePeriodId as number }),
    enabled: activePeriodId !== null,
  });

  const selectedOfferingQuery = useQuery({
    queryKey: ["admin", "course-activity", "student-progress", "offering", selectedOfferingId],
    queryFn: () => getAdminCourseOfferingById(selectedOfferingId as number),
    enabled: selectedOfferingId !== null,
  });

  const studentsQuery = useQuery({
    queryKey: ["admin", "course-activity", "student-progress", selectedOfferingId, searchKeyword, page],
    queryFn: () =>
      listAdminCourseOfferingEnrollments(selectedOfferingId as number, {
        search: searchKeyword,
        page,
      }),
    enabled: selectedOfferingId !== null,
  });

  const selectedOffering = useMemo(
    () =>
      offeringsQuery.data?.find((offering) => offering.id === selectedOfferingId) ??
      selectedOfferingQuery.data ??
      null,
    [offeringsQuery.data, selectedOfferingId, selectedOfferingQuery.data],
  );
  const studentRows = studentsQuery.data?.items ?? [];
  const studentMeta = studentsQuery.data?.meta ?? createEmptyAdminPaginationMeta(page);
  const selectedOfferingLabel = selectedOffering
    ? buildOfferingOptionLabel(selectedOffering)
    : "Pilih offering untuk melihat progres siswa";
  const hasOfferingOptions = (offeringsQuery.data?.length ?? 0) > 0;
  const hasActivePeriod = activePeriodId !== null;

  useEffect(() => {
    if (selectedOfferingId !== null) {
      return;
    }

    if (!hasActivePeriod) {
      return;
    }

    const defaultOfferingId = offeringsQuery.data?.[0]?.id;
    if (!defaultOfferingId) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set("offeringId", String(defaultOfferingId));
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }, [hasActivePeriod, offeringsQuery.data, pathname, router, searchParamsString, selectedOfferingId]);

  const handleOfferingChange = (value: string | null) => {
    setSearchKeyword("");
    setPage(1);

    const nextParams = new URLSearchParams(searchParams.toString());

    if (!value) {
      nextParams.delete("offeringId");
    } else {
      nextParams.set("offeringId", value);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  return (
    <section className="space-y-5">
      <AdminPageHeader
        title="Student Progress"
        description="Pantau progres belajar, status enrollment, dan syarat assignment siswa per offering tanpa harus masuk ke detail academic period."
      />

      <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <GraduationCap className="size-5" />
            <span>Pilih Offering</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedOfferingId ? String(selectedOfferingId) : undefined} onValueChange={handleOfferingChange}>
            <SelectTrigger className="w-full border-[var(--border)] bg-[var(--card)]">
              <SelectValue>{selectedOfferingLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {offeringsQuery.data?.map((offering) => (
                <SelectItem key={offering.id} value={String(offering.id)}>
                  {buildOfferingOptionLabel(offering)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activePeriodLabel ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Menampilkan offering dari period aktif <span className="font-medium text-[var(--foreground)]">{activePeriodLabel}</span>.
            </p>
          ) : null}

          {selectedOffering ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
              <p>
                Course: <span className="font-medium text-[var(--foreground)]">{selectedOffering.course?.title ?? "-"}</span>
              </p>
              <p>
                Academic Period: <span className="font-medium text-[var(--foreground)]">{selectedOffering.academic_period?.name ?? selectedOffering.academic_period?.code ?? "-"}</span>
              </p>
            </div>
          ) : null}

          {activePeriodsQuery.isLoading || offeringsQuery.isLoading || selectedOfferingQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="size-4 animate-spin" />
              Memuat daftar offering...
            </div>
          ) : null}

          {activePeriodsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">Academic period aktif belum bisa dimuat.</p>
          ) : null}

          {offeringsQuery.isError ? (
            <p className="text-sm text-[var(--danger-soft-foreground)]">Daftar offering belum bisa dimuat.</p>
          ) : null}

          {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada academic period yang aktif.
            </p>
          ) : null}

          {!activePeriodsQuery.isLoading && !offeringsQuery.isLoading && !offeringsQuery.isError && hasActivePeriod && !hasOfferingOptions ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Belum ada offering yang tersedia untuk melihat progress siswa.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {selectedOfferingId ? (
        <Card className="border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardHeader className="gap-3 pb-2">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-[var(--foreground)]">Progress Siswa</CardTitle>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  Daftar siswa yang sudah terdaftar pada offering ini.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-[18rem]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <Input
                    value={searchKeyword}
                    onChange={(event) => {
                      setSearchKeyword(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Cari nama atau email siswa"
                    className="pl-9"
                  />
                </div>
                <Button type="button" variant="outline" onClick={() => studentsQuery.refetch()}>
                  <RefreshCcw className="size-4" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-0 p-0">
            {studentsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-[var(--muted-foreground)]">
                <Loader2 className="size-4 animate-spin" />
                Memuat daftar siswa...
              </div>
            ) : studentsQuery.isError ? (
              <div className="p-5 text-sm text-[var(--danger-soft-foreground)]">
                Gagal memuat daftar siswa untuk offering ini.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status Enrollment</TableHead>
                      <TableHead>Requirement Assignment</TableHead>
                      <TableHead>Sertifikat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                          Belum ada siswa yang terdaftar pada offering ini.
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentRows.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-[var(--foreground)]">{enrollment.user?.fullname ?? "-"}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{enrollment.user?.email ?? "-"}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium text-[var(--foreground)]">{formatProgress(enrollment.progress)}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">
                                Mulai: {formatDateTime(enrollment.started_at)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge value={enrollment.status ? toStatusLabel(enrollment.status) : "-"} />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <StatusBadge value={formatRequirementStatus(enrollment.assignment_requirement)} />
                              <p className="text-xs text-[var(--muted-foreground)]">
                                {formatAssignmentRequirementSummary(enrollment.assignment_requirement)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge value={enrollment.has_certificate ? "Sudah Ada" : "Belum Ada"} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {studentRows.length > 0 ? (
                  <AdminPagination meta={studentMeta} isLoading={studentsQuery.isFetching} onPageChange={setPage} />
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-[var(--border)] bg-[var(--card)] shadow-sm">
          <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
            {!activePeriodsQuery.isLoading && !activePeriodsQuery.isError && !hasActivePeriod
              ? "Belum ada academic period aktif untuk membuka progress siswa."
              : hasOfferingOptions || offeringsQuery.isLoading
                ? "Menyiapkan data progress siswa..."
                : "Belum ada offering yang bisa dibuka untuk progress siswa."}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
