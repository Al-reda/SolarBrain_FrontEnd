# SolarBrain Frontend ☀️🔋

**React 18 + TypeScript + Vite 5** UI for the SolarBrain hybrid energy
management system — Layer 1 (Designer) for sizing a PV + battery + optional
generator system, and Layer 2 (Simulation) for watching the 7-mode brain run
live over a year of synthetic Saudi-Arabian climate data.

> The companion backend lives at
> [Al-reda/SolarBrain_Backend](https://github.com/Al-reda/SolarBrain_Backend).
> That API must be running on `localhost:5099` for the UI to have anything to
> talk to.

---

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

By default the UI expects the backend at `http://localhost:5099`. To point at
a different URL, set `VITE_API_BASE_URL` in a `.env.local`:

```
VITE_API_BASE_URL=http://127.0.0.1:8080
```

---

## Project layout

```
src/
├── main.tsx, App.tsx               Root + lazy-loaded view switcher
├── index.css                       Brand palette + all component styles
├── types/api.ts                    Every backend DTO as TS types
├── api/client.ts                   13 typed Axios functions
├── store/
│   ├── AppContext.tsx              <AppProvider> + useApp() hook
│   ├── AppContext.types.ts         State shape, actions, defaults
│   └── appReducer.ts               Pure reducer (unit-testable)
├── hooks/useSimPolling.ts          1 Hz polling for Layer 2
├── views/
│   ├── DesignView.tsx              Layer 1 root (8 sections)
│   └── SimulationView.tsx          Layer 2 root (lazy-loaded)
└── components/
    ├── DesignForm.tsx              Dynamic form (facility/farm/residential)
    ├── ComponentCards.tsx          Panel/Inverter/Battery recommendations
    ├── SystemDiagram.tsx           Static single-line diagram (React Flow)
    ├── Kpis.tsx                    Financial summary + CAPEX
    ├── RoiChart.tsx                10-year cumulative savings (Recharts)
    ├── SimKpis.tsx                 6 live KPI cards + mode chip
    ├── EnergyFlow.tsx              Live animated diagram
    ├── HistoryChart.tsx            24h stacked area + SOC (Recharts)
    ├── TimeContext.tsx             Timestamp + season + progress bar
    ├── DecisionLog.tsx             Last 10 mode transitions
    ├── PlaybackControls.tsx        Play/Pause/Speed/Reset
    └── ScenarioPanel.tsx           Grid-outage / cloud / load-spike / ...
```

---

## Tech stack

| Layer         | Tech                 | Version |
|---------------|----------------------|---------|
| Runtime       | React                | 18.3.1  |
| Language      | TypeScript           | 5.5.3   |
| Build         | Vite                 | 5.4     |
| HTTP          | Axios                | 1.15    |
| Charts        | Recharts             | 3.8     |
| Graphs        | React Flow           | 11.11   |
| Linting       | ESLint               | 9.8     |

---

## Scripts

```bash
npm run dev        # Vite dev server on :5173 with HMR
npm run build      # Production build → dist/ (tsc + vite)
npm run preview    # Preview the production build locally
npm run lint       # ESLint
```

---

## UX flow

1. **Layer 1 — Designer** (the page that loads first)
   Fill in the facility profile, click *Generate System Design*.
   ~1s later you get ranked top-3 panels/inverters/batteries, a single-line
   diagram, CAPEX breakdown, 10-year ROI chart with break-even highlight.

2. **Layer 2 — Simulation**
   Press ▶ **Play** to start the 1 Hz stream. Watch the 7 modes switch in
   real time, 24h stacked-area chart builds up, decision log populates.
   Hit scenario buttons (Grid outage, Cloud cover, Load spike, Low battery)
   to stress-test the brain live.

---

## License

Internal hackathon / demo project.
