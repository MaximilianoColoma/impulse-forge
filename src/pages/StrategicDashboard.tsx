import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LayoutDashboard } from "lucide-react";
import { ProjectMetricsWidget } from "@/components/dashboard/ProjectMetricsWidget";
import { ProjectRankingWidget } from "@/components/dashboard/ProjectRankingWidget";
import { NextStepsWidget } from "@/components/dashboard/NextStepsWidget";
import { FocusBlockWidget } from "@/components/dashboard/FocusBlockWidget";
import { SmartMatchingWidget } from "@/components/dashboard/SmartMatchingWidget";
import { OptimizationWidget } from "@/components/OptimizationWidget";
import { SectionErrorBoundary } from "@/components/SectionErrorBoundary";

export default function StrategicDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full pb-20">
      <div className="fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Strategisches Dashboard</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/settings')}
            title="Einstellungen"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <main className="w-full bg-gradient-calm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 pt-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Project overview - wide */}
          <div className="md:col-span-2 hover-lift">
            <SectionErrorBoundary>
              <div className="glass-card rounded-2xl p-6 shadow-soft">
                <ProjectMetricsWidget />
              </div>
            </SectionErrorBoundary>
          </div>

          {/* Focus blocks - sidebar */}
          <div className="hover-lift">
            <SectionErrorBoundary>
              <div className="glass-card rounded-2xl p-6 shadow-soft">
                <FocusBlockWidget />
              </div>
            </SectionErrorBoundary>
          </div>

          {/* AI next steps */}
          <div className="hover-lift">
            <SectionErrorBoundary>
              <div className="glass-card rounded-2xl p-6 shadow-soft">
                <NextStepsWidget />
              </div>
            </SectionErrorBoundary>
          </div>

          {/* Smart matching */}
          <div className="hover-lift">
            <SectionErrorBoundary>
              <div className="glass-card rounded-2xl p-6 shadow-soft">
                <SmartMatchingWidget />
              </div>
            </SectionErrorBoundary>
          </div>

          {/* Optimization */}
          <div className="hover-lift">
            <SectionErrorBoundary>
              <div className="glass-card rounded-2xl p-6 shadow-soft">
                <OptimizationWidget onUpdate={() => {}} />
              </div>
            </SectionErrorBoundary>
          </div>

          {/* Full-width project ranking */}
          <div className="md:col-span-2 lg:col-span-3 hover-lift">
            <SectionErrorBoundary>
              <div className="glass-card rounded-2xl p-6 shadow-soft">
                <ProjectRankingWidget />
              </div>
            </SectionErrorBoundary>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
