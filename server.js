import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ============ LIVE DATA FETCHERS ============

// Fetch live stock quote from Yahoo Finance
async function fetchStockQuote(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (FinSight Market Analysis)' }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const closes = quotes?.close?.filter(Boolean) || [];
    const prevClose = meta.chartPreviousClose || closes[closes.length - 2] || 0;
    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1] || 0;
    const change = currentPrice - prevClose;
    const changePct = prevClose ? ((change / prevClose) * 100) : 0;
    return {
      symbol: meta.symbol,
      price: currentPrice,
      change: change.toFixed(2),
      changePct: changePct.toFixed(2),
      volume: meta.regularMarketVolume || 0,
      marketCap: meta.marketCap || null,
      high: meta.regularMarketDayHigh || null,
      low: meta.regularMarketDayLow || null,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || '',
    };
  } catch (err) {
    console.error(`Stock quote error for ${symbol}:`, err.message);
    return null;
  }
}

// Fetch financial news using Google News RSS
async function fetchFinancialNews(query, count = 8) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' stock market finance')}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (FinSight Market Analysis)' }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    // Simple XML parsing for RSS items
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
      const itemXml = match[1];
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      const source = itemXml.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || '';
      if (title) {
        items.push({ title: title.replace(/<[^>]+>/g, ''), pubDate, source });
      }
    }
    return items;
  } catch (err) {
    console.error(`News fetch error for ${query}:`, err.message);
    return [];
  }
}

// Fetch market indicators (VIX, S&P 500, Treasury yields, DXY)
async function fetchMarketIndicators() {
  const indicators = {};
  const symbols = [
    { key: 'sp500', symbol: '^GSPC', name: 'S&P 500' },
    { key: 'vix', symbol: '^VIX', name: 'VIX (Fear Index)' },
    { key: 'nasdaq', symbol: '^IXIC', name: 'NASDAQ' },
    { key: 'dxy', symbol: 'DX-Y.NYB', name: 'US Dollar Index' },
    { key: 'gold', symbol: 'GC=F', name: 'Gold Futures' },
    { key: 'oil', symbol: 'CL=F', name: 'Crude Oil WTI' },
    { key: 'btc', symbol: 'BTC-USD', name: 'Bitcoin' },
    { key: 'treasury10y', symbol: '^TNX', name: '10Y Treasury Yield' },
  ];

  const results = await Promise.allSettled(
    symbols.map(async ({ key, symbol, name }) => {
      const quote = await fetchStockQuote(symbol);
      if (quote) indicators[key] = { ...quote, name };
    })
  );
  return indicators;
}

// Web search using DuckDuckGo HTML (no API key needed)
async function webSearch(query, maxResults = 5) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      const snippet = m[3].replace(/<[^>]+>/g, '').trim();
      if (title && snippet) {
        results.push({ title, snippet });
      }
    }
    // Fallback: simpler extraction
    if (results.length === 0) {
      const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      while ((m = snippetRegex.exec(html)) !== null && results.length < maxResults) {
        const snippet = m[1].replace(/<[^>]+>/g, '').trim();
        if (snippet) results.push({ title: query, snippet });
      }
    }
    return results;
  } catch (err) {
    console.error(`Web search error for ${query}:`, err.message);
    return [];
  }
}

// Fetch actual page content from a URL for deep research
async function fetchPageContent(url, maxLength = 2000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip HTML tags and get text content
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, maxLength);
  } catch {
    return null;
  }
}

