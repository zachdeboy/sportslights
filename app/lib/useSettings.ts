"use client";
import { useState, useEffect, useCallback } from "react";
import { AppSettings, DEFAULT_SETTINGS } from "./types";

const STORAGE_KEY = "sportslights_settings";

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettingsState({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {}
    setLoaded(true);
  }, []);

  const setSettings = useCallback((update: Partial<AppSettings> | ((prev: AppSettings) => AppSettings)) => {
    setSettingsState(prev => {
      const next = typeof update === "function" ? update(prev) : { ...prev, ...update };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { settings, setSettings, loaded };
}
