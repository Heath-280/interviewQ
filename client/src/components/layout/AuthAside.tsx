import { BarChart3, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';

const features = [
  {
    icon: MessageSquareText,
    title: 'Personalized questions',
    description: 'Technical, HR and behavioral questions tailored to your resume and target role.',
  },
  {
    icon: Sparkles,
    title: 'Instant AI feedback',
    description: 'Scores, strengths, weaknesses, model answers and improvement tips per question.',
  },
  {
    icon: BarChart3,
    title: 'Track your progress',
    description: 'Skill-wise analytics and trends across every practice session.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by design',
    description: 'Your data and resume stay in your account. Keys never reach the browser.',
  },
];

export function AuthAside() {
  return (
    <div className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="gradient-hero absolute inset-0 opacity-40" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">InterviewIQ</span>
        </div>
        <h2 className="mt-10 max-w-md text-3xl font-bold leading-tight">
          Practise smarter. Interview with confidence.
        </h2>
        <p className="mt-3 max-w-md text-primary-foreground/80">
          AI-powered mock interviews built around your resume and the job you want.
        </p>
      </div>

      <div className="relative grid gap-5">
        {features.map((feature) => (
          <div key={feature.title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
              <feature.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">{feature.title}</p>
              <p className="text-sm text-primary-foreground/75">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
