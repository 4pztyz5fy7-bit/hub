import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "presence:partners-online";

/**
 * Tracks the current authenticated user as "online" on a shared presence channel.
 * Call once from an authenticated layout/page.
 */
export function useTrackOnline(userId: string | null | undefined) {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: userId } },
    });
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}

/**
 * Subscribes to the presence channel (read-only) and returns the count of unique
 * online users. Safe to use from public/anonymous pages.
 */
export function useOnlineCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: "" } },
    });
    const update = () => {
      const state = channel.presenceState() as Record<string, unknown[]>;
      setCount(Object.keys(state).filter((k) => k.length > 0).length);
    };
    channel
      .on("presence", { event: "sync" }, update)
      .on("presence", { event: "join" }, update)
      .on("presence", { event: "leave" }, update)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  return count;
}
