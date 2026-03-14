import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Play, Zap, FileText, RotateCcw, ChevronDown, ChevronUp, AlertTriangle, Users, ArrowRight, Brain, Settings as SettingsIcon, Cpu, MessageSquare, Award, Swords, ScrollText, Globe, TrendingUp, TrendingDown, Minus, Newspaper, Search, BarChart3 } from 'lucide-react'
import { AGENTS, SENTIMENT_LEVELS } from '../engine/agents'
import { runSimulationRound, injectShock, generateReport, generateDebateExchanges, generateConsensusConclusion, generateDynamicShocks } from '../engine/simulation'
import { SEED_EVENTS } from '../data/marketData'
import { isClaudeEnabled, runClaudeSimulation, checkBackendHealth, fetchMarketContext, fetchFullMarketData } from '../engine/claudeApi'
import AgentCard from '../components/AgentCard'
import SentimentGauge from '../components/SentimentGauge'
import Settings from '../components/Settings'
import TickerSearch from '../components/TickerSearch'

export default function Simulation() {
  const navigate = useNavigate()
  const location = useLocation()
  const incomingTicker = location.state?.ticker

  const [seedEvent, setSeedEvent] = useState(() => {
    if (incomingTicker) {
      return `Should I invest in ${incomingTicker}? Analyze ${incomingTicker} for potential investment. Consider current market conditions, valuation, technical setup, growth prospects, and risk factors. Give a clear buy/sell/hold recommendation.`
    }
    return SEED_EVENTS[0]
  })
  const [rounds, setRounds] = useState([])
  const [shocks, setShocks] = useState([])
  const [currentRound, setCurrentRound] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [showSeedDropdown, setShowSeedDropdown] = useState(false)
  const [showShockDropdown, setShowShockDropdown] = useState(false)
  const [customShockInput, setCustomShockInput] = useState('')
  const dynamicShocks = useMemo(() => generateDynamicShocks(seedEvent), [seedEvent])
  const [selectedShock, setSelectedShock] = useState(() => generateDynamicShocks(seedEvent)[0])
  const [report, setReport] = useState(null)
  const [activeView, setActiveView] = useState('grid')
  const [showSettings, setShowSettings] = useState(false)
  const [claudeMode, setClaudeMode] = useState(false)
  const [backendUp, setBackendUp] = useState(false)
  const [tokenCount, setTokenCount] = useState(0)
  const [stockQuery, setStockQuery] = useState('')
  const [debates, setDebates] = useState([])
  const [conclusion, setConclusion] = useState(null)
  const [activityLog, setActivityLog] = useState([])
  const [showEventSetup, setShowEventSetup] = useState(true)
  const [selectedRoundIdx, setSelectedRoundIdx] = useState(-1) // -1 = latest
  const [liveContext, setLiveContext] = useState(null)
  const [fetchingContext, setFetchingContext] = useState(false)
  const [fullMarketData, setFullMarketData] = useState(null)
  const logEndRef = useRef(null)
  const logContainerRef = useRef(null)

  // Auto-scroll activity log within its own container (not the whole page)
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [activityLog])

  // Reset selected shock when seed event changes
  useEffect(() => {
    setSelectedShock(dynamicShocks[0])
  }, [dynamicShocks])

  // Check Claude availability on mount
  useEffect(() => {
    const check = async () => {
      const up = await checkBackendHealth()
      setBackendUp(up)
      setClaudeMode(up && isClaudeEnabled())
    }
    check()
  }, [showSettings])

  const addLog = (message, type = 'info', agent = null) => {
    setActivityLog(prev => [...prev, { message, type, time: new Date().toLocaleTimeString(), agent }])
  }

  const mapClaudeResponse = (apiResponse, agent) => ({
    agentId: apiResponse.agentId,
    agent: agent,
    sentiment: apiResponse.sentiment || 'neutral',
    confidence: apiResponse.confidence || 50,
    analysis: apiResponse.analysis || '',
    trades: apiResponse.trades || [],
    round: apiResponse.round,
    flipped: false,
    claudePowered: true,
  })

  // Extract ticker from seed event
  const extractTicker = (text) => {
    // First try "invest in XXX" pattern
    const investMatch = text.match(/invest in ([A-Z]{1,5}(?:-USD)?)\b/i)
    if (investMatch) return investMatch[1].toUpperCase()
    // Then try "Analyze XXX" pattern
    const analyzeMatch = text.match(/analyze ([A-Z]{1,5}(?:-USD)?)\b/i)
    if (analyzeMatch) return analyzeMatch[1].toUpperCase()
    // Fallback: find uppercase tickers (2+ chars, skip common English words)
    const skipWords = new Set(['THE', 'AND', 'FOR', 'WITH', 'NOT', 'BUT', 'ARE', 'HAS', 'WAS', 'CAN', 'MAY', 'ALL', 'NEW', 'NOW', 'GDP', 'CPI', 'FED', 'IPO', 'CEO', 'AI'])
    const matches = text.match(/\b[A-Z]{2,5}(?:-USD)?\b/g) || []
    return matches.find(m => !skipWords.has(m)) || null
  }

  // Fetch live market context
  const fetchContext = useCallback(async (ticker) => {
    if (!backendUp) return null
    setFetchingContext(true)
    addLog('Fetching live market data, news, and indicators...', 'system')
    try {
      const ctx = await fetchMarketContext(ticker, seedEvent.slice(0, 60))
      if (ctx) {
        setLiveContext(ctx)
        if (ctx.ticker) addLog(`Live: ${ctx.ticker.symbol} $${ctx.ticker.price} (${ctx.ticker.changePct > 0 ? '+' : ''}${ctx.ticker.changePct}%)`, 'system')
        if (ctx.news?.length > 0) addLog(`Loaded ${ctx.news.length} recent news headlines`, 'system')
        if (ctx.indicators) addLog(`Market indicators loaded (VIX, S&P 500, yields, etc.)`, 'system')
      }
      return ctx
    } catch (err) {
      addLog(`Live data fetch failed: ${err.message}`, 'error')
      return null
    } finally {
      setFetchingContext(false)
    }
  }, [backendUp, seedEvent])

  const runRound = useCallback(async () => {
    setIsRunning(true)
    setShowEventSetup(false)
    setSelectedRoundIdx(-1) // Jump to latest when running new round
    const nextRound = currentRound + 1
    const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : []

    addLog(`Round ${nextRound} starting — analyzing seed event...`, 'system')

    // Fetch live context on first round or if not yet loaded
    const ticker = extractTicker(seedEvent)
    let ctx = liveContext
    if (!ctx && backendUp) {
      ctx = await fetchContext(ticker)
    }

    try {
      let responses

      if (claudeMode && isClaudeEnabled()) {
        addLog('Each agent is searching the web for their specialty area...', 'system')
        addLog(`Querying Claude AI for all ${AGENTS.length} agents (with live data + web research)...`, 'system')
        const model = localStorage.getItem('finsight_model') || 'claude-haiku-4-5-20251001'
        const result = await runClaudeSimulation(seedEvent, lastRound, nextRound, model, ticker, ctx)
        responses = result.responses.map(r => {
          const agent = AGENTS.find(a => a.id === r.agentId)
          return mapClaudeResponse(r, agent)
        })
        setTokenCount(prev => prev + (result.totalTokens || 0))
        // Log web search activity
        if (result.webSearchSummary) {
          const searched = result.webSearchSummary.filter(w => w.resultCount > 0).length
          addLog(`${searched}/${AGENTS.length} agents found web results for their research`, 'system')
        }
        // Update live context from server if returned
        if (result.liveContext) setLiveContext(result.liveContext)
      } else {
        const seed = seedEvent.length + nextRound + Date.now()

        // Fetch real market data for deterministic mode (if backend is running)
        let mktData = fullMarketData
        if (!mktData && backendUp) {
          const tickerSymbol = ticker || extractTicker(seedEvent)
          if (tickerSymbol) {
            addLog(`Fetching real market data for ${tickerSymbol}...`, 'system')
            mktData = await fetchFullMarketData(tickerSymbol)
            if (mktData && mktData.quote) {
              setFullMarketData(mktData)
              const q = mktData.quote
              const t = mktData.technicals
              const chg = parseFloat(q.changePct) || 0
              addLog(`Real data loaded: ${q.symbol} $${q.price} (${chg > 0 ? '+' : ''}${chg}%), RSI: ${t?.rsi || 'N/A'}, Trend: ${t?.trend || 'N/A'}`, 'system')
              // Also populate liveContext for display
              setLiveContext({ ticker: q, indicators: mktData.indicators, news: mktData.news, technicals: t, fetchedAt: mktData.fetchedAt })
            } else {
              addLog('Market data unavailable, using simulated analysis', 'warning')
            }
          }
        }

        responses = runSimulationRound(seedEvent, rounds, nextRound, seed, mktData)
      }

      // === ROOM SIMULATION: analysts arguing in a war room (30s - 5min) ===
      const bullResponses = responses.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0)
      const bearResponses = responses.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0)
      const neutralResponses = responses.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) === 0)

      // Helper: smart snippet that doesn't break on decimal points
      const smartSnippet = (text, maxLen = 350) => {
        if (!text) return ''
        const safe = text.replace(/(\d)\.(\d)/g, '$1\u00B7$2')
        const sentences = safe.split(/\.\s+/).slice(0, 2).join('. ').replace(/\u00B7/g, '.')
        return sentences.length > maxLen ? sentences.slice(0, maxLen) + '...' : sentences + '.'
      }

      // Delay helper for live feed effect
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

      // Randomized delay range: makes timing feel more natural
      const rDelay = (min, max) => delay(min + Math.random() * (max - min))

      // Shuffle for natural ordering
      const shuffled = [...responses].sort(() => Math.random() - 0.5)
      const agentFirstNames = ['Marcus', 'Diana', 'Quinn', 'Max', 'Tara', 'Victor', 'Fiona', 'Geo', 'Riley', 'Irene', 'Elena', 'Vince']

      // ── PHASE 1: Opening — The moderator sets the stage ──
      await rDelay(500, 1000)
      addLog(`[Moderator opens the floor. Topic: "${seedEvent.slice(0, 100)}${seedEvent.length > 100 ? '...' : ''}"]`, 'system')
      await rDelay(800, 1200)
      addLog(`[${AGENTS.length} analysts take their seats. Each has completed independent research. The debate begins.]`, 'system')

      // ── PHASE 2: Opening statements — each agent presents (staggered, ~3-4s per agent) ──
      for (let i = 0; i < shuffled.length; i++) {
        const r = shuffled[i]
        const score = SENTIMENT_LEVELS[r.sentiment]?.score || 0

        // Longer delays between agents for more realistic pacing
        await rDelay(i === 0 ? 800 : 2500, i === 0 ? 1500 : 4500)

        // Show FULL analysis (no truncation)
        addLog(`${r.agent.name}: "${r.analysis}"`, r.sentiment, r.agent)

        // Show data sources backing the argument with clickable links & confidence
        if (r.dataSources && r.dataSources.length > 0) {
          await rDelay(300, 600)
          const srcText = r.dataSources.map(s => `[${s.name}: ${s.metric}](${s.url}) (${s.confidence || 85}% reliable)`).join(' | ')
          addLog(`Sources: ${srcText}`, 'source', r.agent)
        }

        // If agent's analysis mentions trade ideas, highlight them
        if (r.trades && r.trades.length > 0) {
          await rDelay(400, 800)
          addLog(`${r.agent.name}'s trades: ${r.trades.join(', ')}`, 'info', r.agent)
        }

        // ── Real-time reactions from other agents ──
        for (const name of agentFirstNames) {
          if (name !== r.agent.name.split(' ')[0] && r.analysis?.includes(name)) {
            const target = responses.find(x => x.agent.name.startsWith(name))
            if (target) {
              await rDelay(800, 1500)
              const targetScore = SENTIMENT_LEVELS[target.sentiment]?.score || 0
              if ((score > 0 && targetScore < 0) || (score < 0 && targetScore > 0)) {
                addLog(`${target.agent.name}: "Hold on — ${r.agent.name.split(' ')[0]}'s data doesn't account for the risk factors I'm tracking. Let me counter with my own numbers."`, 'clash', target.agent)
              } else if (score !== 0 && Math.sign(score) === Math.sign(targetScore)) {
                addLog(`${target.agent.name}: "${r.agent.name.split(' ')[0]} is right. My independent analysis from ${target.agent.sectors?.[0] || 'my sector'} corroborates this view."`, 'coalition', target.agent)
              }
            }
            break
          }
        }

        // Show concessions in real-time (persuasion system)
        if (r.concession && !r.flipped) {
          await rDelay(600, 1000)
          addLog(`${r.agent.name}: "${r.concession}"`, 'debate', r.agent)
        }

        // ── Inter-agent pushback — more frequent and varied ──
        if (i >= 2 && i % 2 === 0) {
          const prevAgent = shuffled[i - 1]
          const prevScore = SENTIMENT_LEVELS[prevAgent?.sentiment]?.score || 0
          if (prevAgent && Math.abs(score - prevScore) >= 1) {
            await rDelay(1000, 2000)
            addLog(`${r.agent.name} turns to ${prevAgent.agent.name}: "With all due respect, your ${SENTIMENT_LEVELS[prevAgent.sentiment]?.label} stance ignores key data points I'm seeing in ${r.agent.sectors?.[0] || 'my coverage area'}."`, 'clash', r.agent)
            await rDelay(1200, 2000)
            addLog(`${prevAgent.agent.name}: "I hear you, but my framework weighs ${prevAgent.agent.sectors?.[0] || 'different factors'} differently. Show me the data."`, 'debate', prevAgent.agent)
            // Sometimes a third agent jumps in
            if (Math.random() > 0.5 && i + 1 < shuffled.length) {
              await rDelay(800, 1500)
              const mediator = shuffled[i + 1]
              addLog(`${mediator.agent.name} jumps in: "Actually, you're both partially right. The key variable here is timing — ${r.agent.name.split(' ')[0]}'s thesis works short-term, ${prevAgent.agent.name.split(' ')[0]}'s is the 6-month view."`, 'debate', mediator.agent)
            }
          }
        }

        // ── Room atmosphere updates ──
        if (i === 3 && bullResponses.length > 0 && bearResponses.length > 0) {
          await rDelay(800, 1200)
          addLog(`[The room is splitting — ${bullResponses.length} agents bullish, ${bearResponses.length} bearish. Voices rising.]`, 'system')
        }
        if (i === 5) {
          await rDelay(500, 1000)
          const highConf = shuffled.filter(r => r.confidence >= 75)
          addLog(`[${highConf.length} agents showing high conviction (75%+). The energy in the room is intense.]`, 'system')
        }
        if (i === 7) {
          await rDelay(800, 1200)
          addLog(`[${neutralResponses.length > 0 ? `${neutralResponses.length} agents still on the fence` : 'Everyone has taken sides'} — the pressure to commit is building]`, 'system')
        }
        if (i === 9) {
          await rDelay(500, 1000)
          const avgConf = Math.round(responses.reduce((s, r) => s + r.confidence, 0) / responses.length)
          addLog(`[Average room confidence: ${avgConf}%. ${avgConf > 70 ? 'Strong convictions across the board.' : 'Uncertainty remains high.'}]`, 'system')
        }
        if (i === 10 && bullResponses.length > 0 && bearResponses.length > 0) {
          await rDelay(800, 1200)
          const dominant = bullResponses.length > bearResponses.length ? 'bulls' : bearResponses.length > bullResponses.length ? 'bears' : 'neither side'
          addLog(`[Final positions being taken. ${dominant === 'neither side' ? 'Dead even split.' : `The ${dominant} are gaining momentum.`}]`, 'system')
        }
      }

      // ── PHASE 3: Cross-examination — agents challenge each other directly ──
      if (bullResponses.length > 0 && bearResponses.length > 0) {
        await rDelay(1500, 2500)
        addLog(`[── CROSS-EXAMINATION PHASE ──]`, 'system')
        await rDelay(1000, 1500)

        // Pick 2-3 random cross-examination pairs
        const pairs = []
        const maxPairs = Math.min(3, Math.min(bullResponses.length, bearResponses.length))
        const usedBulls = new Set()
        const usedBears = new Set()
        for (let p = 0; p < maxPairs; p++) {
          const availBulls = bullResponses.filter((_, i) => !usedBulls.has(i))
          const availBears = bearResponses.filter((_, i) => !usedBears.has(i))
          if (availBulls.length === 0 || availBears.length === 0) break
          const bull = availBulls[Math.floor(Math.random() * availBulls.length)]
          const bear = availBears[Math.floor(Math.random() * availBears.length)]
          usedBulls.add(bullResponses.indexOf(bull))
          usedBears.add(bearResponses.indexOf(bear))
          pairs.push({ bull, bear })
        }

        for (const { bull, bear } of pairs) {
          await rDelay(1500, 2500)
          addLog(`${bull.agent.name} challenges ${bear.agent.name}: "Your bearish thesis at ${bear.confidence}% confidence is based on what exactly? My data shows the complete opposite picture."`, 'clash', bull.agent)
          await rDelay(2000, 3500)
          addLog(`${bear.agent.name}: "I'll tell you what my thesis is based on — the risk metrics you're conveniently ignoring. ${smartSnippet(bear.analysis, 250)}"`, 'clash', bear.agent)
          await rDelay(1500, 2500)
          addLog(`${bull.agent.name}: "Risk metrics? Look at the actual momentum. ${smartSnippet(bull.analysis, 200)}"`, 'debate', bull.agent)

          // Bystander commentary
          const bystanders = responses.filter(r => r.agentId !== bull.agentId && r.agentId !== bear.agentId)
          if (bystanders.length > 0) {
            const commentator = bystanders[Math.floor(Math.random() * bystanders.length)]
            await rDelay(1000, 2000)
            const commentScore = SENTIMENT_LEVELS[commentator.sentiment]?.score || 0
            if (commentScore > 0) {
              addLog(`${commentator.agent.name}: "I have to side with ${bull.agent.name} here. The fundamental picture supports the bull case."`, 'coalition', commentator.agent)
            } else if (commentScore < 0) {
              addLog(`${commentator.agent.name}: "${bear.agent.name} is raising valid concerns that the bulls are too eager to dismiss."`, 'coalition', commentator.agent)
            } else {
              addLog(`${commentator.agent.name}: "Both sides have merit. I'd weight the probability at roughly 55/45 — it's genuinely uncertain."`, 'debate', commentator.agent)
            }
          }
        }
      }

      // ── PHASE 4: Flips — agents who were persuaded ──
      if (nextRound >= 2 && lastRound.length > 0) {
        await rDelay(1500, 2500)
        addLog(`[── POSITION REVIEW ──]`, 'system')
        await rDelay(1000, 1500)

        let flippedAgents = []
        for (const r of responses) {
          const prev = lastRound.find(p => p.agentId === r.agentId)
          if (prev) {
            const prevScore = SENTIMENT_LEVELS[prev.sentiment]?.score || 0
            const newScore = SENTIMENT_LEVELS[r.sentiment]?.score || 0
            if ((prevScore > 0 && newScore < 0) || (prevScore < 0 && newScore > 0)) {
              flippedAgents.push(r)
              await rDelay(1000, 2000)
              if (r.persuadedBy) {
                addLog(`${r.agent.name} stands up: "I've reconsidered. ${r.persuadedBy.name}'s argument convinced me."`, 'flip', r.agent)
                if (r.persuasionReason) {
                  await rDelay(800, 1200)
                  addLog(`${r.agent.name}: "${r.persuasionReason}"`, 'flip', r.agent)
                }
              } else {
                addLog(`${r.agent.name}: "The evidence has shifted. I was ${SENTIMENT_LEVELS[prev.sentiment]?.label}, now I'm ${SENTIMENT_LEVELS[r.sentiment]?.label}."`, 'flip', r.agent)
              }
              // Other agents react to the flip
              await rDelay(800, 1500)
              const reactor = responses.find(x => x.agentId !== r.agentId && Math.abs((SENTIMENT_LEVELS[x.sentiment]?.score || 0) - newScore) <= 1)
              if (reactor) {
                addLog(`${reactor.agent.name}: "Welcome to our side, ${r.agent.name.split(' ')[0]}. The data doesn't lie."`, 'coalition', reactor.agent)
              }
            } else {
              // Check for significant confidence changes even without a flip
              const confDiff = Math.abs(r.confidence - (prev.confidence || 50))
              if (confDiff >= 15) {
                await rDelay(600, 1000)
                addLog(`${r.agent.name}: "My conviction has ${r.confidence > (prev.confidence || 50) ? 'strengthened' : 'weakened'} significantly — ${prev.confidence || 50}% → ${r.confidence}%. The new data ${r.confidence > (prev.confidence || 50) ? 'confirms' : 'complicates'} my thesis."`, 'debate', r.agent)
              }
            }
          }
        }
        if (flippedAgents.length > 0) {
          addLog(`[${flippedAgents.length} agent${flippedAgents.length > 1 ? 's' : ''} changed sides — the room dynamics are shifting!]`, 'system')
        } else {
          addLog(`[No flips this round — both sides holding firm]`, 'system')
        }

        // ── PHASE 5: Coalition formation ──
        await rDelay(1200, 2000)
        addLog(`[── COALITION CHECK ──]`, 'system')
        if (bullResponses.length >= 3) {
          await rDelay(500, 1000)
          const names = bullResponses.map(b => b.agent.name).join(', ')
          const avgBullConf = Math.round(bullResponses.reduce((s, r) => s + r.confidence, 0) / bullResponses.length)
          addLog(`[Bull coalition (${bullResponses.length} agents, avg ${avgBullConf}% confidence): ${names}]`, 'coalition')
        }
        if (bearResponses.length >= 3) {
          await rDelay(500, 1000)
          const names = bearResponses.map(b => b.agent.name).join(', ')
          const avgBearConf = Math.round(bearResponses.reduce((s, r) => s + r.confidence, 0) / bearResponses.length)
          addLog(`[Bear coalition (${bearResponses.length} agents, avg ${avgBearConf}% confidence): ${names}]`, 'coalition')
        }

        // ── PHASE 6: Head-to-head final clash ──
        if (bullResponses.length > 0 && bearResponses.length > 0) {
          await rDelay(2000, 3000)
          addLog(`[── FINAL SHOWDOWN ──]`, 'system')
          await rDelay(1000, 1500)
          const strongestBull = bullResponses.reduce((a, b) => a.confidence > b.confidence ? a : b)
          const strongestBear = bearResponses.reduce((a, b) => a.confidence > b.confidence ? a : b)

          addLog(`[The two strongest voices square off: ${strongestBull.agent.name} (${strongestBull.confidence}%) vs ${strongestBear.agent.name} (${strongestBear.confidence}%)]`, 'system')
          await rDelay(1500, 2500)
          addLog(`${strongestBull.agent.name}: "Let me lay out the bull case one final time. ${smartSnippet(strongestBull.analysis, 400)}"`, 'clash', strongestBull.agent)
          await rDelay(2000, 3500)
          addLog(`${strongestBear.agent.name} fires back: "And here's why that's wrong. ${smartSnippet(strongestBear.analysis, 400)}"`, 'clash', strongestBear.agent)

          // Both make their strongest closing point
          await rDelay(1500, 2500)
          addLog(`${strongestBull.agent.name}: "Bottom line — my conviction is at ${strongestBull.confidence}%. The setup is clear. ${strongestBull.trades?.length > 0 ? `I'm putting money where my mouth is: ${strongestBull.trades.join(', ')}.` : ''}"`, 'clash', strongestBull.agent)
          await rDelay(1500, 2500)
          addLog(`${strongestBear.agent.name}: "And mine is at ${strongestBear.confidence}%. Risk management matters. ${strongestBear.trades?.length > 0 ? `My positioning: ${strongestBear.trades.join(', ')}.` : ''}"`, 'clash', strongestBear.agent)

          // Third agent weighs in as judge
          const bystander = neutralResponses[0] || shuffled.find(r => r.agentId !== strongestBull.agentId && r.agentId !== strongestBear.agentId)
          if (bystander) {
            await rDelay(1200, 2000)
            const bystanderScore = SENTIMENT_LEVELS[bystander.sentiment]?.score || 0
            addLog(`${bystander.agent.name} delivers the verdict: "${bystanderScore === 0 ? 'This is genuinely a coin flip. Both theses have substantial merit.' : strongestBull.confidence > strongestBear.confidence ? `${strongestBull.agent.name}'s data is more compelling right now, but ${strongestBear.agent.name}'s risk warnings shouldn't be dismissed.` : `${strongestBear.agent.name}'s caution is warranted here. The risk/reward isn't as clear-cut as ${strongestBull.agent.name} suggests.`}"`, 'debate', bystander.agent)
          }

          // ── PHASE 7: Side conversations and final thoughts ──
          await rDelay(1500, 2500)
          addLog(`[── CLOSING REMARKS ──]`, 'system')

          // Random agents give final thoughts
          const commentators = [...responses].sort(() => Math.random() - 0.5).slice(0, 4)
          for (const agent of commentators) {
            await rDelay(1200, 2500)
            const s = SENTIMENT_LEVELS[agent.sentiment]?.score || 0
            if (s > 0) {
              addLog(`${agent.agent.name}: "Closing thought — the asymmetry here favors longs. Upside potential significantly outweighs downside risk at current levels."`, 'debate', agent.agent)
            } else if (s < 0) {
              addLog(`${agent.agent.name}: "Final word — protect your capital. The risk/reward is skewed to the downside, and the market is not pricing in the tail risks."`, 'debate', agent.agent)
            } else {
              addLog(`${agent.agent.name}: "I remain uncommitted. Need more data before taking a directional bet here."`, 'debate', agent.agent)
            }
          }
        }
      }

      const allRounds = [...rounds, responses]
      setRounds(prev => [...prev, responses])
      setCurrentRound(nextRound)

      await delay(500)
      const avgScore = responses.reduce((s, r) => s + (SENTIMENT_LEVELS[r.sentiment]?.score || 0), 0) / responses.length
      addLog(`Round ${nextRound} complete — consensus: ${avgScore > 0 ? 'Bullish' : avgScore < 0 ? 'Bearish' : 'Neutral'} (${avgScore > 0 ? '+' : ''}${avgScore.toFixed(2)})`, 'system')

      if (nextRound >= 2) {
        const debateExchanges = generateDebateExchanges(allRounds)
        setDebates(debateExchanges)
        if (debateExchanges.length > 0) {
          addLog(`Debate: ${debateExchanges[0].attacker.agent.name} vs ${debateExchanges[0].defender.agent.name}`, 'debate')
        }
      }

      if (nextRound >= 4 && !report) {
        await delay(800)
        const rep = generateReport(allRounds, seedEvent, shocks)
        setReport(rep)
        // Save report to localStorage for history
        try {
          const history = JSON.parse(localStorage.getItem('finsight_reports') || '[]')
          if (!history.some(r => r.timestamp === rep.timestamp)) {
            history.unshift(rep)
            if (history.length > 20) history.length = 20
            localStorage.setItem('finsight_reports', JSON.stringify(history))
          }
        } catch { /* ignore storage errors */ }
        const con = generateConsensusConclusion(allRounds, seedEvent, shocks)
        setConclusion(con)
        addLog(`FINAL VERDICT: ${con.verdict} — ${con.voteBreakdown.bulls} bulls, ${con.voteBreakdown.bears} bears`, 'verdict')
        addLog('Report generated — agents reached a conclusion', 'system')
      }
    } catch (err) {
      console.error('Simulation error:', err)
      addLog(`Error: ${err.message}. Falling back to deterministic.`, 'error')
      const seed = seedEvent.length + nextRound + Date.now()
      const responses = runSimulationRound(seedEvent, rounds, nextRound, seed)
      const allRounds = [...rounds, responses]
      setRounds(prev => [...prev, responses])
      setCurrentRound(nextRound)
      if (nextRound >= 2) setDebates(generateDebateExchanges(allRounds))
      if (nextRound >= 4) setConclusion(generateConsensusConclusion(allRounds, seedEvent, shocks))
    }

    setIsRunning(false)
  }, [currentRound, rounds, seedEvent, shocks, report, claudeMode, liveContext, backendUp, fetchContext])

  const handleInjectShock = useCallback(async () => {
    if (rounds.length === 0) return
    setIsRunning(true)
    const lastRound = rounds[rounds.length - 1]
    const nextRound = currentRound + 1

    addLog(`SHOCK INJECTED: ${selectedShock}`, 'shock')
    addLog('Agents reacting to shock...', 'system')

    try {
      let responses

      if (claudeMode && isClaudeEnabled()) {
        const model = localStorage.getItem('finsight_model') || 'claude-haiku-4-5-20251001'
        const shockEvent = `${seedEvent}\n\nSHOCK INJECTED: ${selectedShock}`
        const result = await runClaudeSimulation(shockEvent, lastRound, nextRound, model)
        responses = result.responses.map(r => {
          const agent = AGENTS.find(a => a.id === r.agentId)
          const prev = lastRound.find(lr => lr.agentId === r.agentId)
          const prevScore = SENTIMENT_LEVELS[prev?.sentiment]?.score || 0
          const newScore = SENTIMENT_LEVELS[r.sentiment]?.score || 0
          const flipped = (prevScore > 0 && newScore < 0) || (prevScore < 0 && newScore > 0)
          return { ...mapClaudeResponse(r, agent), flipped, previousSentiment: prev?.sentiment || 'neutral', shockReaction: true }
        })
        setTokenCount(prev => prev + (result.totalTokens || 0))
      } else {
        responses = injectShock(selectedShock, lastRound, nextRound, seedEvent.length + Date.now(), fullMarketData)
      }

      // === LIVE ACTIVITY FEED for shock reaction (staggered like runRound) ===
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))
      const rDelay = (min, max) => delay(min + Math.random() * (max - min))

      const smartSnippet = (text, maxLen = 350) => {
        if (!text) return ''
        const safe = text.replace(/(\d)\.(\d)/g, '$1\u00B7$2')
        const sentences = safe.split(/\.\s+/).slice(0, 2).join('. ').replace(/\u00B7/g, '.')
        return sentences.length > maxLen ? sentences.slice(0, maxLen) + '...' : sentences + '.'
      }

      const bullResponses = responses.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0)
      const bearResponses = responses.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0)
      const neutralResponses = responses.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) === 0)
      const shuffled = [...responses].sort(() => Math.random() - 0.5)

      await rDelay(500, 1000)
      addLog(`[Breaking news hits the screens. The room goes silent...]`, 'system')
      await rDelay(1000, 1800)
      addLog(`[${AGENTS.length} analysts scramble to reassess their positions in light of the shock]`, 'system')

      // ── PHASE 1: Shock reactions — agents respond one by one ──
      for (let i = 0; i < shuffled.length; i++) {
        const r = shuffled[i]
        const score = SENTIMENT_LEVELS[r.sentiment]?.score || 0

        await rDelay(i === 0 ? 800 : 2000, i === 0 ? 1500 : 4000)

        if (r.flipped) {
          addLog(`${r.agent.name} stands up: "This changes everything! ${smartSnippet(r.analysis, 350)}"`, 'flip', r.agent)
        } else {
          addLog(`${r.agent.name}: "${r.analysis || smartSnippet(r.analysis)}"`, r.sentiment, r.agent)
        }

        // Show sources if available
        if (r.dataSources && r.dataSources.length > 0) {
          await rDelay(300, 600)
          const srcText = r.dataSources.map(s => `[${s.name}: ${s.metric}](${s.url}) (${s.confidence || 85}% reliable)`).join(' | ')
          addLog(`Sources: ${srcText}`, 'source', r.agent)
        }

        // Show trades
        if (r.trades && r.trades.length > 0) {
          await rDelay(400, 800)
          addLog(`${r.agent.name}'s trades: ${r.trades.join(', ')}`, 'info', r.agent)
        }

        // Inter-agent pushback
        if (i >= 2 && i % 2 === 0) {
          const prevAgent = shuffled[i - 1]
          const prevScore = SENTIMENT_LEVELS[prevAgent?.sentiment]?.score || 0
          if (prevAgent && Math.abs(score - prevScore) >= 1) {
            await rDelay(1000, 2000)
            addLog(`${r.agent.name} turns to ${prevAgent.agent.name}: "The shock changes my thesis on ${r.agent.sectors?.[0] || 'this'} — how does your view hold up?"`, 'clash', r.agent)
            await rDelay(1200, 2000)
            addLog(`${prevAgent.agent.name}: "My framework already accounts for this scenario. If anything, it confirms my position."`, 'debate', prevAgent.agent)
          }
        }

        // Room atmosphere updates
        if (i === 3) {
          await rDelay(800, 1200)
          addLog(`[Shock processing: ${bullResponses.length} bullish, ${bearResponses.length} bearish — the balance is shifting]`, 'system')
        }
        if (i === 7) {
          await rDelay(500, 1000)
          const avgConf = Math.round(responses.reduce((s, r) => s + r.confidence, 0) / responses.length)
          addLog(`[Room confidence: ${avgConf}%. ${avgConf > 70 ? 'Convictions holding strong despite the shock.' : 'Uncertainty rising.'}]`, 'system')
        }
      }

      // ── PHASE 2: Position flips ──
      const flippedAgents = responses.filter(r => r.flipped)
      if (flippedAgents.length > 0) {
        await rDelay(1500, 2500)
        addLog(`[── POSITION REVERSALS ──]`, 'system')
        for (const r of flippedAgents) {
          await rDelay(1000, 2000)
          addLog(`${r.agent.name}: "I was ${r.previousSentiment || 'on the other side'}, but this shock forced me to reconsider. My models now point the opposite direction."`, 'flip', r.agent)
          // Reaction
          const reactor = responses.find(x => x.agentId !== r.agentId && !x.flipped)
          if (reactor) {
            await rDelay(800, 1500)
            addLog(`${reactor.agent.name}: "That's a significant reversal, ${r.agent.name.split(' ')[0]}. The shock is clearly a game-changer."`, 'debate', reactor.agent)
          }
        }
        addLog(`[SHOCK IMPACT: ${flippedAgents.length} agent${flippedAgents.length > 1 ? 's' : ''} reversed their position!]`, 'shock')
      }

      // ── PHASE 3: Final assessment ──
      if (bullResponses.length > 0 && bearResponses.length > 0) {
        await rDelay(1500, 2500)
        addLog(`[── POST-SHOCK ASSESSMENT ──]`, 'system')
        const strongestBull = bullResponses.reduce((a, b) => a.confidence > b.confidence ? a : b)
        const strongestBear = bearResponses.reduce((a, b) => a.confidence > b.confidence ? a : b)
        await rDelay(1200, 2000)
        addLog(`${strongestBull.agent.name}: "Even after the shock, my bull case holds at ${strongestBull.confidence}% conviction."`, 'clash', strongestBull.agent)
        await rDelay(1500, 2500)
        addLog(`${strongestBear.agent.name}: "This shock validates my concerns. Bear case confidence: ${strongestBear.confidence}%."`, 'clash', strongestBear.agent)
      }

      await rDelay(500, 1000)
      const avgScore = responses.reduce((s, r) => s + (SENTIMENT_LEVELS[r.sentiment]?.score || 0), 0) / responses.length
      addLog(`Shock round complete — post-shock consensus: ${avgScore > 0 ? 'Bullish' : avgScore < 0 ? 'Bearish' : 'Neutral'} (${avgScore > 0 ? '+' : ''}${avgScore.toFixed(2)})`, 'system')

      const allRounds = [...rounds, responses]
      const newShocks = [...shocks, { shock: selectedShock, round: nextRound }]
      setRounds(prev => [...prev, responses])
      setShocks(newShocks)
      setCurrentRound(nextRound)
      if (nextRound >= 2) setDebates(generateDebateExchanges(allRounds))
      if (nextRound >= 4) {
        const rep = generateReport(allRounds, seedEvent, newShocks)
        setReport(rep)
        // Save report to localStorage for history
        try {
          const history = JSON.parse(localStorage.getItem('finsight_reports') || '[]')
          if (!history.some(r => r.timestamp === rep.timestamp)) {
            history.unshift(rep)
            if (history.length > 20) history.length = 20
            localStorage.setItem('finsight_reports', JSON.stringify(history))
          }
        } catch { /* ignore storage errors */ }
        const con = generateConsensusConclusion(allRounds, seedEvent, newShocks)
        setConclusion(con)
        addLog(`FINAL VERDICT: ${con.verdict}`, 'verdict')
      }
    } catch (err) {
      console.error('Shock error:', err)
      addLog(`Error: ${err.message}`, 'error')
      const responses = injectShock(selectedShock, lastRound, nextRound, seedEvent.length + Date.now(), fullMarketData)
      const allRounds = [...rounds, responses]
      setRounds(prev => [...prev, responses])
      setShocks(prev => [...prev, { shock: selectedShock, round: nextRound }])
      setCurrentRound(nextRound)
      if (nextRound >= 2) setDebates(generateDebateExchanges(allRounds))
    }

    setIsRunning(false)
  }, [rounds, currentRound, selectedShock, seedEvent, shocks, claudeMode])

  const handleTickerSelect = (symbol) => {
    setSeedEvent(`Should I invest in ${symbol}? Analyze ${symbol} for potential investment. Consider current market conditions, valuation, technical setup, growth prospects, and risk factors. Give a clear buy/sell/hold recommendation.`)
    setStockQuery('')
    setShowEventSetup(true)
  }

  const resetSimulation = () => {
    setRounds([])
    setShocks([])
    setCurrentRound(0)
    setReport(null)
    setTokenCount(0)
    setDebates([])
    setConclusion(null)
    setActivityLog([])
    setShowEventSetup(true)
    setSelectedRoundIdx(-1)
    setLiveContext(null)
    setFullMarketData(null)
  }

  const viewIdx = selectedRoundIdx === -1 ? rounds.length - 1 : selectedRoundIdx
  const viewRound = rounds.length > 0 ? rounds[viewIdx] || [] : []
  const viewRoundNum = viewIdx + 1
  const isViewingLatest = viewIdx === rounds.length - 1
  const avgSentiment = viewRound.length > 0
    ? viewRound.reduce((sum, r) => sum + (SENTIMENT_LEVELS[r.sentiment]?.score || 0), 0) / viewRound.length
    : 0
  const bulls = viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0).length
  const bears = viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0).length
  const neutrals = viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) === 0).length
  const flipped = viewRound.filter(r => r.flipped).length

  const logColorMap = {
    system: 'text-surface-300',
    'strong-bull': 'text-success',
    bull: 'text-success',
    neutral: 'text-warning',
    bear: 'text-danger',
    'strong-bear': 'text-danger',
    clash: 'text-accent-400',
    flip: 'text-warning font-semibold',
    coalition: 'text-primary-400',
    debate: 'text-accent-400',
    shock: 'text-danger font-semibold',
    verdict: 'text-surface-100 font-bold',
    error: 'text-danger',
    info: 'text-surface-300',
    source: 'text-surface-300 text-[11px]',
  }

  // Render log message with clickable source links
  const renderLogMessage = (message, type) => {
    if (type !== 'source') return message
    // Parse markdown-style links: [text](url)
    const parts = message.split(/(\[.*?\]\(.*?\)\s*\(\d+%\s*reliable\))/g)
    return parts.map((part, i) => {
      const linkMatch = part.match(/\[(.*?)\]\((.*?)\)\s*\((\d+)%\s*reliable\)/)
      if (linkMatch) {
        const [, text, url, conf] = linkMatch
        const confNum = parseInt(conf)
        const confColor = confNum >= 90 ? 'text-success' : confNum >= 75 ? 'text-warning' : 'text-danger'
        return (
          <span key={i}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline underline-offset-2 transition-colors">
              {text}
            </a>
            <span className={`ml-1 ${confColor}`}>({conf}%)</span>
          </span>
        )
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="p-6 space-y-5 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Simulation Arena</h1>
          <p className="text-surface-300 text-sm mt-1">{AGENTS.length} AI agents debate market events in real-time rounds</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              claudeMode ? 'bg-accent-600/20 border-accent-500/30 text-accent-400' : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            {claudeMode ? 'Claude AI' : 'Deterministic'}
          </button>
          {report && (
            <button
              onClick={() => navigate('/report', { state: { report } })}
              className="flex items-center gap-2 bg-accent-600 hover:bg-accent-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              View Report
            </button>
          )}
          <button
            onClick={resetSimulation}
            className="flex items-center gap-2 bg-surface-800 hover:bg-surface-700 text-surface-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Ticker Search with Dropdown */}
      <TickerSearch
        value={stockQuery}
        onChange={setStockQuery}
        onSelect={handleTickerSelect}
        placeholder="Search a stock or crypto to analyze (e.g., NVDA, BTC-USD, TSLA, AAPL)..."
      />

      {/* Live Market Context */}
      {liveContext && (
        <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden fade-in">
          <div className="px-5 py-3 bg-surface-800/50 flex items-center gap-2 border-b border-surface-800">
            <Globe className="w-4 h-4 text-primary-400" />
            <span className="text-xs font-semibold text-surface-100 uppercase tracking-wider">Live Market Context</span>
            <span className="text-xs text-surface-300 ml-auto">Updated {new Date(liveContext.fetchedAt || Date.now()).toLocaleTimeString()}</span>
          </div>
          <div className="p-4 space-y-3">
            {/* Ticker Quote */}
            {liveContext.ticker && (
              <div className="flex items-center gap-4 bg-surface-800/50 rounded-lg p-3">
                <div>
                  <span className="text-lg font-bold text-surface-100">{liveContext.ticker.symbol}</span>
                  <span className="text-sm text-surface-300 ml-2">{liveContext.ticker.exchange}</span>
                </div>
                <div className="text-xl font-bold text-surface-100">${liveContext.ticker.price}</div>
                <div className={`flex items-center gap-1 text-sm font-semibold ${Number(liveContext.ticker.changePct) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {Number(liveContext.ticker.changePct) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {liveContext.ticker.change} ({liveContext.ticker.changePct}%)
                </div>
                {liveContext.ticker.volume > 0 && (
                  <span className="text-xs text-surface-300">Vol: {Number(liveContext.ticker.volume).toLocaleString()}</span>
                )}
              </div>
            )}
            {/* Key Indicators */}
            {liveContext.indicators && Object.keys(liveContext.indicators).length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {Object.values(liveContext.indicators).slice(0, 8).map(ind => (
                  <div key={ind.symbol} className="bg-surface-800/30 rounded-lg px-3 py-2">
                    <div className="text-xs text-surface-300 truncate">{ind.name}</div>
                    <div className="text-sm font-semibold text-surface-100">{typeof ind.price === 'number' ? ind.price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : ind.price}</div>
                    <div className={`text-xs ${Number(ind.changePct) >= 0 ? 'text-success' : 'text-danger'}`}>
                      {Number(ind.changePct) >= 0 ? '+' : ''}{ind.changePct}%
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* News Headlines */}
            {liveContext.news?.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Newspaper className="w-3.5 h-3.5 text-surface-300" />
                  <span className="text-xs text-surface-300 uppercase tracking-wider">Latest News</span>
                </div>
                <div className="space-y-1">
                  {liveContext.news.slice(0, 5).map((n, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-surface-700 shrink-0">{i + 1}.</span>
                      <span className="text-surface-200">{n.title}</span>
                      {n.source && <span className="text-surface-700 shrink-0 ml-auto">{n.source}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fetch Context Button (when backend is up but no context yet) */}
      {backendUp && !liveContext && currentRound === 0 && (
        <button
          onClick={() => fetchContext(extractTicker(seedEvent))}
          disabled={fetchingContext}
          className="flex items-center gap-2 bg-surface-800 hover:bg-surface-700 border border-surface-700 text-surface-200 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {fetchingContext ? (
            <div className="w-4 h-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
          ) : (
            <Globe className="w-4 h-4 text-primary-400" />
          )}
          {fetchingContext ? 'Fetching live data...' : 'Load Live Market Data & News'}
        </button>
      )}

      {/* Seed Event - Collapsible */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowEventSetup(!showEventSetup)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-surface-800/50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 text-warning shrink-0" />
            <span className="text-sm font-semibold text-surface-100 uppercase tracking-wider shrink-0">Seed Event</span>
            {!showEventSetup && seedEvent && (
              <span className="text-xs text-surface-300 ml-2 truncate">{seedEvent.slice(0, 80)}...</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {claudeMode && tokenCount > 0 && (
              <span className="text-xs text-surface-300 mr-2">Tokens: <span className="text-accent-400 font-mono">{tokenCount.toLocaleString()}</span></span>
            )}
            {showEventSetup ? <ChevronUp className="w-4 h-4 text-surface-300" /> : <ChevronDown className="w-4 h-4 text-surface-300" />}
          </div>
        </button>
        {showEventSetup && (
          <div className="px-5 pb-4">
            <textarea
              value={seedEvent}
              onChange={e => setSeedEvent(e.target.value)}
              rows={2}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-4 py-3 text-sm text-surface-100 placeholder-surface-300 focus:outline-none focus:border-primary-500 resize-none"
              placeholder="Enter a market event to simulate..."
            />
            <div className="relative mt-2">
              <button
                onClick={() => setShowSeedDropdown(!showSeedDropdown)}
                className="flex items-center gap-2 text-xs text-surface-300 hover:text-surface-100 transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
                Choose from preset events
              </button>
              {showSeedDropdown && (
                <div className="absolute z-20 top-8 left-0 w-full max-h-60 overflow-y-auto bg-surface-800 border border-surface-700 rounded-lg shadow-xl">
                  {SEED_EVENTS.map((event, i) => (
                    <button
                      key={i}
                      onClick={() => { setSeedEvent(event); setShowSeedDropdown(false) }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-surface-200 hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0"
                    >
                      {event}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={runRound}
          disabled={isRunning}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-300 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
        >
          {isRunning ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? (claudeMode ? `Querying ${AGENTS.length} agents...` : 'Running...') : `Run Round ${currentRound + 1}`}
        </button>

        {rounds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setShowShockDropdown(!showShockDropdown)}
                className="flex items-center gap-2 bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 px-4 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Inject Shock
                <ChevronDown className="w-3 h-3" />
              </button>
              {showShockDropdown && (
                <div className="absolute z-20 top-full mt-1 left-0 w-[28rem] max-h-72 overflow-y-auto bg-white border border-black/[0.08] rounded-xl shadow-xl">
                  {/* Custom shock input */}
                  <div className="p-3 border-b border-black/[0.06]">
                    <div className="flex gap-2">
                      <input
                        value={customShockInput}
                        onChange={e => setCustomShockInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && customShockInput.trim()) {
                            setSelectedShock(customShockInput.trim())
                            setCustomShockInput('')
                            setShowShockDropdown(false)
                          }
                        }}
                        placeholder="Type a custom shock event..."
                        className="flex-1 bg-surface-950 border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-surface-100 placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-danger/20"
                      />
                      <button
                        onClick={() => {
                          if (customShockInput.trim()) {
                            setSelectedShock(customShockInput.trim())
                            setCustomShockInput('')
                            setShowShockDropdown(false)
                          }
                        }}
                        disabled={!customShockInput.trim()}
                        className="px-3 py-2 bg-danger hover:bg-danger/80 disabled:bg-surface-700 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Use
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-surface-950">
                    <span className="text-[10px] uppercase tracking-wider text-surface-300 font-semibold">Suggested shocks for this event</span>
                  </div>
                  {dynamicShocks.map((event, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedShock(event); setShowShockDropdown(false) }}
                      className="block w-full text-left px-4 py-2.5 text-sm text-surface-200 hover:bg-surface-950 transition-colors border-b border-black/[0.04] last:border-0"
                    >
                      {event}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedShock && (
              <button
                onClick={handleInjectShock}
                disabled={isRunning}
                className="flex items-center gap-2 bg-danger hover:bg-danger/80 disabled:bg-surface-700 text-white px-4 py-3 rounded-lg text-sm font-medium transition-colors"
              >
                <Zap className="w-4 h-4" />
                Fire: {selectedShock.slice(0, 40)}...
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live Activity Log — Room Simulation Transcript */}
      {activityLog.length > 0 && (
        <div className="bg-surface-950 border border-surface-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-900 border-b border-surface-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary-400" />
              <span className="text-xs font-semibold text-surface-100 uppercase tracking-wider">War Room — Live Transcript</span>
              {isRunning && <div className="w-2 h-2 rounded-full bg-success pulse-glow" />}
            </div>
            <span className="text-xs text-surface-300">{activityLog.length} events</span>
          </div>
          <div ref={logContainerRef} className="max-h-96 overflow-y-auto p-3 space-y-1">
            {activityLog.map((log, i) => (
              <div key={i} className={`flex gap-2 items-start ${log.agent ? '' : 'pl-8'}`}>
                {log.agent ? (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: log.agent.color + '30', color: log.agent.color }}>
                    {log.agent.avatar}
                  </div>
                ) : (
                  <span className="text-surface-700 text-xs shrink-0 select-none mt-0.5">{log.time}</span>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-xs leading-relaxed ${logColorMap[log.type] || 'text-surface-300'}`}>
                    {renderLogMessage(log.message, log.type)}
                  </span>
                </div>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Sentiment Summary Bar */}
      {viewRound.length > 0 && (
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <SentimentGauge value={avgSentiment} label="Consensus Sentiment" size="sm" />
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-sm text-surface-200">Bulls: <strong className="text-surface-100">{bulls}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-danger" />
                  <span className="text-sm text-surface-200">Bears: <strong className="text-surface-100">{bears}</strong></span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-warning" />
                  <span className="text-sm text-surface-200">Neutral: <strong className="text-surface-100">{neutrals}</strong></span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-surface-300">Round <span className="text-surface-100 font-bold text-lg">{viewRoundNum}</span>{!isViewingLatest && <span className="text-xs text-warning ml-1">(viewing history)</span>}</p>
              {flipped > 0 && (
                <p className="text-sm text-warning flex items-center gap-1 justify-end">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {flipped} agent{flipped > 1 ? 's' : ''} flipped
                </p>
              )}
              {shocks.length > 0 && <p className="text-sm text-danger">{shocks.length} shock{shocks.length > 1 ? 's' : ''} injected</p>}
              {report && (
                <p className="text-sm text-accent-400 flex items-center gap-1 justify-end">
                  <FileText className="w-3.5 h-3.5" /> Report ready
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Round Timeline */}
      {rounds.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {rounds.map((round, i) => {
            const isShockRound = shocks.some(s => s.round === i + 1)
            const roundAvg = round.reduce((sum, r) => sum + (SENTIMENT_LEVELS[r.sentiment]?.score || 0), 0) / round.length
            const isSelected = i === viewIdx
            return (
              <button key={i} onClick={() => setSelectedRoundIdx(i === rounds.length - 1 ? -1 : i)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isSelected ? 'bg-primary-600/20 border-primary-500/50 text-primary-400' : 'bg-surface-800 border-surface-700 text-surface-300 hover:bg-surface-700'
              } ${isShockRound ? 'ring-2 ring-danger/50' : ''}`}>
                <span className="block text-xs">Round {i + 1}</span>
                <span className={`text-xs ${roundAvg > 0 ? 'text-success' : roundAvg < 0 ? 'text-danger' : 'text-warning'}`}>
                  {roundAvg > 0 ? '+' : ''}{roundAvg.toFixed(2)}
                </span>
                {isShockRound && <Zap className="w-3 h-3 text-danger inline ml-1" />}
              </button>
            )
          })}
        </div>
      )}

      {/* Arguments Overview — group agents by stance */}
      {viewRound.length > 0 && currentRound >= 2 && (
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6 fade-in">
          <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            Arguments by Stance — Round {viewRoundNum}
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {/* Bulls */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-success">Bullish ({viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0).length})</span>
              </div>
              {viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) > 0).map(r => (
                <div key={r.agentId} className="bg-success/5 border border-success/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: r.agent.color + '30', color: r.agent.color }}>
                      {r.agent.avatar}
                    </div>
                    <span className="text-xs font-semibold text-surface-100">{r.agent.name}</span>
                    <span className="text-xs text-success ml-auto">{r.confidence}%</span>
                  </div>
                  <p className="text-xs text-surface-200 leading-relaxed line-clamp-3">{r.analysis}</p>
                </div>
              ))}
            </div>
            {/* Neutral */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Minus className="w-4 h-4 text-warning" />
                <span className="text-sm font-semibold text-warning">Neutral ({viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) === 0).length})</span>
              </div>
              {viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) === 0).map(r => (
                <div key={r.agentId} className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: r.agent.color + '30', color: r.agent.color }}>
                      {r.agent.avatar}
                    </div>
                    <span className="text-xs font-semibold text-surface-100">{r.agent.name}</span>
                    <span className="text-xs text-warning ml-auto">{r.confidence}%</span>
                  </div>
                  <p className="text-xs text-surface-200 leading-relaxed line-clamp-3">{r.analysis}</p>
                </div>
              ))}
            </div>
            {/* Bears */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-danger" />
                <span className="text-sm font-semibold text-danger">Bearish ({viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0).length})</span>
              </div>
              {viewRound.filter(r => (SENTIMENT_LEVELS[r.sentiment]?.score || 0) < 0).map(r => (
                <div key={r.agentId} className="bg-danger/5 border border-danger/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: r.agent.color + '30', color: r.agent.color }}>
                      {r.agent.avatar}
                    </div>
                    <span className="text-xs font-semibold text-surface-100">{r.agent.name}</span>
                    <span className="text-xs text-danger ml-auto">{r.confidence}%</span>
                  </div>
                  <p className="text-xs text-surface-200 leading-relaxed line-clamp-3">{r.analysis}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Agent Debate — Key Clashes */}
      {debates.length > 0 && (
        <div className="bg-surface-900 border border-accent-500/30 rounded-xl p-6 fade-in">
          <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-4">
            <Swords className="w-5 h-5 text-accent-400" />
            Agent Debate — Key Clashes
          </h2>
          <div className="space-y-4">
            {debates.map((debate, i) => (
              <div key={i} className="bg-surface-800/50 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-surface-800 flex items-center gap-2 text-xs text-surface-300 uppercase tracking-wider">
                  <MessageSquare className="w-3 h-3" />
                  {debate.type === 'clash' ? 'Primary Clash' : 'Secondary Debate'}
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                      style={{ backgroundColor: debate.attacker.agent.color + '30', color: debate.attacker.agent.color }}>
                      {debate.attacker.agent.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-surface-100">{debate.attacker.agent.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-danger/20 text-danger">Challenges</span>
                      </div>
                      <p className="text-sm text-surface-200 leading-relaxed">{debate.attackText}</p>
                      {/* Show the agent's actual analysis as supporting evidence */}
                      <div className="mt-2 pl-3 border-l-2 border-danger/30">
                        <p className="text-xs text-surface-300 italic">{debate.attacker.analysis?.slice(0, 200)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-12">
                    <ArrowRight className="w-3 h-3 text-surface-700" />
                    <span className="text-xs text-surface-700">responds to</span>
                    <ArrowRight className="w-3 h-3 text-surface-700" />
                  </div>
                  <div className="flex items-start gap-3 pl-4 border-l-2 border-primary-500/30">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1"
                      style={{ backgroundColor: debate.defender.agent.color + '30', color: debate.defender.agent.color }}>
                      {debate.defender.agent.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-surface-100">{debate.defender.agent.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary-600/20 text-primary-400">Defends</span>
                      </div>
                      <p className="text-sm text-surface-200 leading-relaxed">{debate.defenseText}</p>
                      <div className="mt-2 pl-3 border-l-2 border-primary-500/30">
                        <p className="text-xs text-surface-300 italic">{debate.defender.analysis?.slice(0, 200)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consensus Conclusion */}
      {conclusion && (
        <div className="bg-surface-900 border border-warning/30 rounded-xl p-6 fade-in">
          <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-warning" />
            Final Consensus Conclusion
          </h2>
          <div className="flex items-center gap-6 mb-5">
            <div className={`text-3xl font-black px-6 py-3 rounded-xl ${
              conclusion.verdict.includes('BUY') ? 'bg-success/20 text-success' : conclusion.verdict.includes('SELL') ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
            }`}>{conclusion.verdict}</div>
            <div className="flex-1">
              <div className="flex items-center gap-4 text-sm mb-2">
                <span className="text-success">{conclusion.voteBreakdown.bulls} Bulls</span>
                <span className="text-surface-300">|</span>
                <span className="text-danger">{conclusion.voteBreakdown.bears} Bears</span>
                <span className="text-surface-300">|</span>
                <span className="text-warning">{conclusion.voteBreakdown.neutrals} Neutral</span>
              </div>
              <div className="w-full bg-surface-800 rounded-full h-3 flex overflow-hidden">
                <div className="bg-success h-full" style={{ width: `${(conclusion.voteBreakdown.bulls / AGENTS.length) * 100}%` }} />
                <div className="bg-warning h-full" style={{ width: `${(conclusion.voteBreakdown.neutrals / AGENTS.length) * 100}%` }} />
                <div className="bg-danger h-full" style={{ width: `${(conclusion.voteBreakdown.bears / AGENTS.length) * 100}%` }} />
              </div>
            </div>
          </div>
          <p className="text-sm text-surface-200 leading-relaxed mb-5">{conclusion.explanation}</p>
          {conclusion.keyDebatePoints.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-3">Key Arguments</h3>
              <div className="space-y-2">
                {conclusion.keyDebatePoints.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 mt-0.5 ${
                      p.side === 'bull' ? 'bg-success/20 text-success' : p.side === 'bear' ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
                    }`}>{p.side.toUpperCase()}</span>
                    <div>
                      <span className="text-sm text-surface-100 font-medium">{p.agent}</span>
                      <span className="text-sm text-surface-300"> — {p.point}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-3">Recommended Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {conclusion.actionItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 bg-surface-800/50 rounded-lg px-3 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                  <span className="text-sm text-surface-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-surface-800 flex items-center justify-between text-xs text-surface-300">
            <span>Based on {conclusion.totalRounds} rounds{conclusion.shockCount > 0 ? ` + ${conclusion.shockCount} shock(s)` : ''}</span>
            <span>Weighted Sentiment: <span className={`font-mono ${conclusion.weightedSentiment > 0 ? 'text-success' : conclusion.weightedSentiment < 0 ? 'text-danger' : 'text-warning'}`}>{conclusion.weightedSentiment > 0 ? '+' : ''}{conclusion.weightedSentiment}</span></span>
          </div>
        </div>
      )}

      {/* Agent Responses Grid */}
      {viewRound.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-400" />
              Round {viewRoundNum} — Individual Agent Responses
              {!isViewingLatest && <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">Historical</span>}
            </h2>
            <div className="flex gap-1">
              {!isViewingLatest && (
                <button onClick={() => setSelectedRoundIdx(-1)}
                  className="px-3 py-1.5 rounded text-xs font-medium bg-primary-600/20 text-primary-400 mr-2 hover:bg-primary-600/30 transition-colors">
                  Back to Latest
                </button>
              )}
              {['grid', 'list'].map(v => (
                <button key={v} onClick={() => setActiveView(v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium capitalize ${activeView === v ? 'bg-primary-600 text-white' : 'bg-surface-800 text-surface-300'}`}
                >{v}</button>
              ))}
            </div>
          </div>
          <div className={activeView === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
            {viewRound.map(response => (
              <AgentCard key={response.agentId} response={response} compact={activeView === 'grid' && rounds.length > 2} />
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {rounds.length === 0 && (
        <div className="bg-surface-900 border border-surface-800 border-dashed rounded-xl p-16 text-center">
          <Brain className="w-16 h-16 text-surface-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-surface-100 mb-2">Ready to Simulate</h3>
          <p className="text-surface-300 max-w-md mx-auto mb-4">
            Search for a stock above or enter a market event, then click "Run Round 1" to see {AGENTS.length} agents debate.
            After 4 rounds, they reach a final consensus with a buy/sell/hold verdict.
          </p>
          <div className="flex justify-center gap-4 text-xs text-surface-300 mb-4">
            <span className="flex items-center gap-1"><Play className="w-3 h-3" /> Run rounds</span>
            <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /></span>
            <span className="flex items-center gap-1"><Swords className="w-3 h-3" /> Agents argue</span>
            <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /></span>
            <span className="flex items-center gap-1"><Award className="w-3 h-3" /> Final verdict at Round 4</span>
          </div>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
            claudeMode ? 'bg-accent-600/20 text-accent-400 border border-accent-500/30' : 'bg-surface-800 text-surface-300 border border-surface-700'
          }`}>
            <Cpu className="w-3 h-3" />
            {claudeMode ? 'Claude AI mode' : 'Deterministic mode — click settings to enable Claude AI'}
          </div>
        </div>
      )}

      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
