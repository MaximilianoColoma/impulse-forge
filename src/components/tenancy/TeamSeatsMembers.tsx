import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/i18n";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { UpgradeNudgeBanner } from "@/components/UpgradeNudgeBanner";
import { showUpgradeToast } from "@/components/UpgradeNudgeToast";
import { useActorId } from "@/hooks/useActorId";
import { useNavigate } from "react-router-dom";

type TeamRow = { id: string; name: string };
type UsageRow = {
  team_id: string;
  seats_purchased: number | null;
  seats_active: number;
  seats_pending: number;
  seats_remaining: number;
};
type MemberRow = {
  actor_id: string;
  role: "viewer" | "member" | "admin" | "owner";
  seat_status: "active" | "pending" | "revoked";
  seat_assigned_at: string | null;
  actor_display_name: string | null;
  actor_email: string | null;
};

export function TeamSeatsMembers() {
  const { t } = useLocale();
  const { actorId: currentActorId } = useActorId();
  const navigate = useNavigate();
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [usage, setUsage] = useState<UsageRow | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "member" | "admin">("member");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // pick first team the user is a member of (admin gating enforced by RPC)
      const { data: actor } = await supabase.rpc("current_actor_id");
      const { data: myTeams, error: teamsErr } = await supabase
        .from("team_members")
        .select("team_id, teams:team_id (id, name)")
        .eq("actor_id", actor as unknown as string);
      if (teamsErr) throw teamsErr;
      const first = (myTeams ?? [])
        .map((r) => (r as { teams: TeamRow | null }).teams)
        .find((x) => !!x) as TeamRow | null;
      if (!first) {
        setTeam(null);
        setMembers([]);
        setUsage(null);
        return;
      }
      setTeam(first);

      const [{ data: u }, { data: m }] = await Promise.all([
        supabase.from("team_seat_usage").select("*").eq("team_id", first.id).maybeSingle(),
        supabase
          .from("team_members")
          .select("actor_id, role, seat_status, seat_assigned_at, actors:actor_id (display_name, user_id)")
          .eq("team_id", first.id),
      ]);
      setUsage((u as UsageRow) ?? null);

      const rows = (m ?? []).map((r) => {
        const a = (r as { actors: { display_name: string | null; user_id: string | null } | null }).actors;
        return {
          actor_id: (r as { actor_id: string }).actor_id,
          role: (r as { role: MemberRow["role"] }).role,
          seat_status: (r as { seat_status: MemberRow["seat_status"] }).seat_status,
          seat_assigned_at: (r as { seat_assigned_at: string | null }).seat_assigned_at,
          actor_display_name: a?.display_name ?? null,
          actor_email: null,
        } as MemberRow;
      });
      setMembers(rows);
    } catch (e) {
      console.error("team members load failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (fn: "assign_seat" | "revoke_seat", actorId: string, successKey: string) => {
    if (!team) return;
    const { error } = await supabase.rpc(fn, { _team_id: team.id, _actor_id: actorId });
    if (error) {
      const msg = error.message ?? "";
      if (msg.includes("SEAT_LIMIT_REACHED")) {
        toast.error(t("settings.seats.members.seat_limit_reached"));
        showUpgradeToast({
          event: "seat_utilization_high",
          actorId: currentActorId,
          t,
          navigate: (href) => navigate(href),
          surface: "toast.team_seats.limit_reached",
        });
      } else {
        toast.error(t("settings.seats.members.error_generic"));
      }
      return;
    }
    toast.success(t(successKey));
    logAudit({ action: `client.${fn}`, resourceType: "team_member", resourceId: actorId, teamId: team.id });
    load();
  };

  const handleInvite = async () => {
    if (!team || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      // Resolve actor by email via profiles
      const { data: prof, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", inviteEmail.trim().toLowerCase())
        .maybeSingle();
      if (pErr || !prof) {
        toast.error(t("settings.seats.members.error_not_found"));
        return;
      }
      const { data: actorRow, error: aErr } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", (prof as { id: string }).id)
        .eq("kind", "human")
        .maybeSingle();
      if (aErr || !actorRow) {
        toast.error(t("settings.seats.members.error_not_found"));
        return;
      }
      const { error } = await supabase.rpc("invite_member", {
        _team_id: team.id,
        _actor_id: (actorRow as { id: string }).id,
        _role: inviteRole,
      });
      if (error) {
        toast.error(t("settings.seats.members.error_generic"));
        return;
      }
      toast.success(t("settings.seats.members.success_invited"));
      setInviteEmail("");
      setInviteOpen(false);
      load();
    } finally {
      setInviting(false);
    }
  };

  if (!loading && !team) return null;

  return (
    <Card className="p-6 bg-card border-border">
      {usage && usage.seats_purchased != null && (
        <div className="mb-4">
          <UpgradeNudgeBanner
            surface="settings.seats"
            context={{
              seatsActive: usage.seats_active,
              seatsPurchased: usage.seats_purchased,
              seatsPending: usage.seats_pending,
            }}
          />
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">{t("settings.seats.members.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("settings.seats.members.description")}</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              {t("settings.seats.members.invite")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("settings.seats.members.invite")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="inv-email">{t("settings.seats.members.invite_email")}</Label>
                <Input
                  id="inv-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="member@example.com"
                />
              </div>
              <div>
                <Label htmlFor="inv-role">{t("settings.seats.members.invite_role")}</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                  <SelectTrigger id="inv-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">viewer</SelectItem>
                    <SelectItem value="member">member</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                {t("settings.seats.members.invite_submit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {usage && usage.seats_purchased != null && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>
              {t("settings.seats.members.quota", {
                active: String(usage.seats_active),
                purchased: String(usage.seats_purchased),
              })}
            </span>
            <span className="text-muted-foreground">
              {t("settings.seats.members.remaining", { remaining: String(usage.seats_remaining) })}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${Math.min(100, (usage.seats_active / Math.max(1, usage.seats_purchased)) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("settings.seats.members.loading")}</p>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("settings.seats.members.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2">{t("settings.seats.members.table_actor")}</th>
                <th className="py-2">{t("settings.seats.members.table_role")}</th>
                <th className="py-2">{t("settings.seats.members.table_status")}</th>
                <th className="py-2">{t("settings.seats.members.table_assigned")}</th>
                <th className="py-2 text-right">{t("settings.seats.members.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.actor_id} className="border-b border-border/50">
                  <td className="py-2">{m.actor_display_name ?? m.actor_id.slice(0, 8)}</td>
                  <td className="py-2">{m.role}</td>
                  <td className="py-2">
                    {m.seat_status === "active" && t("settings.seats.members.status_active")}
                    {m.seat_status === "pending" && t("settings.seats.members.status_pending")}
                    {m.seat_status === "revoked" && t("settings.seats.members.status_revoked")}
                  </td>
                  <td className="py-2">
                    {m.seat_assigned_at ? new Date(m.seat_assigned_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {m.seat_status === "active" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => call("revoke_seat", m.actor_id, "settings.seats.members.success_revoked")}
                      >
                        {t("settings.seats.members.revoke")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => call("assign_seat", m.actor_id, "settings.seats.members.success_assigned")}
                      >
                        {t("settings.seats.members.assign")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}