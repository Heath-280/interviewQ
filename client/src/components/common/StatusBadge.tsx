import { Badge } from '@/components/ui/badge';
import type { InterviewStatus } from '@/types';

const map: Record<InterviewStatus, { label: string; className: string }> = {
  created: { label: 'Not started', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In progress', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success' },
  abandoned: { label: 'Abandoned', className: 'bg-destructive/10 text-destructive' },
};

export function StatusBadge({ status }: { status: InterviewStatus }) {
  const config = map[status];
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
}
