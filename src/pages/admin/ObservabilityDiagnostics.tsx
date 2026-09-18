import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminRoute } from "@/components/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

// T2.10_A · Internal Diagnostic Dashboard (need-to-know, admin only).
// Reads pseudonymous operational_event_outbox rows. No PostHog data is shown here.

const EVENT_NAMES = [
  "tenancy.space_switch.success", "tenancy.space_switch.failure",
  "team.seat.assigned", "team.seat.revoked",
  "team.invite.success", "team.invite.failure",
  "impulse.create.success", "impulse.create.failure",
  "auth.login.success", "auth.login.failure",
  "analytics.delivery.pending", "analytics.delivery.failed",
] as const;

type Row = {
  event_id: string;
  event_name: string;
  result: "success" | "failure";
  occurred_at: string;
  environment: string;
  tier: string | null;
  team_size_bucket: string | null;
  surface: string | null;
  error_class: string | null;
  actor_ref: string | null;
  space_ref: string | null;
  team_ref: string | null;
  status: string;
  expires_at: string;
};

export default function ObservabilityDiagnostics() {
  const [nameFilter, setNameFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [refSearch, setRefSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["operational_event_outbox", nameFilter, resultFilter],
    queryFn: async () => {
      let q = supabase
        .from("operational_event_outbox" as any)
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(500);
      if (nameFilter !== "all")   q = q.eq("event_name", nameFilter);
      if (resultFilter !== "all") q = q.eq("result", resultFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = refSearch.trim().toLowerCase();
    if (!s) return data;
    return data.filter((r) =>
      [r.actor_ref, r.space_ref, r.team_ref, r.error_class, r.surface]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(s)),
    );
  }, [data, refSearch]);

  const kpis = useMemo(() => {
    const rows = data ?? [];
    const total = rows.length;
    const failures = rows.filter((r) => r.result === "failure").length;
    const successRate = total ? Math.round(((total - failures) / total) * 100) : null;
    return { total, failures, successRate };
  }, [data]);

  return (
    <AdminRoute>
      <div className="container mx-auto max-w-7xl py-8 space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Observability · Internal Diagnostics</h1>
          <p className="text-sm text-muted-foreground">
            Pseudonyme Operational Events (T2.10_A). Bleiben ausschließlich intern — kein PostHog-Export von dieser Ansicht.
            Aufbewahrung ereignisspezifisch (siehe <code>operational_event_retention</code>).
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Events (500 max)</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{kpis.total}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Fehler</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold text-destructive">{kpis.failures}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Erfolgsrate</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-bold">{kpis.successRate ?? "—"}{kpis.successRate !== null && "%"}</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Filter</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Select value={nameFilter} onValueChange={setNameFilter}>
              <SelectTrigger><SelectValue placeholder="Event-Familie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Familien</SelectItem>
                {EVENT_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger><SelectValue placeholder="Ergebnis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle</SelectItem>
                <SelectItem value="success">success</SelectItem>
                <SelectItem value="failure">failure</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Suche in actor/space/team/error/surface …" value={refSearch} onChange={(e) => setRefSearch(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Events</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> lade …</div>
            ) : error ? (
              <div className="text-sm text-destructive">Fehler: {(error as Error).message}</div>
            ) : filtered.length === 0 ? (
              <div className="text-sm text-muted-foreground">Keine Events. Emitter feuern nach dem nächsten Domain-Commit (Seat/Invite/Space-Switch).</div>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zeit</TableHead>
                      <TableHead>Familie</TableHead>
                      <TableHead>Ergebnis</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Surface</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Refs (actor/space/team, gekürzt)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.event_id}>
                        <TableCell className="whitespace-nowrap text-xs">{new Date(r.occurred_at).toLocaleString("de-DE")}</TableCell>
                        <TableCell className="text-xs"><code>{r.event_name}</code></TableCell>
                        <TableCell>
                          <Badge variant={r.result === "success" ? "default" : "destructive"}>{r.result}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.tier ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.team_size_bucket ?? "—"}</TableCell>
                        <TableCell className="text-xs">{r.surface ?? "—"}</TableCell>
                        <TableCell className="text-xs text-destructive">{r.error_class ?? "—"}</TableCell>
                        <TableCell className="text-xs font-mono">
                          {[r.actor_ref, r.space_ref, r.team_ref]
                            .map((v) => (v ? v.slice(0, 8) : "—"))
                            .join(" / ")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminRoute>
  );
}