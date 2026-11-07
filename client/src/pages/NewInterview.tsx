import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { interviewApi, resumeApi, getErrorMessage } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const schema = z.object({
  role: z.string().trim().min(2, 'Job title is required').max(120),
  company: z.string().trim().max(120).optional(),
  jobDescription: z.string().trim().max(8000).optional(),
  resumeId: z.string().optional(),
  type: z.enum(['technical', 'hr', 'behavioral', 'mixed']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  questionCount: z.coerce.number().int().min(3).max(15),
});

type FormValues = z.infer<typeof schema>;

const TYPES: { value: FormValues['type']; label: string; hint: string }[] = [
  { value: 'mixed', label: 'Mixed', hint: 'A blend of technical, HR and behavioral' },
  { value: 'technical', label: 'Technical', hint: 'Role-specific technical depth' },
  { value: 'behavioral', label: 'Behavioral', hint: 'STAR-style past-experience questions' },
  { value: 'hr', label: 'HR', hint: 'Motivation, fit and culture questions' },
];

const DIFFICULTIES: { value: FormValues['difficulty']; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function NewInterview() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { data: resumeData } = useAsyncData(() => resumeApi.list({ limit: 100 }));
  const resumes = resumeData?.items ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: '',
      company: '',
      jobDescription: '',
      resumeId: '',
      type: 'mixed',
      difficulty: 'medium',
      questionCount: 6,
    },
  });

  const type = watch('type');
  const difficulty = watch('difficulty');
  const questionCount = watch('questionCount');
  const resumeId = watch('resumeId');

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { interview, warning } = await interviewApi.create({
        role: values.role,
        company: values.company || '',
        jobDescription: values.jobDescription || '',
        resumeId: values.resumeId ? values.resumeId : null,
        type: values.type,
        difficulty: values.difficulty,
        questionCount: values.questionCount,
      });
      if (warning) toast.warning(warning);
      else toast.success('Interview generated');
      navigate(`/interviews/${interview._id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New interview"
        description="Tell us about the role and we'll generate a tailored question set."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target role</CardTitle>
              <CardDescription>What job are you preparing for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="role">Job title *</Label>
                  <Input
                    id="role"
                    placeholder="e.g. Frontend Engineer"
                    {...register('role')}
                  />
                  {errors.role ? (
                    <p className="text-xs text-destructive">{errors.role.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company (optional)</Label>
                  <Input id="company" placeholder="e.g. Acme Inc." {...register('company')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job description (optional)</Label>
                <Textarea
                  id="jobDescription"
                  rows={6}
                  placeholder="Paste the job description to make questions more relevant…"
                  {...register('jobDescription')}
                />
                {errors.jobDescription ? (
                  <p className="text-xs text-destructive">{errors.jobDescription.message}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resume</CardTitle>
              <CardDescription>
                Attach a resume so questions reference your real experience.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={resumeId || 'none'}
                onValueChange={(value) => setValue('resumeId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No resume" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No resume</SelectItem>
                  {resumes.map((resume) => (
                    <SelectItem key={resume._id} value={resume._id}>
                      {resume.originalName}
                      {resume.isPrimary ? ' (primary)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {resumes.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  You have no resumes yet. You can still continue — or upload one from the Resumes
                  page.
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interview type</CardTitle>
              <CardDescription>Choose the focus of the interview.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue('type', option.value)}
                  className={cn(
                    'rounded-lg border p-4 text-left transition-colors',
                    type === option.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-accent',
                  )}
                >
                  <p className="font-medium">{option.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{option.hint}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setValue('difficulty', option.value)}
                      className={cn(
                        'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                        difficulty === option.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'hover:bg-accent',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="questionCount">Questions</Label>
                  <span className="text-sm font-semibold tabular-nums">{questionCount}</span>
                </div>
                <input
                  id="questionCount"
                  type="range"
                  min={3}
                  max={15}
                  step={1}
                  value={questionCount}
                  onChange={(e) => setValue('questionCount', Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Between 3 and 15 questions. 6 is a good starting point.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {submitting ? 'Generating questions…' : 'Generate interview'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Questions are generated with AI and may take a few seconds.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  );
}
