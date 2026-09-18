import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, Loader2, RefreshCw, ShieldCheck, Search } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface AuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  space_id: string | null;
  team_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZE = 50;

export default function AuditTab() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      const { data, error, count } = await query;
      if (error) throw error;
      setRows((data as AuditRow[]) ?? []);
      setTotal(count ?? 0);
    } catch (err) {
      console.error('audit fetch', err);
      toast.error('Fehler beim Laden des Audit-Logs');
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.action.toLowerCase().includes(q) ||
        r.resource_type.toLowerCase().includes(q) ||
        (r.actor_id ?? '').toLowerCase().includes(q) ||
        (r.resource_id ?? '').toLowerCase().includes(q),
    );
  }, [rows, search]);

  const uniqueActions = useMemo(() => {
    const s = new Set(rows.map((r) => r.action));
    return Array.from(s).sort();
  }, [rows]);

  const exportCsv = () => {
    const header = ['created_at', 'action', 'resource_type', 'resource_id', 'actor_id', 'space_id', 'team_id', 'metadata'];
    const escape = (v: unknown) =>
      `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const csv = [
      header.join(','),
      ...filtered.map((r) =>
        [
          r.created_at,
          r.action,
          r.resource_type,
          r.resource_id ?? '',
          r.actor_id ?? '',
          r.space_id ?? '',
          r.team_id ?? '',
          JSON.stringify(r.metadata ?? {}),
        ]
          .map(escape)
          .join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Audit-Log
            </CardTitle>
            <CardDescription>
              Append-only Beweiskette aller sicherheitsrelevanten Ereignisse. Read-only.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suche in Action, Resource, IDs …"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Alle Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Actions</SelectItem>
              {uniqueActions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zeit</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Space</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Keine Einträge
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(r.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: de })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{r.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{r.resource_type}</div>
                      {r.resource_id && (
                        <div className="text-muted-foreground font-mono truncate max-w-[160px]">
                          {r.resource_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[160px]">
                      {r.actor_id ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[160px]">
                      {r.space_id ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-[280px] truncate">
                      {r.metadata && Object.keys(r.metadata).length > 0
                        ? JSON.stringify(r.metadata)
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            {total > 0
              ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} von ${total}`
              : '0 Einträge'}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              Zurück
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage || loading}
            >
              Weiter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}