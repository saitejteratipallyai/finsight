// Simulated market data for dashboard
export function generateMarketData() {
  return DEFAULT_WATCHLIST_TICKERS;
}

export const DEFAULT_WATCHLIST_TICKERS = [
  { symbol: 'SPY', name: 'S&P 500 ETF', price: 582.34, change: 1.23, changePct: 0.21, volume: '89.2M', sector: 'Broad Market' },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', price: 498.76, change: -2.15, changePct: -0.43, volume: '52.1M', sector: 'Tech' },
  { symbol: 'NVDA', name: 'NVIDIA Corp', price: 892.45, change: 12.30, changePct: 1.40, volume: '45.3M', sector: 'Semiconductors' },
  { symbol: 'AAPL', name: 'Apple Inc', price: 198.50, change: -1.20, changePct: -0.60, volume: '38.7M', sector: 'Tech' },
  { symbol: 'MSFT', name: 'Microsoft Corp', price: 425.80, change: 3.45, changePct: 0.82, volume: '22.1M', sector: 'Tech' },
  { symbol: 'GOOGL', name: 'Alphabet Inc', price: 175.20, change: 0.85, changePct: 0.49, volume: '28.4M', sector: 'Tech' },
  { symbol: 'TSLA', name: 'Tesla Inc', price: 245.30, change: -8.90, changePct: -3.50, volume: '112.5M', sector: 'EV/Auto' },
  { symbol: 'BTC-USD', name: 'Bitcoin', price: 97250.00, change: 2150.00, changePct: 2.26, volume: '42.8B', sector: 'Crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', price: 3420.50, change: -45.20, changePct: -1.30, volume: '18.2B', sector: 'Crypto' },
  { symbol: 'SOL-USD', name: 'Solana', price: 178.30, change: 8.50, changePct: 5.00, volume: '4.1B', sector: 'Crypto' },
  { symbol: 'GLD', name: 'Gold ETF', price: 245.80, change: 1.90, changePct: 0.78, volume: '12.3M', sector: 'Commodities' },
  { symbol: 'TLT', name: '20+ Year Treasury', price: 92.40, change: -0.35, changePct: -0.38, volume: '28.9M', sector: 'Bonds' },
];

