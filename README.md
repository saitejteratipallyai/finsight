# FinSight - Multi-Agent Market Intelligence Platform

A real-time financial simulation platform where 12 AI agents with distinct investment philosophies debate market events, generate trade ideas, and produce consensus reports.

![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-cyan)

## Features

- **War Room Simulation** - 12 specialized AI agents (macro bull, doom bear, quant algo, crypto maximalist, etc.) debate seed events in multi-round discussions with live activity feeds
- **Dynamic Shock Injection** - Inject custom or preset market shocks mid-simulation and watch agents react in real-time with staggered responses
- **Interactive Dashboard** - Market watchlist with add/delete functionality, real-time stat cards, technical charts (RSI, MACD, Bollinger Bands), and market sentiment tracking
- **Consensus Reports** - Auto-generated PDF-style reports with agent vote tallies, trade ideas, risk assessments, and data source citations
- **Agent Profiles** - Detailed agent cards showing personality, bias, expertise, and historical performance
- **Deterministic + AI Modes** - Run simulations offline with seeded randomness or connect to Claude API for live AI-generated debates

## Architecture

```
src/
  pages/          Dashboard, Simulation, Report, Agents
  engine/         simulation.js (deterministic), claudeApi.js (AI), agents.js (12 agent configs)
  data/           marketData.js (ticker pools, price history, seed/shock events)
  components/     Sidebar, TickerSearch, AgentCard, SentimentGauge, Settings
server.js         Express proxy for Anthropic Claude API
```

## Tech Stack

- **Frontend**: React 19, React Router 7, Recharts, Lucide Icons
- **Styling**: TailwindCSS v4 with `@tailwindcss/vite` plugin
- **Backend**: Express.js proxy server for Claude API
- **Build**: Vite 8
- **AI**: Anthropic Claude API (optional, works fully offline in deterministic mode)

## Getting Started

```bash
# Install dependencies
npm install

# Run in deterministic mode (no API key needed)
npm run dev

# Or run with AI mode (requires Anthropic API key)
echo "ANTHROPIC_API_KEY=your_key_here" > .env
npm run dev
```

The app runs on `http://localhost:5173` with the API proxy on port `3001`.

## Agents

| Agent | Role | Bias |
|-------|------|------|
| Marcus Bull | Macro Strategist | Bullish |
| Diana Bear | Risk Analyst | Bearish |
| Quinn Algo | Quantitative Analyst | Data-driven |
| Max Chain | Crypto & DeFi Specialist | Crypto bull |
| Tara Growth | Tech & Growth Analyst | Growth |
| Victor Value | Value Investor | Contrarian |
| Fiona Fed | Central Bank & Rates Analyst | Policy-focused |
| Geo Stratton | Geopolitical Risk Analyst | Risk-aware |
| Riley Retail | Retail Sentiment Tracker | Sentiment |
| Irene Yield | Income & Dividend Analyst | Yield-focused |
| Elena Emerging | Emerging Markets Specialist | EM-focused |
| Vince Vol | Volatility & Options Strategist | Vol-focused |

## License

MIT
