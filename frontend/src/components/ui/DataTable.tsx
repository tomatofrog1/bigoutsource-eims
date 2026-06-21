import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      className="px-6 py-4 text-[0.625rem] font-black text-[#9CA3AF] uppercase tracking-widest"
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          {...{
                            className: header.column.getCanSort()
                              ? 'cursor-pointer select-none flex items-center gap-1.5 hover:text-[#111827] transition-colors'
                              : 'flex items-center gap-1.5',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: <ArrowUp className="w-3.5 h-3.5" />,
                            desc: <ArrowDown className="w-3.5 h-3.5" />,
                          }[header.column.getIsSorted() as string] ?? (header.column.getCanSort() ? <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /> : null)}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-[#F9FAFB] transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 text-sm text-[#111827]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center text-[#9CA3AF]">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB] rounded-b-2xl gap-2">
        <button
          className="px-3 py-1.5 border border-[#E5E7EB] bg-white text-xs font-bold text-[#4B5563] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </button>
        <button
          className="px-3 py-1.5 border border-[#E5E7EB] bg-white text-xs font-bold text-[#4B5563] rounded-lg hover:bg-[#F3F4F6] disabled:opacity-50"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </button>
      </div>
    </div>
  );
}
