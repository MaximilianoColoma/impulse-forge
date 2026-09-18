import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { Suspense, lazy } from "react";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ActiveSpaceProvider } from "./hooks/useActiveSpace";
import { AdminRoute } from "./components/AdminRoute";
import { MobileTabBar } from "./components/MobileTabBar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { EvolutionNotification } from "./components/EvolutionNotification";
import { RealtimeSyncProvider } from "./components/RealtimeSyncProvider";
import { PageLoader } from "./components/PageLoader";
import { LocaleProvider } from "./i18n";

// Lazy load all pages for optimal bundle splitting
const SmartLanding = lazy(() => import("./components/SmartLanding").then(m => ({ default: m.SmartLanding })));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ProjectBoard = lazy(() => import("./pages/ProjectBoard"));
const Projects = lazy(() => import("./pages/Projects"));
const Sprint = lazy(() => import("./pages/Sprint"));
const Share = lazy(() => import("./pages/Share"));
const Auth = lazy(() => import("./pages/Auth"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Pricing = lazy(() => import("./pages/Pricing"));
const EmailConfirmation = lazy(() => import("./pages/EmailConfirmation"));
const OnboardingWizard = lazy(() => import("./components/OnboardingWizard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Blueprints = lazy(() => import("./pages/Blueprints"));
const StrategicDashboard = lazy(() => import("./pages/StrategicDashboard"));
const EvolveBlueprintReview = lazy(() => import("./pages/EvolveBlueprintReview"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Admin = lazy(() => import("./pages/Admin"));
const Waitlist = lazy(() => import("./pages/Waitlist"));
const PetriDashboard = lazy(() => import("./pages/admin/PetriDashboard"));
const ObservabilityDiagnostics = lazy(() => import("./pages/admin/ObservabilityDiagnostics"));
const Imprint = lazy(() => import("./pages/Imprint"));
const Privacy = lazy(() => import("./pages/Privacy"));
const BetaTerms = lazy(() => import("./pages/BetaTerms"));

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ActiveSpaceProvider>
            <RealtimeSyncProvider>
            <EvolutionNotification />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Suspense fallback={<PageLoader />}><SmartLanding /></Suspense>} />
              <Route path="/auth" element={<Suspense fallback={<PageLoader />}><Auth /></Suspense>} />
              <Route path="/pricing" element={<Suspense fallback={<PageLoader />}><Pricing /></Suspense>} />
              <Route path="/email-confirmation" element={<Suspense fallback={<PageLoader />}><EmailConfirmation /></Suspense>} />
              <Route path="/waitlist" element={<Suspense fallback={<PageLoader />}><Waitlist /></Suspense>} />
              <Route path="/impressum" element={<Suspense fallback={<PageLoader />}><Imprint /></Suspense>} />
              <Route path="/datenschutz" element={<Suspense fallback={<PageLoader />}><Privacy /></Suspense>} />
              <Route path="/beta-bedingungen" element={<Suspense fallback={<PageLoader />}><BetaTerms /></Suspense>} />
              
              <Route path="/onboarding" element={<Suspense fallback={<PageLoader />}><OnboardingWizard /></Suspense>} />
              
              {/* Protected routes */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Dashboard />
                      <MobileTabBar />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Projects />
                      <MobileTabBar />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sprint"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Sprint />
                      <MobileTabBar />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/share"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Share />
                      <MobileTabBar />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:id"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <ProjectBoard />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <StrategicDashboard />
                        <MobileTabBar />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Suspense fallback={<PageLoader />}>
                      <Settings />
                    </Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <Analytics />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blueprints"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <Blueprints />
                        <MobileTabBar />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/blueprints/evolve/:templateId"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <EvolveBlueprintReview />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/api-docs"
                element={
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <ApiDocs />
                      </Suspense>
                    </ErrorBoundary>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <Admin />
                      </Suspense>
                    </ErrorBoundary>
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/petri"
                element={
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <PetriDashboard />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="/admin/observability"
                element={
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <ObservabilityDiagnostics />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <ResetPassword />
                    </Suspense>
                  </ErrorBoundary>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
            </Routes>
          </RealtimeSyncProvider>
            </ActiveSpaceProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
      </LocaleProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
