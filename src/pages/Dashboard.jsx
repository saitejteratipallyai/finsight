import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Activity, DollarSign, BarChart3, Brain, ArrowRight, Zap, X, ChevronRight, Plus } from 'lucide-react'
import { ALL_KNOWN_TICKERS, DEFAULT_WATCHLIST_TICKERS } from '../data/marketData'
import { AGENTS } from '../engine/agents'
import TickerSearch from '../components/TickerSearch'

const WL_KEY = 'finsight_watchlist'

function loadWatchlist() {
  try {
    const saved = localStorage.getItem(WL_KEY)
    if (saved) {
      const symbols = JSON.parse(saved)
      const tickers = symbols.map(s => ALL_KNOWN_TICKERS.find(t => t.symbol === s)).filter(Boolean)
      return tickers.length ? tickers : DEFAULT_WATCHLIST_TICKERS
    }
  } catch {}
  return DEFAULT_WATCHLIST_TICKERS
}

function getTickerHistory(symbol) {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const ticker = ALL_KNOWN_TICKERS.find(t => t.symbol === symbol)
  if (!ticker) return []
  const basePrice = ticker.price
  const data = []
  let price = basePrice * (0.85 + (seed % 30) / 100)
  for (let i = 90; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const rng = Math.sin(seed * 9301 + i * 4973) * 10000
    const change = (rng - Math.floor(rng) - 0.48) * (basePrice * 0.015)
    price = Math.max(basePrice * 0.7, Math.min(basePrice * 1.3, price + change))
    const sma20 = i > 20 ? price + (Math.sin(seed + i * 0.3) * basePrice * 0.02) : null
    const sma50 = i > 50 ? price + (Math.sin(seed + i * 0.1) * basePrice * 0.03) : null
    const rsi = Math.max(15, Math.min(85, 50 + Math.sin(seed + i * 0.5) * 25))
    const macd = Math.sin(seed + i * 0.2) * 2
    const signal = Math.sin(seed + i * 0.15) * 1.5
    data.push({
      date: date.toISOString().split('T')[0],
      price: Math.round(price * 100) / 100,
      sma20: sma20 ? Math.round(sma20 * 100) / 100 : null,
      sma50: sma50 ? Math.round(sma50 * 100) / 100 : null,
      rsi: Math.round(rsi * 10) / 10,
      macd: Math.round(macd * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round((macd - signal) * 100) / 100,
      volume: Math.round(500000 + Math.abs(Math.sin(seed + i)) * 5000000),
    })
  }
  return data
}

function StatCard({ icon: Icon, label, value, change, color, onClick }) {
  const isPositive = change >= 0
  return (
    <div className="card p-5 transition-shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all" onClick={onClick}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '12' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className={`text-xs font-semibold flex items-center gap-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {isPositive ? '+' : ''}{change}%
        </span>
      </div>
      <p className="text-xl font-semibold text-surface-100">{value}</p>
      <p className="text-xs text-surface-300 mt-1">{label}</p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedTicker, setSelectedTicker] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [watchlist, setWatchlist] = useState(loadWatchlist)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [addQuery, setAddQuery] = useState('')
  const addPickerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(WL_KEY, JSON.stringify(watchlist.map(t => t.symbol)))
  }, [watchlist])

  useEffect(() => {
    const handleClick = (e) => {
      if (addPickerRef.current && !addPickerRef.current.contains(e.target)) {
        setShowAddPicker(false)
        setAddQuery('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const removeTicker = (symbol) => {
    if (watchlist.length <= 1) return
    setWatchlist(prev => prev.filter(t => t.symbol !== symbol))
    if (selectedTicker?.symbol === symbol) setSelectedTicker(null)
  }

  const addTicker = (ticker) => {
    if (!watchlist.find(t => t.symbol === ticker.symbol)) {
      setWatchlist(prev => [...prev, ticker])
    }
    setShowAddPicker(false)
    setAddQuery('')
  }

  const availableTickers = useMemo(() => {
    const inList = new Set(watchlist.map(t => t.symbol))
    const pool = ALL_KNOWN_TICKERS.filter(t => !inList.has(t.symbol))
    if (!addQuery.trim()) return pool
    const q = addQuery.toLowerCase()
    return pool.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
  }, [watchlist, addQuery])

  const marketSentiment = useMemo(() => {
    const positive = watchlist.filter(t => t.change > 0).length
    return ((positive / watchlist.length) * 100).toFixed(0)
  }, [watchlist])

  const filteredTickers = useMemo(() => {
    if (!searchQuery.trim()) return watchlist
    const q = searchQuery.toLowerCase()
    return watchlist.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.sector.toLowerCase().includes(q)
    )
  }, [searchQuery, watchlist])

  const tickerHistory = useMemo(() => {
    if (!selectedTicker) return []
    return getTickerHistory(selectedTicker.symbol)
  }, [selectedTicker])

  const handleRowClick = (ticker) => {
    setSelectedTicker(prev => prev?.symbol === ticker.symbol ? null : ticker)
  }

  const handleAnalyze = (symbol) => {
    navigate('/simulation', { state: { ticker: symbol } })
  }

  return (
    <div className="p-8 space-y-6 fade-in max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-surface-100">Dashboard</h1>
          <p className="text-surface-300 text-sm mt-0.5">Real-time market overview</p>
        </div>
        <button
          onClick={() => navigate('/simulation')}
          className="flex items-center gap-2 bg-surface-100 hover:bg-surface-200 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
        >
          <Brain className="w-4 h-4" />
          Run Simulation
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={BarChart3} label="S&P 500" value="5,823.40" change={0.21} color="#3b82f6" onClick={() => handleAnalyze('SPY')} />
        <StatCard icon={Activity} label="VIX (Fear Index)" value="14.32" change={-3.20} color="#8b5cf6" onClick={() => handleAnalyze('VIX')} />
        <StatCard icon={DollarSign} label="Bitcoin" value="$97,250" change={2.26} color="#f59e0b" onClick={() => handleAnalyze('BTC-USD')} />
        <StatCard icon={Zap} label="Market Sentiment" value={`${marketSentiment}% Bullish`} change={1.5} color="#10b981" onClick={() => navigate('/simulation')} />
      </div>

      {/* Stock Detail Panel */}
      {selectedTicker && (
        <div className="card overflow-hidden fade-in ring-1 ring-primary-400/20">
          <div className="px-6 py-5 border-b border-black/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-surface-100 flex items-center gap-2">
                  {selectedTicker.symbol}
                  <span className="text-sm font-normal text-surface-300">{selectedTicker.name}</span>
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-2xl font-semibold text-surface-100 font-mono">
                    ${typeof selectedTicker.price === 'number' ? selectedTicker.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : selectedTicker.price}
                  </span>
                  <span className={`text-sm font-semibold flex items-center gap-1 ${selectedTicker.change >= 0 ? 'text-success' : 'text-danger'}`}>
                    {selectedTicker.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {selectedTicker.change >= 0 ? '+' : ''}{selectedTicker.change.toFixed(2)} ({selectedTicker.changePct >= 0 ? '+' : ''}{selectedTicker.changePct.toFixed(2)}%)
                  </span>
                  <span className="text-xs px-2 py-1 rounded-full bg-surface-800 text-surface-300">{selectedTicker.sector}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAnalyze(selectedTicker.symbol)}
                className="flex items-center gap-2 bg-surface-100 hover:bg-surface-200 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Brain className="w-4 h-4" />
                Analyze
              </button>
              <button
                onClick={() => setSelectedTicker(null)}
                className="p-2 rounded-lg hover:bg-surface-800 text-surface-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-0">
            <div className="col-span-2 p-6 border-r border-black/[0.04]">
              <h3 className="text-xs font-medium text-surface-300 uppercase tracking-wider mb-3">Price (90d)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={tickerHistory.slice(-60)}>
                  <defs>
                    <linearGradient id="detailPriceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={d => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} labelStyle={{ color: '#64748b' }} />
                  <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="url(#detailPriceGrad)" strokeWidth={2} />
                  <Line type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="sma50" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-2 text-xs text-surface-300">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#3b82f6] inline-block" /> Price</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#f59e0b] inline-block" style={{ borderTop: '1px dashed #f59e0b' }} /> SMA 20</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#ef4444] inline-block" style={{ borderTop: '1px dashed #ef4444' }} /> SMA 50</span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xs font-medium text-surface-300 uppercase tracking-wider mb-3">RSI (14)</h3>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={tickerHistory.slice(-60)}>
                    <defs>
                      <linearGradient id="detailRsiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} domain={[0, 100]} ticks={[30, 50, 70]} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    <Area type="monotone" dataKey="rsi" stroke="#8b5cf6" fill="url(#detailRsiGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div>
                <h3 className="text-xs font-medium text-surface-300 uppercase tracking-wider mb-3">MACD</h3>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={tickerHistory.slice(-60)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                    <Bar dataKey="histogram" fill="#3b82f6">
                      {tickerHistory.slice(-60).map((entry, index) => (
                        <rect key={index} fill={entry.histogram >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-surface-300 uppercase tracking-wider">Key Stats</h3>
                {tickerHistory.length > 0 && (() => {
                  const latest = tickerHistory[tickerHistory.length - 1]
                  const rsiVal = latest.rsi
                  const rsiStatus = rsiVal > 70 ? 'Overbought' : rsiVal < 30 ? 'Oversold' : 'Neutral'
                  const rsiColor = rsiVal > 70 ? 'text-danger' : rsiVal < 30 ? 'text-success' : 'text-warning'
                  return (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-surface-300">RSI</span>
                        <span className={rsiColor}>{rsiVal.toFixed(1)} ({rsiStatus})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-300">MACD</span>
                        <span className={latest.histogram >= 0 ? 'text-success' : 'text-danger'}>{latest.macd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-300">Volume</span>
                        <span className="text-surface-200">{selectedTicker.volume}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Watchlist */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-surface-100">Market Watchlist</h2>
            <span className="text-xs text-surface-300">{watchlist.length} tickers</span>
            <div className="relative" ref={addPickerRef}>
              <button
                onClick={() => setShowAddPicker(!showAddPicker)}
                className="w-7 h-7 rounded-lg bg-surface-800 hover:bg-surface-700 flex items-center justify-center text-surface-300 hover:text-surface-100 transition-colors"
                title="Add ticker"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {showAddPicker && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-black/[0.06] z-50 overflow-hidden">
                  <div className="p-2 border-b border-black/[0.04]">
                    <input
                      type="text"
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="Search tickers to add..."
                      className="w-full px-3 py-2 text-sm rounded-lg bg-surface-950 border-none outline-none text-surface-100 placeholder:text-surface-400"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {availableTickers.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-surface-300 text-center">No tickers available</p>
                    ) : (
                      availableTickers.map(t => (
                        <button
                          key={t.symbol}
                          onClick={() => addTicker(t)}
                          className="w-full text-left px-4 py-2.5 hover:bg-surface-950 flex items-center justify-between transition-colors"
                        >
                          <div>
                            <span className="text-sm font-semibold text-primary-500">{t.symbol}</span>
                            <span className="text-xs text-surface-300 ml-2">{t.name}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-300">{t.sector}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <TickerSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onSelect={(symbol) => {
              const ticker = watchlist.find(t => t.symbol === symbol) || ALL_KNOWN_TICKERS.find(t => t.symbol === symbol)
              if (ticker) {
                setSelectedTicker(ticker)
                setSearchQuery('')
              } else {
                handleAnalyze(symbol)
              }
            }}
            placeholder="Search symbol, name, or sector..."
            className="w-72"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px]">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="text-left text-[11px] text-surface-300 font-medium pl-5 pr-3 py-3 uppercase tracking-wider">Symbol</th>
                <th className="text-left text-[11px] text-surface-300 font-medium px-3 py-3 uppercase tracking-wider">Name</th>
                <th className="text-right text-[11px] text-surface-300 font-medium px-3 py-3 uppercase tracking-wider">Price</th>
                <th className="text-right text-[11px] text-surface-300 font-medium px-3 py-3 uppercase tracking-wider">Change</th>
                <th className="text-right text-[11px] text-surface-300 font-medium px-3 py-3 uppercase tracking-wider">%</th>
                <th className="text-right text-[11px] text-surface-300 font-medium px-3 py-3 uppercase tracking-wider">Volume</th>
                <th className="text-center text-[11px] text-surface-300 font-medium px-3 py-3 uppercase tracking-wider">Sector</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTickers.map(t => (
                <tr
                  key={t.symbol}
                  onClick={() => handleRowClick(t)}
                  className={`group border-b border-black/[0.03] cursor-pointer transition-colors ${
                    selectedTicker?.symbol === t.symbol
                      ? 'bg-primary-50/50'
                      : 'hover:bg-surface-950'
                  }`}
                >
                  <td className="pl-5 pr-3 py-3 text-sm font-semibold text-primary-500 whitespace-nowrap">{t.symbol}</td>
                  <td className="px-3 py-3 text-sm text-surface-200 whitespace-nowrap">{t.name}</td>
                  <td className="px-3 py-3 text-sm text-surface-100 font-mono text-right whitespace-nowrap">
                    ${typeof t.price === 'number' ? t.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : t.price}
                  </td>
                  <td className={`px-3 py-3 text-sm font-mono text-right whitespace-nowrap ${t.change >= 0 ? 'text-success' : 'text-danger'}`}>
                    {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}
                  </td>
                  <td className={`px-3 py-3 text-sm font-mono text-right whitespace-nowrap ${t.changePct >= 0 ? 'text-success' : 'text-danger'}`}>
                    {t.changePct >= 0 ? '+' : ''}{t.changePct.toFixed(2)}%
                  </td>
                  <td className="px-3 py-3 text-sm text-surface-300 font-mono text-right whitespace-nowrap">{t.volume}</td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-800 text-surface-300">{t.sector}</span>
                  </td>
                  <td className="px-2 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); removeTicker(t.symbol) }}
                        className={`w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/10 hover:text-danger text-surface-400 ${watchlist.length <= 1 ? 'hidden' : ''}`}
                        title="Remove from watchlist"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <ChevronRight className={`w-3.5 h-3.5 text-surface-300 transition-transform ${selectedTicker?.symbol === t.symbol ? 'rotate-90 text-primary-400' : ''}`} />
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTickers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-surface-300 text-sm">
                    No tickers matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-surface-100 mb-4">Agent Network</h2>
        <div className="grid grid-cols-6 gap-3">
          {AGENTS.map(agent => (
            <div
              key={agent.id}
              className="bg-surface-950 rounded-xl p-3 hover:bg-surface-800 transition-colors cursor-pointer"
              onClick={() => navigate('/agents')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: agent.color + '18', color: agent.color }}
                >
                  {agent.avatar}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-success pulse-glow" />
              </div>
              <p className="text-xs font-medium text-surface-100 truncate">{agent.name}</p>
              <p className="text-[10px] text-surface-300 truncate">{agent.role}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
