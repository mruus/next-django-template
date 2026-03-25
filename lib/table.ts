// lib/table.ts
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export interface TablePaginationState {
  page: number;
  pageSize: number;
}

const DEFAULT_PAGINATION: TablePaginationState = {
  page: 1,
  pageSize: 10,
};

// Atom factory function for creating table-specific pagination atoms
const createTablePaginationAtom = (tableKey: string) => {
  return atomWithStorage<TablePaginationState>(
    `table-pagination-${tableKey}`,
    DEFAULT_PAGINATION,
  );
};

// Cache for created atoms
const tablePaginationAtomsCache = new Map<
  string,
  ReturnType<typeof createTablePaginationAtom>
>();

/**
 * Get or create a pagination atom for a specific table
 */
export function getTablePaginationAtom(tableKey: string) {
  if (!tablePaginationAtomsCache.has(tableKey)) {
    tablePaginationAtomsCache.set(
      tableKey,
      createTablePaginationAtom(tableKey),
    );
  }
  return tablePaginationAtomsCache.get(tableKey)!;
}

/**
 * Hook for managing table pagination state
 */
export function useTablePagination(tableKey: string) {
  const paginationAtom = getTablePaginationAtom(tableKey);
  const [pagination, setPagination] = useAtom(paginationAtom);

  const setPage = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const setPageSize = (pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPageSize(pageSize);
  };

  const resetPagination = () => {
    setPagination(DEFAULT_PAGINATION);
  };

  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    pagination,
    setPage,
    setPageSize,
    setPagination,
    handlePageChange,
    handlePageSizeChange,
    resetPagination,
  };
}
