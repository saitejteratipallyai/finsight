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
  // Mega-cap Tech
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 162.50, change: 1.95, changePct: 1.2, volume: '58.3M', sector: 'Semiconductors' },
  { symbol: 'AMZN', name: 'Amazon.com Inc', price: 185.30, change: 1.48, changePct: 0.8, volume: '35.6M', sector: 'Tech' },
  { symbol: 'META', name: 'Meta Platforms Inc', price: 505.20, change: -1.52, changePct: -0.3, volume: '18.9M', sector: 'Tech' },
  { symbol: 'NFLX', name: 'Netflix Inc', price: 628.40, change: 9.43, changePct: 1.5, volume: '8.2M', sector: 'Tech' },
  { symbol: 'CRM', name: 'Salesforce Inc', price: 268.50, change: 1.61, changePct: 0.6, volume: '5.7M', sector: 'Tech' },
  { symbol: 'ORCL', name: 'Oracle Corp', price: 125.40, change: 0.88, changePct: 0.7, volume: '8.9M', sector: 'Tech' },
  { symbol: 'ADBE', name: 'Adobe Inc', price: 478.30, change: 3.35, changePct: 0.7, volume: '3.8M', sector: 'Tech' },
  { symbol: 'INTC', name: 'Intel Corp', price: 31.20, change: -0.66, changePct: -2.1, volume: '34.2M', sector: 'Semiconductors' },
  { symbol: 'IBM', name: 'IBM Corp', price: 188.70, change: 0.57, changePct: 0.3, volume: '4.2M', sector: 'Tech' },
  { symbol: 'PLTR', name: 'Palantir Technologies', price: 22.40, change: 0.43, changePct: 1.9, volume: '42.1M', sector: 'Tech' },
  { symbol: 'SMCI', name: 'Super Micro Computer', price: 42.60, change: -1.28, changePct: -2.9, volume: '31.2M', sector: 'Tech' },
  { symbol: 'NOW', name: 'ServiceNow Inc', price: 785.20, change: 5.50, changePct: 0.7, volume: '1.8M', sector: 'Tech' },
  { symbol: 'SNOW', name: 'Snowflake Inc', price: 162.40, change: 2.11, changePct: 1.3, volume: '4.5M', sector: 'Tech' },
  { symbol: 'SHOP', name: 'Shopify Inc', price: 78.30, change: 1.17, changePct: 1.5, volume: '12.3M', sector: 'Tech' },
  { symbol: 'UBER', name: 'Uber Technologies', price: 72.50, change: 0.58, changePct: 0.8, volume: '15.8M', sector: 'Tech' },
  { symbol: 'SQ', name: 'Block Inc', price: 72.40, change: 1.81, changePct: 2.5, volume: '9.3M', sector: 'FinTech' },
  { symbol: 'PYPL', name: 'PayPal Holdings', price: 62.80, change: 0.38, changePct: 0.6, volume: '11.2M', sector: 'FinTech' },
  // Semiconductors
  { symbol: 'ARM', name: 'Arm Holdings', price: 148.30, change: 3.71, changePct: 2.6, volume: '5.4M', sector: 'Semiconductors' },
  { symbol: 'AVGO', name: 'Broadcom Inc', price: 1380.50, change: 11.04, changePct: 0.8, volume: '3.2M', sector: 'Semiconductors' },
  { symbol: 'QCOM', name: 'Qualcomm Inc', price: 168.90, change: 1.35, changePct: 0.8, volume: '6.7M', sector: 'Semiconductors' },
  { symbol: 'MU', name: 'Micron Technology', price: 92.40, change: 1.85, changePct: 2.0, volume: '18.3M', sector: 'Semiconductors' },
  { symbol: 'MRVL', name: 'Marvell Technology', price: 72.30, change: 1.08, changePct: 1.5, volume: '8.9M', sector: 'Semiconductors' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor', price: 142.80, change: 2.14, changePct: 1.5, volume: '14.5M', sector: 'Semiconductors' },
  { symbol: 'ASML', name: 'ASML Holding', price: 925.40, change: 7.40, changePct: 0.8, volume: '1.5M', sector: 'Semiconductors' },
  { symbol: 'LRCX', name: 'Lam Research', price: 935.20, change: 6.55, changePct: 0.7, volume: '1.2M', sector: 'Semiconductors' },
  { symbol: 'KLAC', name: 'KLA Corp', price: 715.60, change: 5.01, changePct: 0.7, volume: '0.9M', sector: 'Semiconductors' },
  { symbol: 'ON', name: 'ON Semiconductor', price: 68.30, change: 0.82, changePct: 1.2, volume: '7.5M', sector: 'Semiconductors' },
  // Financials
  { symbol: 'JPM', name: 'JPMorgan Chase', price: 198.70, change: 0.79, changePct: 0.4, volume: '11.4M', sector: 'Financials' },
  { symbol: 'V', name: 'Visa Inc', price: 278.90, change: 0.56, changePct: 0.2, volume: '7.8M', sector: 'Financials' },
  { symbol: 'MA', name: 'Mastercard Inc', price: 458.30, change: 1.37, changePct: 0.3, volume: '3.2M', sector: 'Financials' },
  { symbol: 'BAC', name: 'Bank of America', price: 35.40, change: 0.18, changePct: 0.5, volume: '32.8M', sector: 'Financials' },
  { symbol: 'GS', name: 'Goldman Sachs', price: 425.60, change: 2.13, changePct: 0.5, volume: '2.8M', sector: 'Financials' },
  { symbol: 'MS', name: 'Morgan Stanley', price: 92.30, change: 0.46, changePct: 0.5, volume: '8.4M', sector: 'Financials' },
  { symbol: 'WFC', name: 'Wells Fargo', price: 52.40, change: 0.26, changePct: 0.5, volume: '18.6M', sector: 'Financials' },
  { symbol: 'C', name: 'Citigroup Inc', price: 58.70, change: 0.29, changePct: 0.5, volume: '14.3M', sector: 'Financials' },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway B', price: 412.50, change: 1.65, changePct: 0.4, volume: '3.5M', sector: 'Financials' },
  { symbol: 'SCHW', name: 'Charles Schwab', price: 72.80, change: 0.44, changePct: 0.6, volume: '7.2M', sector: 'Financials' },
  // Healthcare & Biotech
  { symbol: 'UNH', name: 'UnitedHealth Group', price: 542.10, change: 3.79, changePct: 0.7, volume: '4.1M', sector: 'Healthcare' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', price: 158.40, change: 0.48, changePct: 0.3, volume: '7.2M', sector: 'Healthcare' },
  { symbol: 'LLY', name: 'Eli Lilly & Co', price: 782.30, change: 5.47, changePct: 0.7, volume: '3.2M', sector: 'Pharma' },
  { symbol: 'PFE', name: 'Pfizer Inc', price: 28.90, change: -0.14, changePct: -0.5, volume: '22.5M', sector: 'Pharma' },
  { symbol: 'ABBV', name: 'AbbVie Inc', price: 168.50, change: 0.84, changePct: 0.5, volume: '5.8M', sector: 'Pharma' },
  { symbol: 'MRK', name: 'Merck & Co', price: 125.80, change: 0.63, changePct: 0.5, volume: '8.4M', sector: 'Pharma' },
  { symbol: 'MRNA', name: 'Moderna Inc', price: 98.60, change: -2.30, changePct: -2.3, volume: '8.5M', sector: 'Biotech' },
  { symbol: 'CRSP', name: 'CRISPR Therapeutics', price: 52.80, change: 1.74, changePct: 3.4, volume: '2.8M', sector: 'Biotech' },
  { symbol: 'ISRG', name: 'Intuitive Surgical', price: 398.20, change: 2.79, changePct: 0.7, volume: '1.8M', sector: 'Healthcare' },
  { symbol: 'TMO', name: 'Thermo Fisher', price: 568.30, change: 2.84, changePct: 0.5, volume: '1.4M', sector: 'Healthcare' },
  { symbol: 'REGN', name: 'Regeneron Pharma', price: 882.40, change: 4.41, changePct: 0.5, volume: '0.8M', sector: 'Biotech' },
  { symbol: 'BIIB', name: 'Biogen Inc', price: 228.50, change: -1.14, changePct: -0.5, volume: '1.2M', sector: 'Biotech' },
  // Consumer & Retail
  { symbol: 'COST', name: 'Costco Wholesale', price: 735.20, change: 2.94, changePct: 0.4, volume: '2.1M', sector: 'Retail' },
  { symbol: 'WMT', name: 'Walmart Inc', price: 168.50, change: 0.67, changePct: 0.4, volume: '6.8M', sector: 'Retail' },
  { symbol: 'TGT', name: 'Target Corp', price: 142.80, change: -0.71, changePct: -0.5, volume: '4.8M', sector: 'Retail' },
  { symbol: 'HD', name: 'Home Depot', price: 348.70, change: 1.74, changePct: 0.5, volume: '4.2M', sector: 'Retail' },
  { symbol: 'LOW', name: "Lowe's Companies", price: 228.40, change: 0.91, changePct: 0.4, volume: '3.5M', sector: 'Retail' },
  { symbol: 'NKE', name: 'Nike Inc', price: 98.20, change: -0.49, changePct: -0.5, volume: '8.6M', sector: 'Consumer' },
  { symbol: 'SBUX', name: 'Starbucks Corp', price: 92.40, change: 0.28, changePct: 0.3, volume: '6.8M', sector: 'Consumer' },
  { symbol: 'MCD', name: "McDonald's Corp", price: 285.30, change: 0.86, changePct: 0.3, volume: '3.5M', sector: 'Consumer' },
  { symbol: 'PG', name: 'Procter & Gamble', price: 162.50, change: 0.33, changePct: 0.2, volume: '5.8M', sector: 'Consumer Staples' },
  { symbol: 'KO', name: 'Coca-Cola Co', price: 62.40, change: 0.12, changePct: 0.2, volume: '12.8M', sector: 'Consumer Staples' },
  { symbol: 'PEP', name: 'PepsiCo Inc', price: 172.80, change: 0.35, changePct: 0.2, volume: '4.5M', sector: 'Consumer Staples' },
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil Corp', price: 118.40, change: -0.59, changePct: -0.5, volume: '15.2M', sector: 'Energy' },
  { symbol: 'CVX', name: 'Chevron Corp', price: 162.30, change: -0.81, changePct: -0.5, volume: '7.5M', sector: 'Energy' },
  { symbol: 'COP', name: 'ConocoPhillips', price: 118.50, change: -0.59, changePct: -0.5, volume: '5.2M', sector: 'Energy' },
  { symbol: 'SLB', name: 'Schlumberger', price: 52.40, change: -0.26, changePct: -0.5, volume: '8.8M', sector: 'Energy' },
  { symbol: 'OXY', name: 'Occidental Petroleum', price: 62.80, change: -0.31, changePct: -0.5, volume: '12.4M', sector: 'Energy' },
  { symbol: 'FSLR', name: 'First Solar Inc', price: 178.30, change: 2.68, changePct: 1.5, volume: '2.8M', sector: 'Clean Energy' },
  { symbol: 'ENPH', name: 'Enphase Energy', price: 118.40, change: 1.78, changePct: 1.5, volume: '4.2M', sector: 'Clean Energy' },
  // Industrials & Defense
  { symbol: 'BA', name: 'Boeing Co', price: 178.30, change: -2.14, changePct: -1.2, volume: '6.8M', sector: 'Industrials' },
  { symbol: 'CAT', name: 'Caterpillar Inc', price: 325.40, change: 1.63, changePct: 0.5, volume: '3.5M', sector: 'Industrials' },
  { symbol: 'LMT', name: 'Lockheed Martin', price: 468.30, change: 2.34, changePct: 0.5, volume: '1.8M', sector: 'Defense' },
  { symbol: 'RTX', name: 'RTX Corp', price: 92.40, change: 0.46, changePct: 0.5, volume: '5.2M', sector: 'Defense' },
  { symbol: 'NOC', name: 'Northrop Grumman', price: 478.50, change: 2.39, changePct: 0.5, volume: '0.9M', sector: 'Defense' },
  { symbol: 'GE', name: 'GE Aerospace', price: 158.30, change: 0.95, changePct: 0.6, volume: '5.8M', sector: 'Industrials' },
  { symbol: 'HON', name: 'Honeywell Intl', price: 198.40, change: 0.59, changePct: 0.3, volume: '3.2M', sector: 'Industrials' },
  { symbol: 'UPS', name: 'United Parcel Service', price: 148.30, change: 0.45, changePct: 0.3, volume: '3.8M', sector: 'Industrials' },
  { symbol: 'DE', name: 'Deere & Company', price: 398.50, change: 1.99, changePct: 0.5, volume: '1.5M', sector: 'Industrials' },
  // Communications & Media
  { symbol: 'DIS', name: 'Walt Disney Co', price: 112.80, change: 0.34, changePct: 0.3, volume: '9.5M', sector: 'Entertainment' },
  { symbol: 'CMCSA', name: 'Comcast Corp', price: 42.30, change: 0.13, changePct: 0.3, volume: '18.5M', sector: 'Communications' },
  { symbol: 'T', name: 'AT&T Inc', price: 18.40, change: 0.05, changePct: 0.3, volume: '28.4M', sector: 'Communications' },
  { symbol: 'VZ', name: 'Verizon Communications', price: 38.50, change: 0.08, changePct: 0.2, volume: '15.8M', sector: 'Communications' },
  { symbol: 'VSAT', name: 'Viasat Inc', price: 28.40, change: 0.42, changePct: 1.5, volume: '1.2M', sector: 'Communications' },
  { symbol: 'SPOT', name: 'Spotify Technology', price: 282.40, change: 4.24, changePct: 1.5, volume: '2.1M', sector: 'Entertainment' },
  // EV & Auto
  { symbol: 'RIVN', name: 'Rivian Automotive', price: 14.80, change: -0.37, changePct: -2.4, volume: '18.7M', sector: 'EV/Auto' },
  { symbol: 'LCID', name: 'Lucid Group', price: 4.20, change: -0.08, changePct: -1.9, volume: '22.5M', sector: 'EV/Auto' },
  { symbol: 'F', name: 'Ford Motor Co', price: 12.40, change: -0.06, changePct: -0.5, volume: '42.8M', sector: 'EV/Auto' },
  { symbol: 'GM', name: 'General Motors', price: 38.50, change: 0.19, changePct: 0.5, volume: '12.5M', sector: 'EV/Auto' },
  { symbol: 'NIO', name: 'NIO Inc', price: 8.20, change: 0.25, changePct: 3.1, volume: '28.4M', sector: 'EV/Auto' },
  // REITs & Real Estate
  { symbol: 'O', name: 'Realty Income Corp', price: 52.80, change: 0.16, changePct: 0.3, volume: '5.8M', sector: 'REIT' },
  { symbol: 'AMT', name: 'American Tower', price: 198.40, change: 0.60, changePct: 0.3, volume: '2.4M', sector: 'REIT' },
  { symbol: 'PLD', name: 'Prologis Inc', price: 128.30, change: 0.38, changePct: 0.3, volume: '4.2M', sector: 'REIT' },
  { symbol: 'EQIX', name: 'Equinix Inc', price: 825.40, change: 2.48, changePct: 0.3, volume: '0.5M', sector: 'REIT' },
  // Crypto
  { symbol: 'DOGE-USD', name: 'Dogecoin', price: 0.162, change: 0.005, changePct: 3.2, volume: '1.8B', sector: 'Crypto' },
  { symbol: 'XRP-USD', name: 'Ripple', price: 0.628, change: 0.013, changePct: 2.1, volume: '2.4B', sector: 'Crypto' },
  { symbol: 'AVAX-USD', name: 'Avalanche', price: 38.20, change: 1.72, changePct: 4.5, volume: '890M', sector: 'Crypto' },
  { symbol: 'ADA-USD', name: 'Cardano', price: 0.45, change: 0.014, changePct: 3.2, volume: '620M', sector: 'Crypto' },
  { symbol: 'DOT-USD', name: 'Polkadot', price: 7.20, change: 0.22, changePct: 3.1, volume: '380M', sector: 'Crypto' },
  { symbol: 'LINK-USD', name: 'Chainlink', price: 14.20, change: 0.43, changePct: 3.1, volume: '620M', sector: 'Crypto' },
  { symbol: 'MATIC-USD', name: 'Polygon', price: 0.82, change: 0.025, changePct: 3.1, volume: '450M', sector: 'Crypto' },
  { symbol: 'UNI-USD', name: 'Uniswap', price: 8.50, change: 0.26, changePct: 3.1, volume: '180M', sector: 'Crypto' },
  { symbol: 'ATOM-USD', name: 'Cosmos', price: 9.20, change: 0.28, changePct: 3.1, volume: '240M', sector: 'Crypto' },
  { symbol: 'NEAR-USD', name: 'NEAR Protocol', price: 5.40, change: 0.16, changePct: 3.1, volume: '280M', sector: 'Crypto' },
  { symbol: 'APT-USD', name: 'Aptos', price: 9.80, change: 0.29, changePct: 3.1, volume: '180M', sector: 'Crypto' },
  { symbol: 'ARB-USD', name: 'Arbitrum', price: 1.12, change: 0.034, changePct: 3.1, volume: '320M', sector: 'Crypto' },
  { symbol: 'OP-USD', name: 'Optimism', price: 2.40, change: 0.072, changePct: 3.1, volume: '210M', sector: 'Crypto' },
  { symbol: 'COIN', name: 'Coinbase Global', price: 225.60, change: 6.32, changePct: 2.8, volume: '12.5M', sector: 'Crypto' },
  { symbol: 'MSTR', name: 'MicroStrategy', price: 1580.40, change: 47.41, changePct: 3.1, volume: '8.2M', sector: 'Crypto' },
  // ETFs
  { symbol: 'IWM', name: 'Russell 2000 ETF', price: 198.40, change: 0.99, changePct: 0.5, volume: '28.5M', sector: 'Broad Market' },
  { symbol: 'DIA', name: 'Dow Jones ETF', price: 388.50, change: 1.17, changePct: 0.3, volume: '3.8M', sector: 'Broad Market' },
  { symbol: 'VTI', name: 'Vanguard Total Market', price: 242.30, change: 0.73, changePct: 0.3, volume: '4.2M', sector: 'Broad Market' },
  { symbol: 'XLF', name: 'Financial Select SPDR', price: 38.40, change: 0.19, changePct: 0.5, volume: '32.5M', sector: 'Financials' },
  { symbol: 'XLK', name: 'Technology Select SPDR', price: 198.30, change: 1.39, changePct: 0.7, volume: '8.5M', sector: 'Tech' },
  { symbol: 'XLE', name: 'Energy Select SPDR', price: 88.40, change: -0.44, changePct: -0.5, volume: '14.2M', sector: 'Energy' },
  { symbol: 'XLV', name: 'Health Care Select SPDR', price: 142.30, change: 0.43, changePct: 0.3, volume: '8.5M', sector: 'Healthcare' },
  { symbol: 'SMH', name: 'VanEck Semiconductor', price: 245.80, change: 3.69, changePct: 1.5, volume: '12.4M', sector: 'Semiconductors' },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', price: 48.30, change: 0.72, changePct: 1.5, volume: '18.5M', sector: 'Tech' },
  { symbol: 'EEM', name: 'iShares MSCI EM', price: 42.50, change: 0.34, changePct: 0.8, volume: '28.4M', sector: 'Emerging Markets' },
  { symbol: 'SLV', name: 'iShares Silver Trust', price: 28.40, change: 0.28, changePct: 1.0, volume: '18.5M', sector: 'Commodities' },
  { symbol: 'USO', name: 'US Oil Fund', price: 78.30, change: -0.39, changePct: -0.5, volume: '4.8M', sector: 'Commodities' },
  { symbol: 'SCHD', name: 'Schwab US Dividend', price: 78.40, change: 0.16, changePct: 0.2, volume: '5.8M', sector: 'Dividends' },
  // Meme & Popular
  { symbol: 'GME', name: 'GameStop Corp', price: 14.80, change: 0.74, changePct: 5.3, volume: '8.5M', sector: 'Meme' },
  { symbol: 'AMC', name: 'AMC Entertainment', price: 4.80, change: 0.19, changePct: 4.1, volume: '22.4M', sector: 'Meme' },
  { symbol: 'BBBY', name: 'Bed Bath & Beyond', price: 0.12, change: -0.01, changePct: -7.7, volume: '42.5M', sector: 'Meme' },
  { symbol: 'SOFI', name: 'SoFi Technologies', price: 8.40, change: 0.21, changePct: 2.6, volume: '28.4M', sector: 'FinTech' },
  // Utilities
  { symbol: 'NEE', name: 'NextEra Energy', price: 72.40, change: 0.14, changePct: 0.2, volume: '8.5M', sector: 'Utilities' },
  { symbol: 'DUK', name: 'Duke Energy', price: 98.30, change: 0.20, changePct: 0.2, volume: '3.2M', sector: 'Utilities' },
  { symbol: 'SO', name: 'Southern Company', price: 72.80, change: 0.15, changePct: 0.2, volume: '4.5M', sector: 'Utilities' },
  // Materials
  { symbol: 'LIN', name: 'Linde PLC', price: 428.30, change: 1.28, changePct: 0.3, volume: '1.8M', sector: 'Materials' },
  { symbol: 'FCX', name: 'Freeport-McMoRan', price: 42.80, change: 0.64, changePct: 1.5, volume: '12.4M', sector: 'Materials' },
  { symbol: 'NEM', name: 'Newmont Corp', price: 42.30, change: 0.42, changePct: 1.0, volume: '8.5M', sector: 'Gold Miners' },
  { symbol: 'GOLD', name: 'Barrick Gold', price: 18.40, change: 0.18, changePct: 1.0, volume: '12.8M', sector: 'Gold Miners' },
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
