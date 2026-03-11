"use client";
import { useState, useCallback, useEffect } from "react";
import { useSettings } from "../lib/useSettings";
import { useScorePoller } from "../lib/useScorePoller";
import { useHueLights } from "../lib/useHueLights";
import { TEAMS, Team, ScoreEvent } from "../lib/types";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { settings, setSettings, loaded } = useSettings();
  const [active, setActive] = useState(false);
  const [proxyOk, setProxyOk] = useState<boolean | null>(null);
  const [bridgeOk, setBridgeOk] = useState<boolean | null>(null);
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [testingTeam, setTestingTeam] = useState<Team | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [flashTeam, setFlashTeam] = useState<Team | null>(null);

  const { triggerScoreAnimation, testAnimation, pingProxy, pingBridge } = useHueLights(settings);

  const handleScore = useCallback(
    async (teamId: Team, newScore: number, prevScore: number, gameId: string) => {
      const team = TEAMS.find((t) => t.id === teamId)!;
      const event: ScoreEvent = {
        teamId,
        teamName: team.name,
        newScore,
        previousScore: prevScore,
        timestamp: Date.now(),
        gameId,
      };
      setScoreEvents((prev) => [event, ...prev].slice(0, 20));
      setFlashTeam(teamId);
      setTimeout(() => setFlashTeam(null), 3000);
      await triggerScoreAnimation(teamId);
    },
    [triggerScoreAnimation]
  );

  const { scores, lastPoll } = useScorePoller(
    settings.enabledTeams,
    settings.pollIntervalMs,
    active,
    handleScore
  );

  const checkConnections = useCallback(async () => {
    setProxyOk(null);
    setBridgeOk(null);
    const [proxy, bridge] = await Promise.all([pingProxy(), pingBridge()]);
    setProxyOk(proxy);
    setBridgeOk(bridge);
  }, [pingProxy, pingBridge]);

  useEffect(() => {
    if (loaded && settings.hueApiKey) checkConnections();
  }, [loaded, settings.hueApiKey, checkConnections]);

  const handleTest = async (teamId: Team) => {
    setTestingTeam(teamId);
    setFlashTeam(teamId);
    await testAnimation(teamId);
    setTestingTeam(null);
    setTimeout(() => setFlashTeam(null), 3000);
  };

  if (!loaded) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingDot} />
        <div className={styles.loadingDot} style={{ animationDelay: "0.15s" }} />
        <div className={styles.loadingDot} style={{ animationDelay: "0.3s" }} />
      </div>
    );
  }

  const enabledTeamConfigs = TEAMS.filter((t) => settings.enabledTeams.includes(t.id));

  return (
    <div className={styles.root}>
      {/* Background flash overlay */}
      {flashTeam && (
        <div
          className={styles.flashOverlay}
          style={{
            background: flashTeam === "braves"
              ? `radial-gradient(ellipse at center, rgba(206,17,65,0.25), transparent 70%)`
              : `radial-gradient(ellipse at center, rgba(250,70,22,0.25), transparent 70%)`,
          }}
        />
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <span className={styles.logoBulb}>💡</span>
            <span className={styles.logoText}>SportsLights</span>
          </div>
          <div className={styles.tagline}>Score-triggered Hue light shows</div>
        </div>
        <div className={styles.headerRight}>
          <button
            className={`${styles.activateBtn} ${active ? styles.activeBtnOn : ""}`}
            onClick={() => setActive((v) => !v)}
          >
            <span className={`${styles.statusDot} ${active ? styles.statusDotOn : styles.statusDotOff}`} />
            {active ? "LIVE — WATCHING" : "START WATCHING"}
          </button>
          <button className={styles.iconBtn} onClick={() => setShowSettings((v) => !v)} title="Settings">
            ⚙️
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Settings Panel */}
        {showSettings && (
          <section className={`${styles.card} ${styles.settingsCard} fade-in`}>
            <h2 className={styles.cardTitle}>⚙️ Configuration</h2>
            <div className={styles.settingsGrid}>
              <label className={styles.fieldLabel}>
                Proxy URL
                <input
                  className={styles.input}
                  value={settings.proxyUrl}
                  onChange={(e) => setSettings({ proxyUrl: e.target.value })}
                  placeholder="http://localhost:3001"
                />
              </label>
              <label className={styles.fieldLabel}>
                Hue API Key
                <input
                  className={styles.input}
                  value={settings.hueApiKey}
                  onChange={(e) => setSettings({ hueApiKey: e.target.value })}
                  placeholder="Your Hue bridge username/API key"
                  type="password"
                />
                <span className={styles.fieldHint}>
                  Run: <code>curl -X POST http://192.168.68.50/api -d &#39;&#123;"devicetype":"sportslights"&#125;&#39;</code> after pressing bridge button
                </span>
              </label>
              <label className={styles.fieldLabel}>
                Theater Room Group ID
                <input
                  className={styles.input}
                  value={settings.theaterGroupId}
                  onChange={(e) => setSettings({ theaterGroupId: e.target.value })}
                  placeholder="1"
                />
                <span className={styles.fieldHint}>Find group IDs via the Hue app or proxy /hue/api/[key]/groups</span>
              </label>
              <label className={styles.fieldLabel}>
                Light Scope
                <select
                  className={styles.select}
                  value={settings.lightScope}
                  onChange={(e) => setSettings({ lightScope: e.target.value as "theater" | "whole-house" })}
                >
                  <option value="theater">Theater Room Only</option>
                  <option value="whole-house">Whole House</option>
                </select>
              </label>
              <label className={styles.fieldLabel}>
                Poll Interval
                <select
                  className={styles.select}
                  value={settings.pollIntervalMs}
                  onChange={(e) => setSettings({ pollIntervalMs: Number(e.target.value) })}
                >
                  <option value={10000}>10 seconds</option>
                  <option value={20000}>20 seconds (recommended)</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>60 seconds</option>
                </select>
              </label>
            </div>
            <div className={styles.settingsActions}>
              <button className={styles.secondaryBtn} onClick={checkConnections}>
                🔍 Test Connections
              </button>
              <button className={styles.secondaryBtn} onClick={() => setShowSettings(false)}>
                ✓ Done
              </button>
            </div>
          </section>
        )}

        {/* Connection Status */}
        <section className={`${styles.statusBar} fade-in-delay-1`}>
          <StatusPill label="Proxy" ok={proxyOk} />
          <StatusPill label="Hue Bridge" ok={bridgeOk} />
          <StatusPill label={active ? "Polling Active" : "Polling Paused"} ok={active ? true : false} neutral={!active} />
          {lastPoll && (
            <span className={styles.lastPoll}>
              Last poll: {new Date(lastPoll).toLocaleTimeString()}
            </span>
          )}
        </section>

        {/* Teams */}
        <section className={styles.teamsSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Teams</h2>
            <div className={styles.teamToggles}>
              {TEAMS.map((team) => (
                <button
                  key={team.id}
                  className={`${styles.teamToggle} ${settings.enabledTeams.includes(team.id) ? styles.teamToggleOn : ""}`}
                  style={{
                    "--team-color": team.primaryColor,
                  } as React.CSSProperties}
                  onClick={() => {
                    setSettings((prev) => ({
                      ...prev,
                      enabledTeams: prev.enabledTeams.includes(team.id)
                        ? prev.enabledTeams.filter((id) => id !== team.id)
                        : [...prev.enabledTeams, team.id],
                    }));
                  }}
                >
                  {team.logo} {team.shortName}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.teamCards}>
            {enabledTeamConfigs.map((team) => {
              const score = scores.get(team.id);
              const isFlashing = flashTeam === team.id;
              return (
                <div
                  key={team.id}
                  className={`${styles.teamCard} ${isFlashing ? styles.teamCardFlashing : ""}`}
                  style={{
                    "--team-primary": team.primaryColor,
                    "--team-secondary": team.secondaryColor,
                  } as React.CSSProperties}
                >
                  <div className={styles.teamCardHeader}>
                    <span className={styles.teamLogo}>{team.logo}</span>
                    <div>
                      <div className={styles.teamName}>{team.name}</div>
                      <div className={styles.teamSport}>{team.sport.toUpperCase()}</div>
                    </div>
                    {score?.status === "in" && (
                      <span className={styles.liveBadge}>● LIVE</span>
                    )}
                  </div>

                  {score ? (
                    <div className={styles.scoreBlock}>
                      <div className={styles.scoreRow}>
                        <span className={styles.scoreTeam}>{score.awayTeam}</span>
                        <span className={styles.scoreValue}>{score.awayScore}</span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span className={styles.scoreTeam}>{score.homeTeam}</span>
                        <span className={styles.scoreValue}>{score.homeScore}</span>
                      </div>
                      <div className={styles.scoreStatus}>
                        {score.status === "in" ? `${score.clock} · Period ${score.period}` : score.status === "post" ? "Final" : "Scheduled"}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noGame}>
                      {active ? "No game found today" : "Start watching to load scores"}
                    </div>
                  )}

                  <div className={styles.colorSequence}>
                    {team.sequence.slice(0, 4).map((color, i) => (
                      <span key={i} className={styles.colorDot} style={{ background: color }} title={color} />
                    ))}
                    <span className={styles.sequenceLabel}>flash sequence</span>
                  </div>

                  <button
                    className={styles.testBtn}
                    style={{ "--team-primary": team.primaryColor } as React.CSSProperties}
                    onClick={() => handleTest(team.id)}
                    disabled={testingTeam !== null || !settings.hueApiKey}
                  >
                    {testingTeam === team.id ? "🌈 Firing..." : "⚡ Test Light Show"}
                  </button>
                </div>
              );
            })}

            {enabledTeamConfigs.length === 0 && (
              <div className={styles.emptyState}>
                Enable at least one team above to get started.
              </div>
            )}
          </div>
        </section>

        {/* Score Event Log */}
        {scoreEvents.length > 0 && (
          <section className={`${styles.card} fade-in`}>
            <h2 className={styles.cardTitle}>📋 Score Event Log</h2>
            <div className={styles.eventLog}>
              {scoreEvents.map((event, i) => {
                const team = TEAMS.find((t) => t.id === event.teamId)!;
                return (
                  <div key={`${event.gameId}-${event.timestamp}`} className={styles.eventRow} style={{ opacity: 1 - i * 0.04 }}>
                    <span className={styles.eventDot} style={{ background: team.primaryColor }} />
                    <span className={styles.eventTeam}>{team.logo} {team.shortName}</span>
                    <span className={styles.eventScore}>
                      {event.previousScore} → <strong>{event.newScore}</strong>
                    </span>
                    <span className={styles.eventTime}>{new Date(event.timestamp).toLocaleTimeString()}</span>
                    <span className={styles.eventAction}>💡 Light show fired</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Setup Guide */}
        <section className={`${styles.card} ${styles.setupCard} fade-in-delay-3`}>
          <h2 className={styles.cardTitle}>🚀 Quick Setup</h2>
          <div className={styles.setupSteps}>
            <SetupStep n={1} title="Run the proxy" done={proxyOk === true}>
              <code>node sportslights-proxy.js</code> in your terminal (keep it running)
            </SetupStep>
            <SetupStep n={2} title="Get your Hue API key" done={!!settings.hueApiKey}>
              Press the button on your Hue bridge, then run the curl command in Settings
            </SetupStep>
            <SetupStep n={3} title="Find your theater room group ID" done={!!settings.theaterGroupId}>
              Visit <code>{settings.proxyUrl}/hue/api/{settings.hueApiKey || "[key]"}/groups</code> after proxy is running
            </SetupStep>
            <SetupStep n={4} title="Enable your teams and hit Start" done={active}>
              Toggle teams above and press <strong>START WATCHING</strong>
            </SetupStep>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        SportsLights · Philips Hue local API + ESPN live scores · No cloud required
      </footer>
    </div>
  );
}

function StatusPill({ label, ok, neutral }: { label: string; ok: boolean | null; neutral?: boolean }) {
  const color = neutral ? "#8899aa" : ok === null ? "#8899aa" : ok ? "#4ade80" : "#f87171";
  const bg = neutral ? "rgba(136,153,170,0.1)" : ok === null ? "rgba(136,153,170,0.1)" : ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
      borderRadius: 20, background: bg, border: `1px solid ${color}30`,
      fontSize: 12, fontWeight: 500, color,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function SetupStep({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{
        minWidth: 24, height: 24, borderRadius: "50%",
        background: done ? "#4ade80" : "rgba(255,255,255,0.1)",
        color: done ? "#000" : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, fontFamily: "'Bebas Neue', sans-serif",
      }}>{done ? "✓" : n}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 13, color: "#8899aa" }}>{children}</div>
      </div>
    </div>
  );
}
