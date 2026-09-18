import { useEffect, useState } from "react";
import { AdminRoute } from "@/components/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

// Live status is checked in at docs/v2/petri/status.json by `pnpm petri:verify`.
// We import as raw text so a missing file becomes an inline empty state instead of a build break.
import statusRaw from "../../../docs/v2/petri/status.json?raw";
import graphRaw from "../../../docs/v2/petri/graph.mmd?raw";

type TokenState = { fired: boolean; faultPlace?: boolean; proofs?: Array<{ transition: string; state: string; refs: string[] }> };
type PhaseStatus = {
  title: string;
  complete: boolean;
  goalPlace: string;
  goalFired: boolean;
  faultsOpen: boolean;
  tokens: Record<string, TokenState>;
};
type Status = { generatedAt: string; phases: Record<string, PhaseStatus>; faults: Array<{ phase: string; errs: string[] }> };

function useMermaid(source: string) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod: any = await import(/* @vite-ignore */ ("https://esm.sh/mermaid@10.9.0"));
        const mermaid = mod.default ?? mod;
        mermaid.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
        const { svg } = await mermaid.render("petri-graph", source);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setSvg(null);
      }
    })();
    return () => { cancelled = true; };
  }, [source]);
  return svg;
}

export default function PetriDashboard() {
  const status: Status = JSON.parse(statusRaw);
  const svg = useMermaid(graphRaw);

  return (
    <AdminRoute>
      <div className="container mx-auto max-w-6xl py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Petri-Fabric</h1>
          <p className="text-sm text-muted-foreground">
            Snapshot vom {new Date(status.generatedAt).toLocaleString("de-DE")}. Aktualisiert per{" "}
            <code>node scripts/petri/verify.mjs</code>.
          </p>
        </header>

        {status.faults.length > 0 && (
          <Card className="border-destructive/50">
            <CardHeader><CardTitle className="text-destructive">Faults</CardTitle></CardHeader>
            <CardContent>
              <pre className="text-xs overflow-auto">{JSON.stringify(status.faults, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(status.phases).map(([id, phase]) => (
            <Card key={id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg">{id} · {phase.title}</CardTitle>
                <Badge variant={phase.complete ? "default" : "secondary"}>
                  {phase.complete ? "vollständig" : "in Arbeit"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>Ziel-Place: <code>{phase.goalPlace}</code> {phase.goalFired ? "✓" : "…"}</div>
                <div className="grid gap-1">
                  {Object.entries(phase.tokens).map(([place, tok]) => (
                    <div key={place} className="flex items-center justify-between border-b border-border/40 py-1">
                      <span className={tok.faultPlace ? "text-destructive" : ""}>{place}</span>
                      <span>{tok.fired ? "🟢" : "⚪"}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Graph</CardTitle></CardHeader>
          <CardContent>
            {svg ? (
              <div className="overflow-auto" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Mermaid wird gerendert …
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  );
}
