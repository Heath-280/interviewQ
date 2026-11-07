import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: FileText,
    title: 'Resume-aware questions',
    description:
      'Upload your resume and we tailor every question to your actual experience and skills.',
  },
  {
    icon: Target,
    title: 'Job-description targeting',
    description:
      'Paste the job description and get questions that match the role you are applying for.',
  },
  {
    icon: MessageSquareText,
    title: 'Interactive mock interviews',
    description: 'Answer in a focused workspace and receive realistic follow-up questions.',
  },
  {
    icon: Sparkles,
    title: 'Detailed AI feedback',
    description:
      'Scores, strengths, weaknesses, suggested answers and concrete improvement tips.',
  },
  {
    icon: BarChart3,
    title: 'Progress analytics',
    description: 'Track skill-wise improvement across sessions and download shareable reports.',
  },
  {
    icon: CheckCircle2,
    title: 'Technical, HR & behavioral',
    description: 'Cover the full interview loop, or focus on the category you want to sharpen.',
  },
];

const steps = [
  { title: 'Create your profile', description: 'Sign up and set your target role in seconds.' },
  { title: 'Add resume & job description', description: 'Give the AI context for personalization.' },
  { title: 'Practise the interview', description: 'Answer questions and get scored instantly.' },
  { title: 'Review & improve', description: 'Study your report and track progress over time.' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen gradient-hero">
      <header className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight">InterviewIQ</span>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link to="/dashboard">
                Go to dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered interview preparation
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Ace your next interview with{' '}
          <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
            realistic AI practice
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          InterviewIQ generates personalized technical, HR and behavioral questions from your resume
          and the job description — then gives you instant, actionable feedback.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link to={user ? '/dashboard' : '/register'}>
              Start practising free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-card/80 backdrop-blur">
              <CardContent className="p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How it works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {index + 1}
              </span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl border bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to feel interview-ready?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Create a free account and run your first AI mock interview in under two minutes.
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-6">
            <Link to={user ? '/interviews/new' : '/register'}>
              {user ? 'Start a new interview' : 'Create free account'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t bg-background/60 py-8 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} InterviewIQ. Built for interview preparation.</p>
          <p>Powered by a configurable LLM backend.</p>
        </div>
      </footer>
    </div>
  );
}
