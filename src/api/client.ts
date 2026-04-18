/**
 * client.ts — typed Axios wrapper over the SolarBrain REST API.
 *
 * Every function here maps 1:1 to a backend endpoint and returns a
 * fully typed response. If the backend changes, update here + in
 * types/api.ts to keep the UI in sync.
 */

import axios from 'axios';
import type {
  DesignResponse,
  FacilityProfile,
  HealthResponse,
  HistoryEnvelope,
  NextStepEnvelope,
  ScenarioName,
  SimulationSummary,
  SummaryEnvelope,
  Season,
} from '../types/api';

const BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:5099';

const http = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Health ─────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<HealthResponse> {
  const { data } = await http.get<HealthResponse>('/api/health');
  return data;
}

// ── Layer 1 — Design ───────────────────────────────────────────────────────

/** POST /api/Design — sizing + dataset + runner priming in one call. */
export async function submitDesign(profile: FacilityProfile): Promise<DesignResponse> {
  const { data } = await http.post<DesignResponse>('/api/Design', profile);
  return data;
}

/** GET /api/Design/current — retrieve the cached design without resizing. */
export async function getCurrentDesign(): Promise<DesignResponse> {
  const { data } = await http.get<DesignResponse>('/api/Design/current');
  return data;
}

/** GET /api/Components — full catalogue (panels, inverters, batteries, …). */
export async function getComponents(): Promise<unknown> {
  const { data } = await http.get('/api/Components');
  return data;
}

// ── Layer 2 — Simulation ───────────────────────────────────────────────────

/** GET /api/Simulation/next — advance one interval. */
export async function getNextStep(): Promise<NextStepEnvelope> {
  const { data } = await http.get<NextStepEnvelope>('/api/Simulation/next');
  return data;
}

/** GET /api/Simulation/history?lastN=N — recent states for the 24h chart. */
export async function getHistory(lastN = 96): Promise<HistoryEnvelope> {
  const { data } = await http.get<HistoryEnvelope>(`/api/Simulation/history?lastN=${lastN}`);
  return data;
}

/** GET /api/Simulation/summary — cumulative KPI totals. */
export async function getSummary(): Promise<SimulationSummary> {
  const { data } = await http.get<SummaryEnvelope>('/api/Simulation/summary');
  return data.summary;
}

/** POST /api/Simulation/scenario — fire one of the 12 scenarios. */
export async function injectScenario(scenario: ScenarioName, value?: number): Promise<void> {
  await http.post('/api/Simulation/scenario', { scenario, value });
}

/** POST /api/Simulation/speed — 1, 5, 10, etc. (clamped 1–20 server-side). */
export async function setSpeed(speed: number): Promise<void> {
  await http.post('/api/Simulation/speed', { speed });
}

/** POST /api/Simulation/reset — back to the beginning. */
export async function resetSimulation(): Promise<void> {
  await http.post('/api/Simulation/reset');
}

/** POST /api/Simulation/jump/season/{season}. */
export async function jumpToSeason(season: Season): Promise<void> {
  await http.post(`/api/Simulation/jump/season/${season}`);
}

/** POST /api/Simulation/jump/hour/{hour} — hour in [0..23]. */
export async function jumpToHour(hour: number): Promise<void> {
  await http.post(`/api/Simulation/jump/hour/${hour}`);
}

export default http;