export const ALL_KNOWN_TICKERS = [
  ...DEFAULT_WATCHLIST_TICKERS,
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 162.50, change: 1.95, changePct: 1.2, volume: '58.3M', sector: 'Semiconductors' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', price: 185.30, change: 1.48, changePct: 0.8, volume: '35.6M', sector: 'Tech' },
  { symbol: 'META', name: 'Meta Platforms Inc', price: 505.20, change: -1.52, changePct: -0.3, volume: '18.9M', sector: 'Tech' },
  { symbol: 'NFLX', name: 'Netflix Inc', price: 628.40, change: 9.43, changePct: 1.5, volume: '8.2M', sector: 'Tech' },
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 198.70, change: 0.79, changePct: 0.4, volume: '11.4M', sector: 'Financials' },
  { symbol: 'V', name: 'Visa Inc', price: 278.90, change: 0.56, changePct: 0.2, volume: '7.8M', sector: 'Financials' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp', price: 118.40, change: -0.59, changePct: -0.5, volume: '15.2M', sector: 'Energy' },
  { symbol: 'UNH', name: 'UnitedHealth Group', price: 542.10, change: 3.79, changePct: 0.7, volume: '4.1M', sector: 'Healthcare' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', price: 0.162, change: 0.005, changePct: 3.2, volume: '1.8B', sector: 'Crypto' },
  { symbol: 'XRP-USD', name: 'Ripple', price: 0.628, change: 0.013, changePct: 2.1, volume: '2.4B', sector: 'Crypto' },
  { symbol: 'AVAX-USD', name: 'Avalanche', price: 38.20, change: 1.72, changePct: 4.5, volume: '890M', sector: 'Crypto' },
  { symbol: 'COIN', name: 'Coinbase Global', price: 225.60, change: 6.32, changePct: 2.8, volume: '12.5M', sector: 'Crypto' },
  { symbol: 'PLTR', name: 'Palantir Technologies', price: 22.40, change: 0.43, changePct: 1.9, volume: '42.1M', sector: 'Tech' },
  { symbol: 'BA', name: 'Boeing Co', price: 178.30, change: -2.14, changePct: -1.2, volume: '6.8M', sector: 'Industrials' },
  { symbol: 'DIS', name: 'Walt Disney Co', price: 112.80, change: 0.34, changePct: 0.3, volume: '9.5M', sector: 'Entertainment' },
  { symbol: 'CRM', name: 'Salesforce Inc', price: 268.50, change: 1.61, changePct: 0.6, volume: '5.7M', sector: 'Tech' },
  { symbol: 'INTC', name: 'Intel Corp', price: 31.20, change: -0.66, changePct: -2.1, volume: '34.2M', sector: 'Semiconductors' },
];

export function generatePriceHistory(days = 90) {
  const data = [];
  let price = 100;
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const change = (Math.random() - 0.48) * 3;
    price = Math.max(60, price + change);

    const sma20 = i > 20 ? price + (Math.random() - 0.5) * 5 : null;
    const sma50 = i > 50 ? price + (Math.random() - 0.5) * 8 : null;
    const rsi = Math.max(10, Math.min(90, 50 + (Math.random() - 0.5) * 40));
    const macd = (Math.random() - 0.5) * 4;
    const signal = macd + (Math.random() - 0.5) * 1;
    const volume = Math.round(1000000 + Math.random() * 5000000);

    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100,
      open: Math.round((price + (Math.random() - 0.5) * 2) * 100) / 100,
      high: Math.round((price + Math.random() * 3) * 100) / 100,
      low: Math.round((price - Math.random() * 3) * 100) / 100,
      close: Math.round(price * 100) / 100,
      volume,
      sma20: sma20 ? Math.round(sma20 * 100) / 100 : null,
      sma50: sma50 ? Math.round(sma50 * 100) / 100 : null,
      rsi: Math.round(rsi * 10) / 10,
      macd: Math.round(macd * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round((macd - signal) * 100) / 100,
      upperBB: Math.round((price + 6) * 100) / 100,
      lowerBB: Math.round((price - 6) * 100) / 100,
    });
  }

  return data;
}

export const SEED_EVENTS = [
  'Fed signals potential rate cut at next meeting after inflation cools to 2.4%',
  'NVIDIA reports record $40B quarterly revenue, AI demand accelerating',
  'Bitcoin surges past $100K as institutional adoption hits new highs',
  'US imposes sweeping new tariffs on Chinese tech imports',
  'Major regional bank collapses, triggering contagion fears',
  'Inflation re-accelerates to 3.8%, rate cut expectations evaporate',
  'AI spending bubble? Tech giants spend $200B on GPU infrastructure with unclear ROI',
  'China announces surprise $3 trillion stimulus as property crisis deepens',
  'Oil spikes 25% after major Middle East supply disruption',
  'S&P 500 enters correction territory, down 12% from all-time highs',
  'Tesla unveils fully autonomous robotaxi fleet, stock surges 30%',
  'Japan raises rates for first time in 17 years, global carry trade unwinds',
  'US debt hits $36 trillion, Moody\'s puts rating on negative watch',
  'Surprise merger: Apple acquires OpenAI for $300B',
  'Retail investor mania: meme stocks surge 500% in a week',
];

export const SHOCK_EVENTS = [
  'Nvidia misses earnings by 15%, guides down significantly',
  'Surprise 50bps rate cut announced by the Federal Reserve',
  'China invades Taiwan — semiconductor supply chain in jeopardy',
  'Major US bank fails — contagion fears spread',
  'Bitcoin flash crashes 30% on exchange insolvency rumors',
  'Russia-NATO tensions escalate to direct military confrontation',
  'US CPI spikes to 6% — stagflation fears materialize',
  'AI bubble bursts — major tech stocks down 20% in a week',
  'Oil hits $150/barrel on Middle East supply disruption',
  'Federal Reserve announces emergency rate hike of 75bps',
  'Massive crypto exchange hack — $10B stolen',
  'US enters technical recession — two consecutive negative GDP prints',
];
