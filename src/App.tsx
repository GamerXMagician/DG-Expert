import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { RequireAuth, RequireAdmin } from '@/components/guards'
import { ToastHost } from '@/components/ToastHost'
import { ErrorBoundary } from '@/components/ErrorBoundary'

import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import SignUpPage from '@/pages/SignUpPage'
import {
  AboutPage,
  PricingPage,
  PrivacyPage,
  TermsPage,
  DisclaimerPage,
  NotFoundPage,
  VendorTermsPage,
} from '@/pages/StaticPages'

import AppLayout from '@/layouts/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import AssistantPage from '@/pages/AssistantPage'
import KnowledgePage from '@/pages/KnowledgePage'
import OemsPage from '@/pages/OemsPage'
import TroubleshootingPage from '@/pages/TroubleshootingPage'
import MaintenancePage from '@/pages/MaintenancePage'
import HistoryPage from '@/pages/HistoryPage'
import ProfilePage from '@/pages/ProfilePage'
import ServicesPage from '@/pages/ServicesPage'
import OrdersPage from '@/pages/OrdersPage'
import ChatsPage from '@/pages/ChatsPage'
import SupportPage from '@/pages/SupportPage'
import { VendorLoginPage, VendorSignUpPage } from '@/pages/VendorAuthPages'
import VendorDashboard from '@/pages/VendorDashboard'

import AdminLayout from '@/layouts/AdminLayout'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminRequests from '@/pages/admin/AdminRequests'
import AdminKnowledge from '@/pages/admin/AdminKnowledge'
import AdminOems from '@/pages/admin/AdminOems'
import AdminSubscriptions from '@/pages/admin/AdminSubscriptions'
import AdminNotifications from '@/pages/admin/AdminNotifications'
import AdminVendors from '@/pages/admin/AdminVendors'
import AdminChats from '@/pages/admin/AdminChats'
import AdminSupport from '@/pages/admin/AdminSupport'

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/vendor/login" element={<VendorLoginPage />} />
            <Route path="/vendor/signup" element={<VendorSignUpPage />} />
            <Route path="/vendor/terms" element={<VendorTermsPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/disclaimer" element={<DisclaimerPage />} />

            {/* Authenticated app */}
            <Route
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/assistant" element={<AssistantPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/oems" element={<OemsPage />} />
              <Route path="/services" element={<ServicesPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/chats" element={<ChatsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/troubleshooting" element={<TroubleshootingPage />} />
              <Route path="/maintenance" element={<MaintenancePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Vendor portal (own layout) */}
            <Route
              path="/vendor"
              element={
                <RequireAuth>
                  <VendorDashboard />
                </RequireAuth>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="vendors" element={<AdminVendors />} />
              <Route path="chats" element={<AdminChats />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="knowledge" element={<AdminKnowledge />} />
              <Route path="oems" element={<AdminOems />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="settings" element={<AdminNotifications />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </ErrorBoundary>
          <ToastHost />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
