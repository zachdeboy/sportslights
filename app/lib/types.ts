export type Team = "braves" | "gators-football" | "gators-basketball";
export type Sport = "mlb" | "ncaaf" | "ncaab";
export type LightScope = "theater" | "whole-house";

export interface TeamConfig {
  id: Team;
  name: string;
  shortName: string;
  sport: Sport;
  espnTeamId: string;
  espnLeague: string;
  primaryColor: string;
  secondaryColor: string;
  sequence: string[]; // Hex colors for light flash sequence
  logo: string;
}

export interface GameScore {
  gameId: string;
  status: "pre" | "in" | "post" | "unknown";
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: string;
  clock: string;
  isOurTeam: boolean;
  ourScore: number;
  ourTeamId: Team;
  lastUpdated: number;
}

export interface LightState {
  on: boolean;
  bri: number;
  hue?: number;
  sat?: number;
  ct?: number;
  xy?: [number, number];
}

export interface HueLight {
  id: string;
  name: string;
  state: LightState;
  room?: string;
}

export interface AppSettings {
  proxyUrl: string;
  hueApiKey: string;
  lightScope: LightScope;
  theaterGroupId: string;
  enabledTeams: Team[];
  pollIntervalMs: number;
}

export interface ScoreEvent {
  teamId: Team;
  teamName: string;
  newScore: number;
  previousScore: number;
  timestamp: number;
  gameId: string;
}

export const TEAMS: TeamConfig[] = [
  {
    id: "braves",
    name: "Atlanta Braves",
    shortName: "Braves",
    sport: "mlb",
    espnTeamId: "15",
    espnLeague: "mlb",
    primaryColor: "#CE1141",
    secondaryColor: "#13274F",
    sequence: ["#CE1141", "#13274F", "#CE1141", "#FFFFFF", "#CE1141"],
    logo: "⚾",
  },
  {
    id: "gators-football",
    name: "Florida Gators Football",
    shortName: "Gators FB",
    sport: "ncaaf",
    espnTeamId: "57",
    espnLeague: "college-football",
    primaryColor: "#FA4616",
    secondaryColor: "#0021A5",
    sequence: ["#FA4616", "#0021A5", "#FA4616", "#FFFFFF", "#FA4616"],
    logo: "🏈",
  },
  {
    id: "gators-basketball",
    name: "Florida Gators Basketball",
    shortName: "Gators BB",
    sport: "ncaab",
    espnTeamId: "57",
    espnLeague: "mens-college-basketball",
    primaryColor: "#FA4616",
    secondaryColor: "#0021A5",
    sequence: ["#FA4616", "#0021A5", "#FA4616", "#FFFFFF", "#FA4616"],
    logo: "🏀",
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  proxyUrl: "http://localhost:3001",
  hueApiKey: "",
  lightScope: "theater",
  theaterGroupId: "1",
  enabledTeams: ["braves", "gators-football"],
  pollIntervalMs: 20000,
};

// Convert hex color to Hue XY + brightness
export function hexToHueXY(hex: string): { xy: [number, number]; bri: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const rLin = r <= 0.04045 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLin = g <= 0.04045 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLin = b <= 0.04045 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  const X = rLin * 0.664511 + gLin * 0.154324 + bLin * 0.162028;
  const Y = rLin * 0.283881 + gLin * 0.668433 + bLin * 0.047685;
  const Z = rLin * 0.000088 + gLin * 0.072310 + bLin * 0.986039;

  const total = X + Y + Z;
  if (total === 0) return { xy: [0.3127, 0.3290], bri: 0 };

  const x = X / total;
  const y = Y / total;
  const bri = Math.round(Y * 254);

  return { xy: [Math.round(x * 10000) / 10000, Math.round(y * 10000) / 10000], bri: Math.min(254, Math.max(1, bri)) };
}
