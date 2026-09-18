import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { composeActorId, getDeviceId } from "@/lib/actor/actorId";

/**
 * React binding for the Ω1 Actor-ID primitive.
 * Returns a stable object as long as the underlying user_id/device pair is stable.
 */
export function useActorId() {
  const { user } = useAuth();
  return useMemo(() => {
    const deviceId = getDeviceId();
    return {
      deviceId,
      userId: user?.id ?? null,
      actorId: composeActorId(user?.id),
      isAnonymous: !user,
    };
  }, [user?.id]);
}