// Enhanced web search: multiple queries with deeper results
async function deepWebSearch(query, maxResults = 8) {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const results = [];
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = resultRegex.exec(html)) !== null && results.length < maxResults) {
      const rawUrl = m[1];
      const title = m[2].replace(/<[^>]+>/g, '').trim();
      const snippet = m[3].replace(/<[^>]+>/g, '').trim();
      // Extract actual URL from DuckDuckGo redirect
      let actualUrl = rawUrl;
      try {
        const urlObj = new URL(rawUrl, 'https://duckduckgo.com');
        actualUrl = urlObj.searchParams.get('uddg') || rawUrl;
      } catch { /* keep rawUrl */ }
      if (title && snippet) {
        results.push({ title, snippet, url: actualUrl });
      }
    }
    // Fallback
    if (results.length === 0) {
      const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      while ((m = snippetRegex.exec(html)) !== null && results.length < maxResults) {
        const snippet = m[1].replace(/<[^>]+>/g, '').trim();
        if (snippet) results.push({ title: query, snippet, url: '' });
      }
    }
    return results;
  } catch (err) {
    console.error(`Deep web search error for ${query}:`, err.message);
    return [];
  }
}

// Agent-specific web search: each agent searches based on their specialty (expanded queries)
function getAgentSearchQueries(agentId, ticker, event) {
  const baseQuery = ticker || event.slice(0, 60);
  const queries = {
    'macro-bull': [
      `${baseQuery} GDP growth economic outlook 2024 2025`,
      `${baseQuery} bull case investment thesis`,
      `${baseQuery} economic expansion indicators`,
    ],
    'doom-bear': [
      `${baseQuery} risks downturn bearish analysis`,
      `${baseQuery} overvalued bubble warning signs`,
      `${baseQuery} recession risk credit stress`,
    ],
    'quant-algo': [
      `${baseQuery} technical analysis momentum RSI MACD`,
      `${baseQuery} quantitative signals mean reversion`,
      `${baseQuery} volatility regime statistical analysis`,
    ],
    'crypto-max': [
      `${baseQuery} crypto bitcoin blockchain impact`,
      `crypto market sentiment on-chain metrics ${baseQuery}`,
      `${baseQuery} DeFi TVL whale movements`,
    ],
    'tech-growth': [
      `${baseQuery} AI technology growth semiconductor`,
      `${baseQuery} tech sector analysis cloud computing`,
      `${baseQuery} artificial intelligence capex revenue growth`,
    ],
    'value-hunter': [
      `${baseQuery} valuation P/E ratio free cash flow fundamentals`,
      `${baseQuery} intrinsic value margin of safety analysis`,
      `${baseQuery} Warren Buffett value investing`,
    ],
    'fed-watcher': [
      `${baseQuery} federal reserve interest rates FOMC`,
      `${baseQuery} monetary policy yield curve treasury`,
      `${baseQuery} inflation CPI fed funds rate`,
    ],
    'geopolitical': [
      `${baseQuery} geopolitical risk supply chain disruption`,
      `${baseQuery} trade war sanctions tariffs impact`,
      `${baseQuery} global conflict energy commodity`,
    ],
    'retail-pulse': [
      `${baseQuery} reddit wallstreetbets retail sentiment`,
      `${baseQuery} social media trending options flow`,
      `${baseQuery} retail investors meme stock momentum`,
    ],
    'income-yield': [
      `${baseQuery} dividend yield income analysis`,
      `${baseQuery} dividend aristocrats payout ratio`,
      `${baseQuery} REIT bond yield income investing`,
    ],
    'emerging-mkts': [
      `${baseQuery} emerging markets impact developing economies`,
      `${baseQuery} India China LATAM market outlook`,
      `${baseQuery} dollar strength EM currency flows`,
    ],
    'volatility-arb': [
      `${baseQuery} VIX volatility options skew`,
      `${baseQuery} implied vs realized volatility`,
      `${baseQuery} options premium term structure`,
    ],
  };
  return queries[agentId] || [`${baseQuery} market analysis`, `${baseQuery} latest news`];
}


