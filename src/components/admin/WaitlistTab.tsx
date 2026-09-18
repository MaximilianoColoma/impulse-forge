import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Download, 
  Users, 
  UserCheck, 
  Handshake, 
  Search,
  Loader2,
  RefreshCw,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface WaitlistSubscriber {
  id: string;
  email: string;
  name: string | null;
  affiliate_interest: boolean;
  source: string;
  subscribed_at: string;
}

interface WaitlistStats {
  total: number;
  withName: number;
  withAffiliateInterest: number;
}

export default function WaitlistTab() {
  const [subscribers, setSubscribers] = useState<WaitlistSubscriber[]>([]);
  const [filteredSubscribers, setFilteredSubscribers] = useState<WaitlistSubscriber[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<WaitlistStats>({ total: 0, withName: 0, withAffiliateInterest: 0 });

  useEffect(() => {
    fetchSubscribers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = subscribers.filter(sub => 
        sub.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredSubscribers(filtered);
    } else {
      setFilteredSubscribers(subscribers);
    }
  }, [subscribers, searchTerm]);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from('waitlist_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });

      if (error) throw error;

      const subs: WaitlistSubscriber[] = (data || []).map((s) => ({
        id: s.id,
        email: s.email,
        name: s.name,
        affiliate_interest: !!s.affiliate_interest,
        source: s.source ?? '',
        subscribed_at: s.subscribed_at ?? '',
      }));
      setSubscribers(subs);
      
      // Calculate stats
      setStats({
        total: subs.length,
        withName: subs.filter(s => s.name && s.name.trim() !== '').length,
        withAffiliateInterest: subs.filter(s => s.affiliate_interest).length,
      });
    } catch (error) {
      console.error('Error fetching waitlist:', error);
      toast.error('Fehler beim Laden der Warteliste');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSubscribers();
    setIsRefreshing(false);
    toast.success('Warteliste aktualisiert');
  };

  const exportToCSV = () => {
    if (subscribers.length === 0) {
      toast.error('Keine Daten zum Exportieren');
      return;
    }

    const headers = ['E-Mail', 'Name', 'Affiliate-Interesse', 'Quelle', 'Angemeldet am'];
    const rows = subscribers.map(sub => [
      sub.email,
      sub.name || '',
      sub.affiliate_interest ? 'Ja' : 'Nein',
      sub.source,
      format(new Date(sub.subscribed_at), 'dd.MM.yyyy HH:mm', { locale: de })
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `waitlist_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    toast.success('CSV-Export erfolgreich');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Gesamt-Anmeldungen</span>
            </div>
            <p className="text-3xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Mit Name</span>
            </div>
            <p className="text-3xl font-bold">{stats.withName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.withName / stats.total) * 100) : 0}% vollständig
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Handshake className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Affiliate-Interesse</span>
            </div>
            <p className="text-3xl font-bold">{stats.withAffiliateInterest}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.withAffiliateInterest / stats.total) * 100) : 0}% interessiert
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Warteliste
              </CardTitle>
              <CardDescription>
                {stats.total} {stats.total === 1 ? 'Eintrag' : 'Einträge'} auf der Warteliste
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportToCSV}
                disabled={subscribers.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suchen nach E-Mail oder Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Angemeldet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'Keine Ergebnisse gefunden' : 'Noch keine Anmeldungen'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubscribers.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.email}</TableCell>
                      <TableCell>
                        {sub.name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {sub.affiliate_interest ? (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            <Handshake className="h-3 w-3 mr-1" />
                            Ja
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(sub.subscribed_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
