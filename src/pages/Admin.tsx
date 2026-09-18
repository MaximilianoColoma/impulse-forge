import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionTier, SubscriptionTier } from '@/hooks/useSubscriptionTier';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Shield, 
  Search, 
  ArrowLeft, 
  Users, 
  Crown, 
  Loader2,
  Check,
  X,
  Calendar,
  Lightbulb,
  FolderKanban,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
  Database,
  Zap,
  BarChart3,
  ShieldCheck,
  ShieldOff,
  Mail
} from 'lucide-react';
import WaitlistTab from '@/components/admin/WaitlistTab';
import AuditTab from '@/components/admin/AuditTab';
import { logAudit } from '@/lib/audit';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface UserProfile {
  id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  subscription_status: string | null;
  subscription_ends_at: string | null;
  created_at: string;
  synapse_score: number;
  isAdmin?: boolean;
}

interface SystemStats {
  totalUsers: number;
  totalImpulses: number;
  totalProjects: number;
  completedImpulses: number;
  totalTemplates: number;
  newUsersWeek: number;
  newImpulsesWeek: number;
  payingUsers: number;
  avgImpulsesPerUser: number;
  avgProjectsPerUser: number;
  completionRate: number;
}

interface DailyActivity {
  date: string;
  impulses: number;
  projects: number;
}

