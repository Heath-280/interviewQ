import { AlertTriangle, KeyRound } from 'lucide-react';
import { useAIStatus } from '@/hooks/useAIStatus';

export function AIConfigBanner() {
  const { status } = useAIStatus();

  if (!status || status.configured) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0">
        <p className="font-medium text-amber-700 dark:text-amber-300">
          {status.devMode ? 'Running in development template mode' : 'AI is not configured'}
        </p>
        <p className="text-amber-700/80 dark:text-amber-300/80">
          {status.message}{' '}
          <span className="inline-flex items-center gap-1 font-medium">
            <KeyRound className="h-3.5 w-3.5" />
            Set <code className="rounded bg-amber-500/20 px-1">AI_API_KEY</code> on the server to
            enable real AI.
          </span>
        </p>
      </div>
    </div>
  );
}
