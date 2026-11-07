import {
  FileText,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  User as UserIcon,
  type LucideIcon,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  roles?: UserRole[];
  end?: boolean;
}

export const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'New Interview', to: '/interviews/new', icon: PlusCircle },
  { label: 'Interviews', to: '/interviews', icon: ListChecks, end: true },
  { label: 'Resumes', to: '/resumes', icon: FileText },
  { label: 'Progress', to: '/progress', icon: TrendingUp },
  { label: 'Profile', to: '/profile', icon: UserIcon },
  { label: 'Admin', to: '/admin', icon: ShieldCheck, roles: ['admin'] },
];
