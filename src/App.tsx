import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/app-shell'
import { GuestOnly, RequireAuth } from '@/components/layout/require-auth'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/auth-context'
import { ContentProvider } from '@/context/content-context'
import { AccountsPage } from '@/pages/accounts-page'
import { CalendarPage } from '@/pages/calendar-page'
import { ContentListPage } from '@/pages/content-list-page'
import { CreateContentPage } from '@/pages/create-content-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { HistoryPage } from '@/pages/history-page'
import { AccountDeletionPage, PrivacyPage, TermsPage } from '@/pages/legal-page'
import { LoginPage } from '@/pages/login-page'
import { MediaLibraryPage } from '@/pages/media-library-page'
import { ScheduledPage } from '@/pages/scheduled-page'
import { SettingsPage } from '@/pages/settings-page'

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider delayDuration={250}>
        <AuthProvider>
          <ContentProvider>
            <Routes>
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/account-deletion" element={<AccountDeletionPage />} />
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/create" element={<CreateContentPage />} />
                  <Route path="/content/:id/edit" element={<CreateContentPage />} />
                  <Route path="/stories/compose" element={<CreateContentPage story />} />
                  <Route
                    path="/content"
                    element={
                      <ContentListPage
                        title="All Content"
                        description="Upload a finished reel or story, then publish it now or let it go out on its own."
                      />
                    }
                  />
                  <Route
                    path="/reels"
                    element={
                      <ContentListPage
                        title="Reels"
                        description="Short vertical videos for Instagram and Facebook."
                        types={['reel']}
                      />
                    }
                  />
                  <Route
                    path="/stories"
                    element={
                      <ContentListPage
                        title="Stories"
                        description="Full-screen stories queued for Instagram Business accounts and Facebook Pages."
                        types={['story']}
                      />
                    }
                  />
                  <Route
                    path="/posts"
                    element={
                      <ContentListPage
                        title="Posts"
                        description="Feed posts and single-image publications."
                        types={['post', 'image']}
                      />
                    }
                  />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/scheduled" element={<ScheduledPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/accounts" element={<AccountsPage />} />
                  <Route path="/media" element={<MediaLibraryPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            <Toaster position="top-right" closeButton richColors />
          </ContentProvider>
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  )
}
