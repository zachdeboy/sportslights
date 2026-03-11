"use client";
import { useCallback, useRef } from "react";
import { AppSettings, TeamConfig, TEAMS, hexToHueXY } from "./types";

const STEP_MS = 600;

export function useHueLights(settings: AppSettings) {
  const isAnimating = useRef(false);

  const callProxy = useCallback(
    async (path: string, method = "GET", body?: object) => {
      const url = `${settings.proxyUrl}/hue${path}`;
      const opts: RequestInit = {
        method,
        headers: { "Content-Type": "application/json" },
      };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
      return res.json();
    },
    [settings.proxyUrl]
  );

  const getLights = useCallback(async () => {
    return callProxy(`/api/${settings.hueApiKey}/lights`);
  }, [callProxy, settings.hueApiKey]);

  const getGroups = useCallback(async () => {
    return callProxy(`/api/${settings.hueApiKey}/groups`);
  }, [callProxy, settings.hueApiKey]);

  const setGroupState = useCallback(
    async (groupId: string, state: object) => {
      return callProxy(`/api/${settings.hueApiKey}/groups/${groupId}/action`, "PUT", state);
    },
    [callProxy, settings.hueApiKey]
  );

  const setAllLightsState = useCallback(
    async (state: object) => {
      return callProxy(`/api/${settings.hueApiKey}/groups/0/action`, "PUT", state);
    },
    [callProxy, settings.hueApiKey]
  );

  const captureState = useCallback(async () => {
    try {
      const lights = await getLights();
      return lights;
    } catch (e) {
      console.error("Capture state error:", e);
      return null;
    }
  }, [getLights]);

  const restoreState = useCallback(
    async (savedLights: Record<string, { state: { on: boolean; bri: number; hue?: number; sat?: number; ct?: number } }>) => {
      if (!savedLights) return;
      const entries = Object.entries(savedLights);
      await Promise.all(
        entries.map(([id, light]) => {
          const s = light.state;
          const body: Record<string, unknown> = { on: s.on };
          if (s.on) {
            body.bri = s.bri;
            if (s.hue !== undefined) body.hue = s.hue;
            if (s.sat !== undefined) body.sat = s.sat;
            if (s.ct !== undefined) body.ct = s.ct;
          }
          return callProxy(`/api/${settings.hueApiKey}/lights/${id}/state`, "PUT", body).catch(() => {});
        })
      );
    },
    [callProxy, settings.hueApiKey]
  );

  const triggerScoreAnimation = useCallback(
    async (teamId: string) => {
      if (isAnimating.current || !settings.hueApiKey) return;
      isAnimating.current = true;

      const team = TEAMS.find((t) => t.id === teamId);
      if (!team) { isAnimating.current = false; return; }

      let savedState: Record<string, unknown> | null = null;
      try {
        savedState = await captureState();
      } catch {}

      const targetGroup = settings.lightScope === "whole-house" ? "0" : settings.theaterGroupId;

      const steps = team.sequence;
      for (const hexColor of steps) {
        try {
          const { xy, bri } = hexToHueXY(hexColor);
          const state: Record<string, unknown> = { on: true, xy, bri: Math.max(bri, 100), transitiontime: 1 };
          await setGroupState(targetGroup, state);
          await new Promise((r) => setTimeout(r, STEP_MS));
        } catch (e) {
          console.error("Light step error:", e);
        }
      }

      // Brief pause then restore
      await new Promise((r) => setTimeout(r, 500));
      if (savedState) {
        try {
          await restoreState(savedState as Record<string, { state: { on: boolean; bri: number; hue?: number; sat?: number; ct?: number } }>);
        } catch {}
      }

      isAnimating.current = false;
    },
    [settings, captureState, setGroupState, restoreState]
  );

  const testAnimation = useCallback(
    async (teamId: string) => {
      await triggerScoreAnimation(teamId);
    },
    [triggerScoreAnimation]
  );

  const pingProxy = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`${settings.proxyUrl}/ping`, { signal: AbortSignal.timeout(3000) });
      return res.ok;
    } catch {
      return false;
    }
  }, [settings.proxyUrl]);

  const pingBridge = useCallback(async (): Promise<boolean> => {
    try {
      if (!settings.hueApiKey) return false;
      const lights = await getLights();
      return typeof lights === "object" && lights !== null;
    } catch {
      return false;
    }
  }, [getLights, settings.hueApiKey]);

  return { triggerScoreAnimation, testAnimation, pingProxy, pingBridge, getLights, getGroups };
}