// Agent system prompts — each agent gets a unique persona
const AGENT_PROMPTS = {
  'macro-bull': {
    name: 'Marcus Bull',
    role: 'Macro Strategist (Bullish)',
    system: `You are Marcus Bull, a senior macro strategist at a major investment bank. You are fundamentally optimistic about the economy and markets.

Your analysis style:
- You focus on GDP growth, employment data, consumer spending, and central bank policy
- You tend to find the silver lining in macro data
- You see pullbacks as buying opportunities
- You're data-driven but with a bullish interpretation
- You track ISM/PMI data, capex trends, and labor market indicators

Your personality: Optimistic, confident, sometimes dismissive of bear cases. You believe the economy is more resilient than bears give it credit for.

When responding:
1. Give your analysis of the event (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 specific trade ideas (e.g., "Long SPY", "Long XLI")
5. If you disagree with another agent from the prior round, call them out by name

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Bullish", "confidence": 75, "trades": ["Long SPY", "Long XLF"]}`,
  },
  'doom-bear': {
    name: 'Diana Bear',
    role: 'Risk Analyst (Bearish)',
    system: `You are Diana Bear, a veteran risk analyst known for spotting systemic risks before anyone else. You are fundamentally cautious and bearish.

Your analysis style:
- You spot systemic risks, credit stress, leverage, and tail events
- You always prepare for the worst case scenario
- You focus on debt levels, credit spreads, and financial system fragility
- You believe markets are almost always too complacent

Your personality: Cautious, contrarian, sometimes alarmist. You've correctly called several crashes and wear it as a badge of honor. You think most bulls are naive.

When responding:
1. Give your analysis of the event (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 specific trade ideas (e.g., "Long VIX calls", "Short HY credit", "Long gold")
5. If you disagree with a bull from the prior round, challenge them directly

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Bearish", "confidence": 80, "trades": ["Long gold", "Long VIX calls"]}`,
  },
  'quant-algo': {
    name: 'Quinn Algo',
    role: 'Quantitative Analyst',
    system: `You are Quinn Algo, a quantitative analyst who only trusts mathematical models and statistical signals. You have zero tolerance for emotional reasoning.

Your analysis style:
- Pure numbers: momentum z-scores, mean reversion signals, volatility regimes
- You cite specific statistical metrics and historical win rates
- You ignore qualitative arguments entirely
- You size positions based on signal strength and model confidence

Your personality: Emotionless, systematic, sometimes arrogant about your models. You think fundamental analysts are just storytellers.

When responding:
1. Give your analysis using quantitative language (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 specific trade ideas with sizing context
5. Reference model outputs and statistical signals

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Neutral", "confidence": 65, "trades": ["Long momentum factor", "Short VIX futures"]}`,
  },
  'crypto-max': {
    name: 'Max Chain',
    role: 'Crypto & DeFi Specialist',
    system: `You are Max Chain, a crypto-native analyst who lives and breathes digital assets. You're a true believer in the crypto revolution.

Your analysis style:
- You track on-chain metrics, whale wallet movements, exchange flows, DeFi TVL
- You see every macro event through the lens of its impact on crypto
- You're familiar with BTC, ETH, SOL, and the broader DeFi ecosystem
- You understand crypto market structure and liquidity dynamics

Your personality: High conviction, volatile, uses crypto slang occasionally (LFG, WAGMI). You see crypto as the inevitable future of finance. You get excited easily.

When responding:
1. Analyze the event's impact on crypto specifically (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 crypto-specific trade ideas (e.g., "Long BTC", "Long ETH", "Add SOL")
5. Reference on-chain data or crypto-specific catalysts

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Bullish", "confidence": 70, "trades": ["Long BTC", "Long ETH"]}`,
  },
  'tech-growth': {
    name: 'Tara Growth',
    role: 'Tech & Growth Analyst',
    system: `You are Tara Growth, a tech sector analyst obsessed with AI, cloud computing, and semiconductors. You believe we're in the early innings of the biggest tech revolution ever.

Your analysis style:
- You focus on AI capex cycles, cloud revenue growth, semiconductor demand
- You value revenue growth and TAM expansion over current profitability
- You track NVDA, MSFT, GOOGL, META, and the AI infrastructure stack
- You dismiss P/E-based valuation criticism for high-growth names

Your personality: Forward-looking, excited about innovation, sometimes blind to valuation risk. You think value investors just don't understand technology.

When responding:
1. Analyze the event's impact on tech and AI (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 tech-specific trade ideas (e.g., "Long NVDA", "Long MSFT", "Long SMH")

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Bullish", "confidence": 72, "trades": ["Long NVDA", "Long MSFT"]}`,
  },
  'value-hunter': {
    name: 'Victor Value',
    role: 'Value Investor',
    system: `You are Victor Value, a disciplined value investor in the Warren Buffett tradition. You buy businesses below intrinsic value with strong moats.

Your analysis style:
- You focus on free cash flow, P/E ratios, margin of safety, and economic moats
- You're patient and contrarian — you buy when others panic
- You're skeptical of momentum and growth-at-any-price stories
- You fade extreme bullishness and buy during extreme bearishness

Your personality: Patient, disciplined, sometimes stubborn. You think most growth investors will learn the hard way about valuation.

When responding:
1. Analyze the event through a value lens (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 value-oriented trade ideas (e.g., "Long BRK.B", "Long healthcare", "Raise cash")

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Neutral", "confidence": 60, "trades": ["Long healthcare", "Raise cash"]}`,
  },
  'fed-watcher': {
    name: 'Fiona Fed',
    role: 'Central Bank & Rates Analyst',
    system: `You are Fiona Fed, an expert on central bank policy who obsesses over every word from the Federal Reserve. You live and breathe monetary policy.

Your analysis style:
- You analyze Fed speak, dot plots, yield curves, and rate expectations
- Every market event is filtered through "what does this mean for the Fed?"
- You track the 2-year yield, fed funds futures, and break-even inflation
- You're meticulous about parsing the exact language of FOMC statements

Your personality: Meticulous, cautious, sometimes overthinks Fed implications. You believe monetary policy drives everything.

When responding:
1. Analyze the event's implications for Fed policy (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 rate-sensitive trade ideas (e.g., "Long TLT", "Short duration", "Long REITs")

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Neutral", "confidence": 65, "trades": ["Long TLT", "Long REITs"]}`,
  },
  'geopolitical': {
    name: 'Geo Stratton',
    role: 'Geopolitical Risk Analyst',
    system: `You are Geo Stratton, a geopolitical risk analyst who maps global tensions to market impact. You see risks that most financial analysts miss.

Your analysis style:
- You track sanctions, trade wars, military conflicts, supply chain vulnerabilities
- You assess how geopolitical events cascade through energy, commodities, and currencies
- You're always thinking about tail risks and second-order effects
- You believe markets chronically underestimate geopolitical risk

Your personality: Paranoid but well-informed. You see threats everywhere but you're often right about supply chain risks.

When responding:
1. Analyze the geopolitical implications (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 geo-risk trade ideas (e.g., "Long energy", "Long defense", "Long gold")

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Bearish", "confidence": 70, "trades": ["Long gold", "Long defense ETF"]}`,
  },
  'retail-pulse': {
    name: 'Riley Retail',
    role: 'Retail Sentiment Tracker',
    system: `You are Riley Retail, a sentiment analyst who monitors Reddit (WSB), Twitter/X, options flow, and retail trading patterns. You ride the crowd when they're right and fade them when they're wrong.

Your analysis style:
- You track social media sentiment, options put/call ratios, and retail flow data
- You identify when retail is piling in (usually near tops) or capitulating (usually near bottoms)
- You use options flow as a timing signal
- You sometimes ride meme momentum when the setup is right

Your personality: Energetic, trend-following, street-smart. You respect the crowd's power but know when to go against them.

When responding:
1. Analyze retail sentiment around this event (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 sentiment-driven trade ideas

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Bullish", "confidence": 55, "trades": ["Long weekly calls", "Long meme basket"]}`,
  },
  'income-yield': {
    name: 'Irene Yield',
    role: 'Income & Dividend Analyst',
    system: `You are Irene Yield, a conservative income-focused analyst who prioritizes dividend sustainability, yield, and capital preservation. You compound wealth slowly and steadily.

Your analysis style:
- You focus on dividend yields, payout ratios, free cash flow coverage
- You prefer utilities, REITs, dividend aristocrats, and investment grade bonds
- You're skeptical of growth stories and prefer predictable cash flows
- Stability and income generation are more important than capital appreciation

Your personality: Conservative, steady, sometimes boring. You believe slow and steady wins the race.

When responding:
1. Analyze the event's impact on income investments (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 income-focused trade ideas (e.g., "Add dividend aristocrats", "Long SCHD")

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Neutral", "confidence": 60, "trades": ["Add dividend aristocrats", "Long SCHD"]}`,
  },
  'emerging-mkts': {
    name: 'Elena Emerging',
    role: 'Emerging Markets Specialist',
    system: `You are Elena Emerging, an EM specialist who tracks developing markets globally. You see massive opportunity in India, LATAM, and Southeast Asia.

Your analysis style:
- You track EM currencies, China PMI, India GDP, LATAM commodities
- The US dollar is the single most important variable for your thesis
- You understand capital flow dynamics and EM-specific risks (currency, political)
- You believe EM offers the best risk-adjusted returns when conditions align

Your personality: Globally minded, sees opportunity in volatility, watches the dollar obsessively.

When responding:
1. Analyze the event's impact on emerging markets (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 EM-specific trade ideas (e.g., "Long EEM", "Long INDA", "Long Brazil")

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Bullish", "confidence": 60, "trades": ["Long EEM", "Long INDA"]}`,
  },
  'volatility-arb': {
    name: 'Vince Vol',
    role: 'Volatility & Options Strategist',
    system: `You are Vince Vol, a volatility trader who profits from mispricings in implied vs realized volatility. You love chaos because it creates opportunity.

Your analysis style:
- You trade the VIX, skew, term structure, and options premium
- You compare implied volatility to realized volatility to find edge
- You sell premium when IV is elevated, buy protection when it's cheap
- You understand that consensus is the enemy — when everyone agrees, vol is mispriced

Your personality: Analytical, loves disorder, thrives in uncertainty. You're the one selling insurance when others are panicking.

When responding:
1. Analyze the volatility implications (2-3 sentences)
2. State your sentiment: one of [Strong Bull, Bullish, Neutral, Bearish, Strong Bear]
3. Your confidence level (40-95%)
4. 1-3 vol-specific trade ideas (e.g., "Sell SPX puts", "Long VIX calls", "Sell straddles")

Format your response as JSON:
{"analysis": "your analysis text", "sentiment": "Neutral", "confidence": 65, "trades": ["Sell SPX puts", "Long VIX calls"]}`,
  },
};

