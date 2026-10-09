import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  CirclePlay,
  Clapperboard,
  Clock3,
  FolderOpen,
  History,
  Image as ImageIcon,
  Layers,
  LayoutDashboard,
  LogOut,
  Settings,
  Share2,
  SquarePlus,
} from 'lucide-react'

export type NavItem = {
  label: string
  to?: string
  icon: LucideIcon
  action?: 'logout'
}

export const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Content',
    items: [
      { label: 'Create Content', to: '/create', icon: SquarePlus },
      { label: 'All Content', to: '/content', icon: Layers },
      { label: 'Reels', to: '/reels', icon: Clapperboard },
      { label: 'Stories', to: '/stories', icon: CirclePlay },
      { label: 'Posts', to: '/posts', icon: ImageIcon },
    ],
  },
  {
    label: 'Planning',
    items: [
      { label: 'Content Calendar', to: '/calendar', icon: CalendarDays },
      { label: 'Scheduled Posts', to: '/scheduled', icon: Clock3 },
      { label: 'Publishing History', to: '/history', icon: History },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { label: 'Social Accounts', to: '/accounts', icon: Share2 },
      { label: 'Media Library', to: '/media', icon: FolderOpen },
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Logout', icon: LogOut, action: 'logout' },
    ],
  },
]