const tierColors: Record<SubscriptionTier, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  power: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  enterprise: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function Admin() {
  const navigate = useNavigate();
  const { isAdmin, isLoading: tierLoading } = useSubscriptionTier();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set());
  const [updatingAdminRole, setUpdatingAdminRole] = useState<string | null>(null);

  useEffect(() => {
    if (!tierLoading && !isAdmin) {
      toast.error('Zugriff verweigert - Nur für Administratoren');
      navigate('/app');
    }
  }, [isAdmin, tierLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  useEffect(() => {
    let result = users;
    
    if (searchTerm) {
      result = result.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterTier !== 'all') {
      result = result.filter(user => user.subscription_tier === filterTier);
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, filterTier]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchUsers(),
      fetchSystemStats(),
      fetchDailyActivity(),
      fetchAdminRoles()
    ]);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
    toast.success('Daten aktualisiert');
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, subscription_tier, subscription_status, subscription_ends_at, created_at, synapse_score')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Fehler beim Laden der Nutzer');
    }
  };

  const fetchSystemStats = async () => {
    try {
      // Fetch aggregated stats
      const [
        { count: totalUsers },
        { count: totalImpulses },
        { count: totalProjects },
        { count: completedImpulses },
        { count: totalTemplates },
        { count: newUsersWeek },
        { count: newImpulsesWeek },
        { count: payingUsers }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('impulses').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('impulses').select('*', { count: 'exact', head: true }).eq('status', 'done'),
        supabase.from('community_templates').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', subDays(new Date(), 7).toISOString()),
        supabase.from('impulses').select('*', { count: 'exact', head: true }).gte('created_at', subDays(new Date(), 7).toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('subscription_tier', 'free')
      ]);

      const users = totalUsers || 1;
      const impulses = totalImpulses || 0;
      const projects = totalProjects || 0;
      const completed = completedImpulses || 0;

      setSystemStats({
        totalUsers: totalUsers || 0,
        totalImpulses: impulses,
        totalProjects: projects,
        completedImpulses: completed,
        totalTemplates: totalTemplates || 0,
        newUsersWeek: newUsersWeek || 0,
        newImpulsesWeek: newImpulsesWeek || 0,
        payingUsers: payingUsers || 0,
        avgImpulsesPerUser: Math.round((impulses / users) * 10) / 10,
        avgProjectsPerUser: Math.round((projects / users) * 10) / 10,
        completionRate: impulses > 0 ? Math.round((completed / impulses) * 100) : 0
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchDailyActivity = async () => {
    try {
      const days = 7;
      const activity: DailyActivity[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();
        
        const [{ count: impulses }, { count: projects }] = await Promise.all([
          supabase.from('impulses').select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay).lte('created_at', endOfDay),
          supabase.from('projects').select('*', { count: 'exact', head: true })
            .gte('created_at', startOfDay).lte('created_at', endOfDay)
        ]);
        
        activity.push({
          date: format(date, 'EEE', { locale: de }),
          impulses: impulses || 0,
          projects: projects || 0
        });
      }
      
      setDailyActivity(activity);
    } catch (error) {
      console.error('Error fetching daily activity:', error);
    }
  };

  const fetchAdminRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (error) throw error;
      setAdminUserIds(new Set(data?.map(r => r.user_id) || []));
    } catch (error) {
      console.error('Error fetching admin roles:', error);
    }
  };

  const grantAdminRole = async (userId: string) => {
    setUpdatingAdminRole(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' });
      
      if (error) throw error;
      
      setAdminUserIds(prev => new Set([...prev, userId]));
      toast.success('Admin-Rolle hinzugefügt');
      logAudit({ action: 'role.grant', resourceType: 'user_role', resourceId: userId, metadata: { role: 'admin' } });
    } catch (error) {
      console.error('Error granting admin role:', error);
      toast.error('Fehler beim Hinzufügen der Admin-Rolle');
    } finally {
      setUpdatingAdminRole(null);
    }
  };

  const revokeAdminRole = async (userId: string) => {
    setUpdatingAdminRole(userId);
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'admin');
      
      if (error) throw error;
      
      setAdminUserIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.success('Admin-Rolle entfernt');
      logAudit({ action: 'role.revoke', resourceType: 'user_role', resourceId: userId, metadata: { role: 'admin' } });
    } catch (error) {
      console.error('Error revoking admin role:', error);
      toast.error('Fehler beim Entfernen der Admin-Rolle');
    } finally {
      setUpdatingAdminRole(null);
    }
  };

  const updateSubscription = async (
    userId: string, 
    tier: SubscriptionTier, 
    status: string | null = 'active',
    endsAt: string | null = null
  ) => {
    setUpdatingUser(userId);
    try {
      const updateData: {
        subscription_tier: SubscriptionTier;
        subscription_status: string | null;
        subscription_ends_at?: string | null;
      } = {
        subscription_tier: tier,
        subscription_status: status,
      };

      if (tier !== 'free' && !endsAt) {
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        updateData.subscription_ends_at = oneYearFromNow.toISOString();
      } else if (tier === 'free') {
        updateData.subscription_ends_at = null;
      } else {
        updateData.subscription_ends_at = endsAt;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData as never)
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Subscription aktualisiert');
      logAudit({ action: 'subscription.update', resourceType: 'profile', resourceId: userId, metadata: { tier, status } });
      fetchUsers();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setUpdatingUser(null);
    }
  };

  const grantPermanentPremium = async (userId: string) => {
    await updateSubscription(userId, 'power', 'active', '2099-12-31T23:59:59.000Z');
  };

  const revokeSubscription = async (userId: string) => {
    await updateSubscription(userId, 'free', null, null);
  };

  if (tierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const userStats = {
    total: users.length,
    free: users.filter(u => u.subscription_tier === 'free').length,
    pro: users.filter(u => u.subscription_tier === 'pro').length,
    power: users.filter(u => u.subscription_tier === 'power').length,
    enterprise: users.filter(u => u.subscription_tier === 'enterprise').length,
  };

  const maxDailyImpulses = Math.max(...dailyActivity.map(d => d.impulses), 1);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Admin Dashboard</h1>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aktualisieren
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Übersicht</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Nutzer</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Aktivität</span>
            </TabsTrigger>
            <TabsTrigger value="waitlist" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Waitlist</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Audit</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">Nutzer gesamt</span>
                  </div>
                  <p className="text-3xl font-bold">{systemStats?.totalUsers || 0}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{systemStats?.newUsersWeek || 0} diese Woche
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Impulse gesamt</span>
                  </div>
                  <p className="text-3xl font-bold">{systemStats?.totalImpulses || 0}</p>
                  <p className="text-xs text-green-600 mt-1">
                    +{systemStats?.newImpulsesWeek || 0} diese Woche
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderKanban className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-muted-foreground">Projekte</span>
                  </div>
                  <p className="text-3xl font-bold">{systemStats?.totalProjects || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ø {systemStats?.avgProjectsPerUser || 0} pro Nutzer
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Premium-Nutzer</span>
                  </div>
                  <p className="text-3xl font-bold">{systemStats?.payingUsers || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {systemStats?.totalUsers ? Math.round((systemStats.payingUsers / systemStats.totalUsers) * 100) : 0}% Conversion
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Metrics */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Leistungskennzahlen
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Erledigungsrate</span>
                      <span className="font-medium">{systemStats?.completionRate || 0}%</span>
                    </div>
                    <Progress value={systemStats?.completionRate || 0} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Ø Impulse/Nutzer</p>
                      <p className="text-xl font-bold">{systemStats?.avgImpulsesPerUser || 0}</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Erledigte Impulse</p>
                      <p className="text-xl font-bold">{systemStats?.completedImpulses || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Datenübersicht
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <span>Impulse</span>
                      </div>
                      <span className="font-bold">{systemStats?.totalImpulses || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-4 w-4 text-purple-500" />
                        <span>Projekte</span>
                      </div>
                      <span className="font-bold">{systemStats?.totalProjects || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span>Community Templates</span>
                      </div>
                      <span className="font-bold">{systemStats?.totalTemplates || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Subscription-Verteilung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-3xl font-bold">{userStats.total}</p>
                    <p className="text-sm text-muted-foreground">Gesamt</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-3xl font-bold text-muted-foreground">{userStats.free}</p>
                    <p className="text-sm text-muted-foreground">Free</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">{userStats.pro}</p>
                    <p className="text-sm text-blue-600/70">Pro</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-600">{userStats.power}</p>
                    <p className="text-sm text-purple-600/70">Power</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-3xl font-bold text-amber-600">{userStats.enterprise}</p>
                    <p className="text-sm text-amber-600/70">Enterprise</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nutzer verwalten</CardTitle>
                <CardDescription>
                  Suche und verwalte Nutzer-Subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nach E-Mail suchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterTier} onValueChange={setFilterTier}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Tier filtern" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Tiers</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>E-Mail</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Rolle</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Endet</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Keine Nutzer gefunden
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium max-w-[200px] truncate">
                                {user.email}
                              </TableCell>
                              <TableCell>
                                <Badge className={tierColors[user.subscription_tier]}>
                                  {user.subscription_tier}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {adminUserIds.has(user.id) ? (
                                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Admin
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">Nutzer</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.subscription_status === 'active' ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Check className="h-3 w-3" />
                                    Aktiv
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <X className="h-3 w-3" />
                                    {user.subscription_status || 'Inaktiv'}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.subscription_ends_at ? (
                                  <span className="flex items-center gap-1 text-sm">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(user.subscription_ends_at), 'dd.MM.yyyy', { locale: de })}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>{user.synapse_score}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {/* Admin Role Toggle */}
                                  {adminUserIds.has(user.id) ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => revokeAdminRole(user.id)}
                                      disabled={updatingAdminRole === user.id}
                                      className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                      {updatingAdminRole === user.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <ShieldOff className="h-3 w-3 mr-1" />
                                          Admin entfernen
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => grantAdminRole(user.id)}
                                      disabled={updatingAdminRole === user.id}
                                      className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                    >
                                      {updatingAdminRole === user.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <ShieldCheck className="h-3 w-3 mr-1" />
                                          Admin
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  {/* Subscription Actions */}
                                  {user.subscription_tier === 'free' ? (
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => grantPermanentPremium(user.id)}
                                      disabled={updatingUser === user.id}
                                    >
                                      {updatingUser === user.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <>
                                          <Crown className="h-3 w-3 mr-1" />
                                          Premium
                                        </>
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => revokeSubscription(user.id)}
                                      disabled={updatingUser === user.id}
                                    >
                                      {updatingUser === user.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Entfernen'
                                      )}
                                    </Button>
                                  )}
                                  <Select
                                    value={user.subscription_tier}
                                    onValueChange={(value) => updateSubscription(user.id, value as SubscriptionTier)}
                                  >
                                    <SelectTrigger className="w-[100px] h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="free">Free</SelectItem>
                                      <SelectItem value="pro">Pro</SelectItem>
                                      <SelectItem value="power">Power</SelectItem>
                                      <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                <p className="text-sm text-muted-foreground">
                  {filteredUsers.length} von {users.length} Nutzern
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Aktivität der letzten 7 Tage
                </CardTitle>
                <CardDescription>
                  Neue Impulse und Projekte pro Tag
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailyActivity.map((day, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium w-12">{day.date}</span>
                        <div className="flex-1 mx-4">
                          <div 
                            className="h-6 bg-primary/80 rounded-sm flex items-center justify-end pr-2 text-xs text-primary-foreground font-medium transition-all"
                            style={{ 
                              width: `${Math.max((day.impulses / maxDailyImpulses) * 100, 5)}%`,
                              minWidth: '40px'
                            }}
                          >
                            {day.impulses}
                          </div>
                        </div>
                        <div className="text-right text-muted-foreground w-24">
                          {day.projects} Projekt{day.projects !== 1 ? 'e' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/80 rounded-sm" />
                    <span className="text-sm text-muted-foreground">Neue Impulse</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wöchentliche Zusammenfassung</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {systemStats?.newUsersWeek || 0}
                    </p>
                    <p className="text-sm text-green-600/70">Neue Nutzer</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {systemStats?.newImpulsesWeek || 0}
                    </p>
                    <p className="text-sm text-blue-600/70">Neue Impulse</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {dailyActivity.reduce((sum, d) => sum + d.projects, 0)}
                    </p>
                    <p className="text-sm text-purple-600/70">Neue Projekte</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {systemStats?.completionRate || 0}%
                    </p>
                    <p className="text-sm text-amber-600/70">Erledigungsrate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Waitlist Tab */}
          <TabsContent value="waitlist">
            <WaitlistTab />
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
