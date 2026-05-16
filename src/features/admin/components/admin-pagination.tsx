"use client";

import type { ApiPaginationMeta } from "@/types/auth";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface AdminPaginationProps {
  meta: ApiPaginationMeta;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
}

function buildVisiblePages(currentPage: number, lastPage: number): Array<number | "ellipsis"> {
  if (lastPage <= 5) {
    return Array.from({ length: lastPage }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", lastPage];
  }

  if (currentPage >= lastPage - 2) {
    return [1, "ellipsis", lastPage - 3, lastPage - 2, lastPage - 1, lastPage];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", lastPage];
}

export function AdminPagination({ meta, isLoading = false, onPageChange }: AdminPaginationProps) {
  const lastPage = Math.max(meta.last_page, 1);
  const currentPage = Math.min(Math.max(meta.current_page, 1), lastPage);
  const startItem = meta.total === 0 ? 0 : (currentPage - 1) * meta.per_page + 1;
  const endItem = meta.total === 0 ? 0 : Math.min(currentPage * meta.per_page, meta.total);
  const visiblePages = buildVisiblePages(currentPage, lastPage);

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[var(--muted-foreground)]">
        Showing {startItem}-{endItem} of {meta.total} items
      </p>

      <Pagination className="mx-0 w-auto self-end sm:self-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={isLoading || currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            />
          </PaginationItem>
          {visiblePages.map((item, index) => (
            <PaginationItem key={`${item}-${index}`}>
              {item === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  isActive={item === currentPage}
                  disabled={isLoading || item === currentPage}
                  onClick={() => onPageChange(item)}
                >
                  {item}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              disabled={isLoading || currentPage >= lastPage}
              onClick={() => onPageChange(currentPage + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
