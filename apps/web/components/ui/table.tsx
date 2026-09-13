import * as React from "react";
import { cn } from "../../lib/utils";

export function Table({ className, children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("bg-slate-50 text-xs uppercase tracking-wider text-slate-500", className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-slate-100 [&_tr:last-child]:border-0", className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableFooter({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot className={cn("border-t bg-slate-50/50 font-medium [&>tr]:last:border-b-0", className)} {...props}>
      {children}
    </tfoot>
  );
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-slate-50/60 data-[state=selected]:bg-slate-100", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn("px-5 py-3 text-left align-middle font-medium text-slate-500 [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-5 py-3.5 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props}>
      {children}
    </td>
  );
}

export function TableCaption({ className, children, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption className={cn("mt-4 text-sm text-slate-500", className)} {...props}>
      {children}
    </caption>
  );
}