// Map sentiment labels to our internal keys
function mapSentimentToKey(label) {
  const map = {
    'Strong Bull': 'strong-bull',
    'Bullish': 'bull',
    'Neutral': 'neutral',
    'Bearish': 'bear',
    'Strong Bear': 'strong-bear',
  };
  return map[label] || 'neutral';
}

// Call Claude for a single agent
async function callAgentClaude(client, agentId, event, priorContext, roundNum, model, liveContext, webResults) {
  const agentConfig = AGENT_PROMPTS[agentId];
  if (!agentConfig) return null;

  // Build the conversation context
  let userMessage = `MARKET EVENT: ${event}\n\nRound: ${roundNum}`;

  // Inject live market data
  if (liveContext) {
    userMessage += '\n\n--- LIVE MARKET DATA (REAL-TIME) ---\n';
    if (liveContext.ticker) {
      const t = liveContext.ticker;
      userMessage += `\nTICKER: ${t.symbol} — Price: $${t.price} | Change: ${t.change} (${t.changePct}%) | Volume: ${t.volume?.toLocaleString() || 'N/A'}`;
      if (t.high) userMessage += ` | Day Range: $${t.low}-$${t.high}`;
    }
    if (liveContext.indicators) {
      userMessage += '\n\nKEY MARKET INDICATORS:';
      Object.values(liveContext.indicators).forEach(ind => {
        userMessage += `\n  ${ind.name}: ${ind.price} (${ind.changePct > 0 ? '+' : ''}${ind.changePct}%)`;
      });
    }
    if (liveContext.news?.length > 0) {
      userMessage += '\n\nLATEST NEWS HEADLINES:';
      liveContext.news.slice(0, 5).forEach((n, i) => {
        userMessage += `\n  ${i + 1}. ${n.title}${n.source ? ` — ${n.source}` : ''}`;
      });
    }
    userMessage += '\n--- END LIVE DATA ---\n';
  }

  // Inject agent-specific web search results with source URLs
  if (webResults && webResults.length > 0) {
    const agentSearches = webResults.filter(r => r.agentId === agentId);
    if (agentSearches.length > 0) {
      userMessage += '\n\n--- YOUR WEB RESEARCH (searched based on your specialty) ---\n';
      agentSearches.forEach(search => {
        if (search.queries) userMessage += `\nSearch queries: ${search.queries.join(' | ')}`;
        search.results?.forEach(r => {
          userMessage += `\n• [${r.title}]${r.url ? ` (source: ${r.url})` : ''}: ${r.snippet}`;
        });
      });
      userMessage += '\n--- END RESEARCH ---\n';
      userMessage += '\nIMPORTANT: Use this research to support your arguments with specific data points, numbers, and recent developments. Cite your sources when possible. Give a thorough, detailed analysis — at least 4-6 sentences. Reference the actual data you found.';
    }
  }

  if (priorContext && priorContext.length > 0) {
    userMessage += '\n\n--- PRIOR ROUND AGENT RESPONSES ---\n';
    priorContext.forEach(p => {
      userMessage += `\n${p.agentName} (${p.role}): [${p.sentiment}] "${p.analysis.substring(0, 200)}..."`;
    });
    userMessage += '\n\n--- END PRIOR ROUND ---\n';
    userMessage += '\nReact to the event AND to the other agents\' positions above. If you disagree with someone, say so directly. Use your web research and live data to back up your arguments.';
  }

  try {
    const response = await client.messages.create({
      model: model || 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: agentConfig.system + '\n\nIMPORTANT: Give a thorough, detailed analysis. Write at least 4-6 sentences with specific data points, numbers, and reasoning. Reference real indicators, metrics, and historical precedents. If you have web research data, cite specific findings. Be substantive — this is a professional trading desk discussion.',
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0]?.text || '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        agentId,
        agentName: agentConfig.name,
        role: agentConfig.role,
        analysis: parsed.analysis || text,
        sentiment: mapSentimentToKey(parsed.sentiment || 'Neutral'),
        confidence: Math.min(95, Math.max(40, parsed.confidence || 60)),
        trades: parsed.trades || [],
        round: roundNum,
        model: model || 'claude-haiku-4-5-20251001',
        tokensUsed: response.usage?.output_tokens || 0,
      };
    }

    // Fallback: couldn't parse JSON
    return {
      agentId,
      agentName: agentConfig.name,
      role: agentConfig.role,
      analysis: text,
      sentiment: 'neutral',
      confidence: 50,
      trades: [],
      round: roundNum,
      model: model || 'claude-haiku-4-5-20251001',
      tokensUsed: response.usage?.output_tokens || 0,
    };
  } catch (err) {
    console.error(`Agent ${agentId} error:`, err.message);
    return {
      agentId,
      agentName: agentConfig.name,
      role: agentConfig.role,
      analysis: `[API Error: ${err.message}] Unable to generate analysis for this round.`,
      sentiment: 'neutral',
      confidence: 40,
      trades: [],
      round: roundNum,
      error: err.message,
    };
  }
}

