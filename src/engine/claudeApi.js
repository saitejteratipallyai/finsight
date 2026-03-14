// Claude API integration — calls the backend proxy server + live data
const API_BASE = 'http://localhost:3001/api';

// Get API key from localStorage
export function getApiKey() {
  return localStorage.getItem('finsight_api_key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('finsight_api_key', key);
}

export function clearApiKey() {
  localStorage.removeItem('finsight_api_key');
}

export function isClaudeEnabled() {
  return !!getApiKey();
}

// Validate API key
export async function validateApiKey(key) {
  try {
    const res = await fetch(`${API_BASE}/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key }),
    });
    const data = await res.json();
    return data.valid;
  } catch {
    return false;
  }
}

// Run a simulation round using Claude (with live data + web search)
export async function runClaudeSimulation(event, priorRound, roundNum, model, ticker, liveContext) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('No API key configured');

  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey,
      event,
      priorRound,
      roundNum,
      model: model || 'claude-haiku-4-5-20251001',
      ticker,
      liveContext,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Simulation failed');
  }

  return res.json();
}

// Fetch live market context (stock data, news, indicators)
export async function fetchMarketContext(ticker, query) {
  try {
    const params = new URLSearchParams();
    if (ticker) params.set('ticker', ticker);
    if (query) params.set('query', query);
    const res = await fetch(`${API_BASE}/market-context?${params}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Fetch comprehensive market data with technical indicators (for deterministic mode)
export async function fetchFullMarketData(symbol) {
  try {
    const res = await fetch(`${API_BASE}/market-data-full?symbol=${encodeURIComponent(symbol)}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Check if backend server is running
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
