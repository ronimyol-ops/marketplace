import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  className?: string;
}

type PageItem = number | 'ellipsis';

function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PageItem[] = [];
  const clamped = Math.min(Math.max(current, 1), total);

  // Always show first page
  items.push(1);

  // Window around current page
  let start = Math.max(2, clamped - 1);
  let end = Math.min(total - 1, clamped + 1);

  // Expand window when near edges
  if (clamped <= 3) {
    start = 2;
    end = 4;
  }
  if (clamped >= total - 2) {
    start = total - 3;
    end = total - 1;
  }

  if (start > 2) items.push('ellipsis');
  for (let p = start; p <= end; p++) items.push(p);
  if (end < total - 1) items.push('ellipsis');

  // Always show last page
  items.push(total);

  return items;
}

export function PaginationControls({ page, totalPages, onPageChange, className }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const items = getPageItems(page, totalPages);

  return (
    <div className={cn('flex items-center justify-center gap-1', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </Button>

      {items.map((item, idx) => {
        if (item === 'ellipsis') {
          return (
            <div key={`e-${idx}`} className="h-9 w-9 flex items-center justify-center text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </div>
          );
        }

        const isActive = item === page;
        return (
          <Button
            key={item}
            variant={isActive ? 'outline' : 'ghost'}
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        );
      })}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="gap-1"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
