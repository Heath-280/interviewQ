import { Progress } from '@/components/ui/progress';
import type { SkillScores } from '@/types';

const LABELS: { key: keyof SkillScores; label: string }[] = [
  { key: 'technical', label: 'Technical' },
  { key: 'communication', label: 'Communication' },
  { key: 'problemSolving', label: 'Problem solving' },
  { key: 'confidence', label: 'Confidence' },
];

export function SkillBars({ scores }: { scores: SkillScores }) {
  return (
    <div className="space-y-4">
      {LABELS.map(({ key, label }) => {
        const value = scores[key] ?? 0;
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{label}</span>
              <span className="tabular-nums text-muted-foreground">{value}/100</span>
            </div>
            <Progress
              value={value}
              indicatorClassName={
                value >= 75
                  ? 'bg-success'
                  : value >= 50
                    ? 'bg-amber-500'
                    : 'bg-destructive'
              }
            />
          </div>
        );
      })}
    </div>
  );
}
