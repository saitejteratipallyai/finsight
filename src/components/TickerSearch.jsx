import { useState, useRef, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, X } from 'lucide-react'
import { generateMarketData } from '../data/marketData'

const allTickers = generateMarketData()

const KNOWN_TICKERS = [
  ...allTickers.map(t => ({ symbol: t.symbol, name: t.name, sector: t.sector, price: t.price, changePct: t.changePct })),
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors', price: 162.50, changePct: 1.2 },
  { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Tech', price: 185.30, changePct: 0.8 },
  { symbol: 'META', name: 'Meta Platforms Inc', sector: 'Tech', price: 505.20, changePct: -0.3 },
  { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Tech', price: 628.40, changePct: 1.5 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', price: 198.70, changePct: 0.4 },
  { symbol: 'V', name: 'Visa Inc', sector: 'Financials', price: 278.90, changePct: 0.2 },
  { symbol: 'XOM', name: 'Exxon Mobil Corp', sector: 'Energy', price: 118.40, changePct: -0.5 },
  { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', price: 542.10, changePct: 0.7 },
  { symbol: 'DOGE-USD', name: 'Dogecoin', sector: 'Crypto', price: 0.162, changePct: 3.2 },
  { symbol: 'XRP-USD', name: 'Ripple', sector: 'Crypto', price: 0.628, changePct: 2.1 },
  { symbol: 'AVAX-USD', name: 'Avalanche', sector: 'Crypto', price: 38.20, changePct: 4.5 },
  { symbol: 'COIN', name: 'Coinbase Global', sector: 'Crypto', price: 225.60, changePct: 2.8 },
  { symbol: 'PLTR', name: 'Palantir Technologies', sector: 'Tech', price: 22.40, changePct: 1.9 },
  { symbol: 'BA', name: 'Boeing Co', sector: 'Industrials', price: 178.30, changePct: -1.2 },
  { symbol: 'DIS', name: 'Walt Disney Co', sector: 'Entertainment', price: 112.80, changePct: 0.3 },
  { symbol: 'CRM', name: 'Salesforce Inc', sector: 'Tech', price: 268.50, changePct: 0.6 },
  { symbol: 'INTC', name: 'Intel Corp', sector: 'Semiconductors', price: 31.20, changePct: -2.1 },
]

export default function TickerSearch({ value, onChange, onSelect, placeholder, className = '' }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  const suggestions = value.trim().length > 0
    ? KNOWN_TICKERS.filter(t => {
        const q = value.toLowerCase()
        return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || t.sector.toLowerCase().includes(q)
      }).slice(0, 8)
    : []

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (ticker) => {
    onSelect(ticker.symbol)
    setShowDropdown(false)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-surface-300 pointer-events-none" />
        <input
          ref={inputRef}
          value={value}
          onChange={e => { onChange(e.target.value); setShowDropdown(true) }}
          onFocus={() => { if (value.trim()) setShowDropdown(true) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (suggestions.length > 0) {
                handleSelect(suggestions[0])
              } else if (value.trim()) {
                onSelect(value.trim().toUpperCase())
              }
              setShowDropdown(false)
            }
            if (e.key === 'Escape') setShowDropdown(false)
          }}
          placeholder={placeholder || 'Search stocks, crypto, ETFs...'}
          className="w-full bg-surface-950 border border-black/[0.08] rounded-lg pl-9 pr-8 py-2 text-sm text-surface-100 placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400 transition-all"
        />
        {value && (
          <button
            onClick={() => { onChange(''); setShowDropdown(false) }}
            className="absolute right-2 text-surface-300 hover:text-surface-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-30 top-full mt-1.5 left-0 w-full bg-white border border-black/[0.08] rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map(t => (
            <button
              key={t.symbol}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(t)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-950 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-primary-500 w-20 shrink-0">{t.symbol}</span>
              <span className="text-sm text-surface-200 flex-1 truncate">{t.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-300 shrink-0">{t.sector}</span>
              <span className={`text-xs font-mono shrink-0 flex items-center gap-0.5 ${t.changePct >= 0 ? 'text-success' : 'text-danger'}`}>
                {t.changePct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {t.changePct >= 0 ? '+' : ''}{t.changePct.toFixed(1)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
