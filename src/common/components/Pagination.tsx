import { cn } from '@/src/lib/utils';

type PaginationItem = number | 'ellipsis-start' | 'ellipsis-end';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function range(start: number, end: number) {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 10) return range(1, totalPages);

  const pages = new Set<number>([1, totalPages]);

  if (currentPage <= 3) {
    range(2, 5).forEach((page) => pages.add(page));
  } else if (currentPage >= totalPages - 2) {
    range(totalPages - 4, totalPages - 1).forEach((page) => pages.add(page));
  } else {
    range(currentPage - 2, currentPage + 2).forEach((page) => pages.add(page));
  }

  const orderedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return orderedPages.flatMap((page, index) => {
    const previousPage = orderedPages[index - 1];
    if (!previousPage || page - previousPage === 1) return [page];
    if (page - previousPage === 2) return [previousPage + 1, page];
    return [index === 1 ? 'ellipsis-start' : 'ellipsis-end', page];
  });
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const normalizedTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), normalizedTotalPages);
  const hasPreviousPage = safeCurrentPage > 1;
  const hasNextPage = safeCurrentPage < normalizedTotalPages;
  const items = getPaginationItems(safeCurrentPage, normalizedTotalPages);

  const buttonClass =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-[#E5E7EB] px-2.5 text-xs font-bold transition-all';

  return (
    <nav className="flex flex-wrap items-center justify-end gap-1.5" aria-label="Pagination">
      <button
        type="button"
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
        className={cn(
          buttonClass,
          'min-w-[4.75rem]',
          hasPreviousPage ? 'bg-white text-[#111827] hover:bg-[#F3F4F6]' : 'cursor-not-allowed text-[#9CA3AF]'
        )}
      >
        Previous
      </button>

      {items.map((item) =>
        typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            aria-current={item === safeCurrentPage ? 'page' : undefined}
            onClick={() => onPageChange(item)}
            className={cn(
              buttonClass,
              item === safeCurrentPage
                ? 'border-[#111827] bg-[#111827] text-white shadow-sm'
                : 'bg-white text-[#111827] hover:bg-[#F3F4F6]'
            )}
          >
            {item}
          </button>
        ) : (
          <span
            key={item}
            className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-xs font-black text-[#9CA3AF]"
            aria-hidden="true"
          >
            ...
          </span>
        )
      )}

      <button
        type="button"
        disabled={!hasNextPage}
        onClick={() => onPageChange(Math.min(normalizedTotalPages, safeCurrentPage + 1))}
        className={cn(
          buttonClass,
          'min-w-[3.75rem]',
          hasNextPage ? 'bg-white text-[#111827] hover:bg-[#F3F4F6]' : 'cursor-not-allowed text-[#9CA3AF]'
        )}
      >
        Next
      </button>
    </nav>
  );
}
