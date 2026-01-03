"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  ColumnFiltersState,
  useReactTable,
} from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, FileText, Search } from "lucide-react";
import { StatusBadge, SubmissionStatus } from "@/components/status-badge";
import { Submission, Exam } from "@/types";

interface SubmissionsTableProps {
  submissions: Submission[];
  examId: string | number;
  exam?: Exam;
}

export function SubmissionsTable({ submissions, examId, exam }: SubmissionsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<Submission>[] = [
    {
      accessorKey: "student_name",
      header: "Student Name & ID",
      cell: ({ row }) => {
        const name = row.original.student_name;
        const rollNo = row.original.roll_number;
        return (
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {name}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {rollNo}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "grade_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.grade_status as SubmissionStatus;
        return <StatusBadge status={status} />;
      },
    },
    {
      accessorKey: "total_score",
      header: "Progress / Score",
      cell: ({ row }) => {
        const totalScore = row.original.total_score ?? 0;
        const maxMarks = exam?.total_marks ?? 0;
        const percentage = row.original.percentage ?? 0;
        
        return (
          <div className="flex flex-col">
            <span className="font-medium text-zinc-900 dark:text-zinc-50">
              {totalScore} / {maxMarks}
            </span>
            {percentage > 0 && (
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {percentage.toFixed(1)}%
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "graded_at",
      header: "Graded At",
      cell: ({ row }) => {
        const gradedAt = row.original.graded_at;
        if (!gradedAt) return <span className="text-zinc-400">Not graded</span>;
        
        return (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {new Date(gradedAt).toLocaleDateString()} at{" "}
            {new Date(gradedAt).toLocaleTimeString([], { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const submission = row.original;
        
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                router.push(`/dashboard/exams/${examId}/review/${submission.id}`);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Paper
            </Button>
            <Button
              size="sm"
              onClick={() => {
                router.push(`/dashboard/results/${examId}?studentId=${submission.id}`);
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Report
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: submissions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by name or roll number..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No submissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} submissions
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
