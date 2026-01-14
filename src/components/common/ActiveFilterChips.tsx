import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface ActiveFilterChip {
  /** Unique key for React rendering */
  key: string;
  /** Human-friendly label shown to the user */
  label: string;
  /** Called when the chip is clicked (removes that filter) */
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll?: () => void;
  clearLabel?: string;
  className?: string;
}

/**
 * Small pill-style chips that show currently-applied filters.
 * Clicking a chip removes that specific filter.
 */
export function ActiveFilterChips({
  chips,
  onClearAll,
  clearLabel = 'Clear all',
  className,
}: ActiveFilterChipsProps) {
  if (!chips.length) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {chips.map((chip) => (
        <Button
          key={chip.key}
          type="button"
          variant="secondary"
          size="sm"
          className="h-7 rounded-full px-3 gap-1"
          onClick={chip.onRemove}
          title={`Remove ${chip.label}`}
        >
          <span className="max-w-[200px] truncate">{chip.label}</span>
          <X className="h-3 w-3" />
        </Button>
      ))}

      {onClearAll && (
        <Button type="button" variant="ghost" size="sm" className="h-7" onClick={onClearAll}>
          {clearLabel}
        </Button>
      )}
    </div>
  );
}
