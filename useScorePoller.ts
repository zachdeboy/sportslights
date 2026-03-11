"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { GameScore, Team, TeamConfig, TEAMS } from "./types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

async function fetchGameForTeam(team: TeamConfig): Promise<GameScore | null> {
  try {
    let url = "";
    if (team.sport === "mlb") {
      url = `${ESPN_BASE}/baseball/mlb/scoreboard`;
    } else if (team.sport === "ncaaf") {
      url = `${ESPN_BASE}/football/college-football/scoreboard`;
    } else if (team.sport === "ncaab") {
      url = `${ESPN_BASE}/basketball/mens-college-basketball/scoreboard`;
    }

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();

    const events = data.events || [];
    for (const event of events) {
      const competitors: { id: string; team: { id: string; abbreviation: string }; score: string; homeAway: string }[] =
        event.competitions?.[0]?.competitors || [];

      const ourComp = competitors.find(
        (c) => c.team?.id === team.espnTeamId || c.id === team.espnTeamId
      );
      if (!ourComp) continue;

      const status = event.status?.type;
      const statusName: "pre" | "in" | "post" | "unknown" =
        status?.name === "STATUS_IN_PROGRESS"
          ? "in"
          : status?.name === "STATUS_FINAL"
          ? "post"
          : status?.name === "STATUS_SCHEDULED"
          ? "pre"
          : "unknown";

      const homeComp = competitors.find((c) => c.homeAway === "home");
      const awayComp = competitors.find((c) => c.homeAway === "away");

      return {
        gameId: event.id,
        status: statusName,
        homeTeam: homeComp?.team?.abbreviation || "HOME",
        awayTeam: awayComp?.team?.abbreviation || "AWAY",
        homeScore: parseInt(homeComp?.score || "0", 10),
        awayScore: parseInt(awayComp?.score || "0", 10),
        period: event.status?.period?.toString() || "-",
        clock: event.status?.displayClock || "",
        isOurTeam: true,
        ourScore: parseInt(ourComp.score || "0", 10),
        ourTeamId: team.id,
        lastUpdated: Date.now(),
      };
    }
    return null;
  } catch (e) {
    console.error("ESPN fetch error:", e);
    return null;
  }
}

export function useScorePoller(
  enabledTeams: Team[],
  intervalMs: number,
  active: boolean,
  onScore: (teamId: Team, newScore: number, prevScore: number, gameId: string) => void
) {
  const [scores, setScores] = useState<Map<Team, GameScore>>(new Map());
  const [lastPoll, setLastPoll] = useState<number | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const prevScores = useRef<Map<Team, number>>(new Map());

  const poll = useCallback(async () => {
    if (!active || enabledTeams.length === 0) return;
    setPollError(null);
    const teams = TEAMS.filter((t) => enabledTeams.includes(t.id));
    const results = await Promise.all(teams.map(fetchGameForTeam));

    setScores((prev) => {
      const next = new Map(prev);
      results.forEach((score, i) => {
        if (score) {
          const team = teams[i];
          const prevScore = prevScores.current.get(team.id);
          if (prevScore !== undefined && score.ourScore > prevScore && score.status === "in") {
            onScore(team.id, score.ourScore, prevScore, score.gameId);
          }
          if (score.status === "in") {
            prevScores.current.set(team.id, score.ourScore);
          }
          next.set(team.id, score);
        }
      });
      return next;
    });
    setLastPoll(Date.now());
  }, [active, enabledTeams, onScore]);

  useEffect(() => {
    if (!active) return;
    poll();
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [poll, active, intervalMs]);

  return { scores, lastPoll, pollError };
}
