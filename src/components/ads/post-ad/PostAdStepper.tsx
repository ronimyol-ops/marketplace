import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PostAdStep {
  key: string;
  title: string;
  description?: string;
}

interface PostAdStepperProps {
  steps: PostAdStep[];
  currentIndex: number;
  className?: string;
}

export function PostAdStepper({ steps, currentIndex, className }: PostAdStepperProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {steps.map((step, idx) => {
          const isComplete = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3 min-w-[180px]">
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center border text-sm font-semibold',
                  isComplete && 'bg-primary text-primary-foreground border-primary',
                  isActive && !isComplete && 'bg-primary/10 text-primary border-primary',
                  !isActive && !isComplete && 'bg-muted text-muted-foreground border-border'
                )}
                aria-label={`Step ${idx + 1}: ${step.title}`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
              </div>

              <div className="min-w-0">
                <p className={cn('text-sm font-semibold leading-tight', isActive ? 'text-foreground' : 'text-muted-foreground')}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                )}
              </div>

              {idx !== steps.length - 1 && (
                <div className="h-px w-10 bg-border hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