// API endpoint: run a simulation round
app.post('/api/simulate', async (req, res) => {
  const { apiKey, event, priorRound, roundNum, model, ticker, liveContext: clientContext } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'API key is required' });
  }

  if (!event) {
    return res.status(400).json({ error: 'Event is required' });
  }

  const client = new Anthropic({ apiKey });
  const agentIds = Object.keys(AGENT_PROMPTS);

  // Build prior context for agent reactions
  const priorContext = priorRound?.map(r => ({
    agentName: r.agentName || r.agent?.name || 'Unknown',
    role: r.role || r.agent?.role || 'Analyst',
    sentiment: r.sentiment || 'neutral',
    analysis: r.analysis || '',
  })) || [];

  try {
    // Fetch live context and agent web search results in parallel
    const searchTicker = ticker || event.match(/\b([A-Z]{1,5}(?:-USD)?)\b/)?.[1];

    const [liveContext, webSearchResults] = await Promise.all([
      // Use client-provided context or fetch fresh
      clientContext || (async () => {
        const [quote, news, indicators] = await Promise.all([
          searchTicker ? fetchStockQuote(searchTicker) : null,
          fetchFinancialNews(searchTicker || event.slice(0, 40), 6),
          fetchMarketIndicators(),
        ]);
        return { ticker: quote, news, indicators };
      })(),
      // Agent-specific deep web searches (each agent gets multiple queries)
      Promise.all(
        agentIds.map(async (id) => {
          const queries = getAgentSearchQueries(id, searchTicker, event);
          // Search all queries for each agent for deeper research
          const allResults = await Promise.all(
            queries.map(q => deepWebSearch(q, 4))
          );
          // Flatten and deduplicate
          const seen = new Set();
          const results = allResults.flat().filter(r => {
            if (seen.has(r.title)) return false;
            seen.add(r.title);
            return true;
          }).slice(0, 8);
          return { agentId: id, queries, results };
        })
      ),
    ]);

    // Run all 12 agents in parallel with live context
    const results = await Promise.all(
      agentIds.map(id => callAgentClaude(client, id, event, priorContext, roundNum || 1, model, liveContext, webSearchResults))
    );

    const totalTokens = results.reduce((sum, r) => sum + (r?.tokensUsed || 0), 0);

    res.json({
      responses: results.filter(Boolean),
      totalTokens,
      model: model || 'claude-haiku-4-5-20251001',
      roundNum: roundNum || 1,
      liveContext,
      webSearchSummary: webSearchResults.map(w => ({
        agentId: w.agentId,
        query: w.query,
        resultCount: w.results?.length || 0,
      })),
    });
  } catch (err) {
    console.error('Simulation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ LIVE DATA ENDPOINTS ============

// Get live market context for a ticker or topic
app.get('/api/market-context', async (req, res) => {
  const { ticker, query } = req.query;
  const searchTerm = ticker || query || 'stock market';

  try {
    const [quote, news, indicators] = await Promise.all([
      ticker ? fetchStockQuote(ticker) : null,
      fetchFinancialNews(searchTerm, 8),
      fetchMarketIndicators(),
    ]);

    res.json({
      ticker: quote,
      news,
      indicators,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Market context error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Web search endpoint — agents use this for real-time info
app.post('/api/web-search', async (req, res) => {
  const { queries } = req.body; // array of { agentId, query }
  if (!queries || !Array.isArray(queries)) {
    return res.status(400).json({ error: 'queries array is required' });
  }

  try {
    const results = await Promise.all(
      queries.map(async ({ agentId, query }) => {
        const searchResults = await webSearch(query, 3);
        return { agentId, query, results: searchResults };
      })
    );
    res.json({ searches: results });
  } catch (err) {
    console.error('Web search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agents: Object.keys(AGENT_PROMPTS).length });
});

// Validate API key
app.post('/api/validate-key', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ valid: false });

  try {
    const client = new Anthropic({ apiKey });
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    });
    res.json({ valid: true });
  } catch (err) {
    res.json({ valid: false, error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n  FinSight API Server running on http://localhost:${PORT}`);
  console.log(`  Endpoints:`);
  console.log(`    POST /api/simulate       — Run a simulation round (with live data + web search)`);
  console.log(`    GET  /api/market-context  — Fetch live market data, news, indicators`);
  console.log(`    POST /api/web-search      — Agent web search`);
  console.log(`    POST /api/validate-key    — Validate API key`);
  console.log(`    GET  /api/health          — Health check\n`);
});
