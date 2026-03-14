import { useState } from 'react'
import { AGENTS, SENTIMENT_LEVELS } from '../engine/agents'
import { TrendingUp, TrendingDown, Minus, Shield, Target, Brain, BarChart3 } from 'lucide-react'

export default function Agents() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0])

  return (
    <div className="p-6 space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-100">Agent Profiles</h1>
        <p className="text-surface-300 text-sm mt-1">
          Deep-dive into each of the 12 AI market agents — their biases, strategies, and sectors
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Agent List */}
        <div className="col-span-4 space-y-2">
          {AGENTS.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                selectedAgent.id === agent.id
                  ? 'bg-surface-800 border border-primary-500/50'
                  : 'bg-surface-900 border border-surface-800 hover:bg-surface-800/50'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ backgroundColor: agent.color + '30', color: agent.color }}
              >
                {agent.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-surface-100 truncate">{agent.name}</p>
                <p className="text-xs text-surface-300 truncate">{agent.role}</p>
              </div>
              <div className="ml-auto shrink-0">
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium capitalize"
                  style={{
                    backgroundColor: agent.bias === 'bullish' ? '#10b98120' : agent.bias === 'bearish' ? '#ef444420' : '#f59e0b20',
                    color: agent.bias === 'bullish' ? '#10b981' : agent.bias === 'bearish' ? '#ef4444' : '#f59e0b',
                  }}
                >
                  {agent.bias}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Agent Detail */}
        <div className="col-span-8 space-y-4">
          {/* Profile Header */}
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
            <div className="flex items-start gap-5">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: selectedAgent.color + '30', color: selectedAgent.color }}
              >
                {selectedAgent.avatar}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-surface-100">{selectedAgent.name}</h2>
                <p className="text-primary-400 font-medium">{selectedAgent.role}</p>
                <p className="text-surface-200 text-sm mt-3 leading-relaxed">{selectedAgent.style}</p>
                <p className="text-surface-300 text-sm mt-2 italic">"{selectedAgent.personality}"</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                {selectedAgent.bias === 'bullish' ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : selectedAgent.bias === 'bearish' ? (
                  <TrendingDown className="w-5 h-5 text-danger" />
                ) : (
                  <Minus className="w-5 h-5 text-warning" />
                )}
                <span className="text-xs text-surface-300 uppercase tracking-wider">Bias</span>
              </div>
              <p className="text-xl font-bold text-surface-100 capitalize">{selectedAgent.bias}</p>
              <p className="text-xs text-surface-300 mt-1">Default market stance</p>
            </div>

            <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-accent-400" />
                <span className="text-xs text-surface-300 uppercase tracking-wider">Risk Tolerance</span>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-xl font-bold text-surface-100">{(selectedAgent.riskTolerance * 100).toFixed(0)}%</p>
              </div>
              <div className="w-full bg-surface-800 rounded-full h-2 mt-2">
                <div
                  className="h-2 rounded-full"
                  style={{
                    width: `${selectedAgent.riskTolerance * 100}%`,
                    backgroundColor: selectedAgent.riskTolerance > 0.7 ? '#ef4444' : selectedAgent.riskTolerance > 0.4 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
              <p className="text-xs text-surface-300 mt-1">
                {selectedAgent.riskTolerance > 0.7 ? 'High risk, high reward' : selectedAgent.riskTolerance > 0.4 ? 'Moderate risk management' : 'Conservative, capital preservation'}
              </p>
            </div>

            <div className="bg-surface-900 border border-surface-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-primary-400" />
                <span className="text-xs text-surface-300 uppercase tracking-wider">Focus Sectors</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedAgent.sectors.map(s => (
                  <span
                    key={s}
                    className="text-xs px-2.5 py-1 rounded-md border capitalize"
                    style={{ borderColor: selectedAgent.color + '40', color: selectedAgent.color, backgroundColor: selectedAgent.color + '10' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis Framework */}
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-surface-100 mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent-400" />
              Analysis Framework
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs text-surface-300 uppercase tracking-wider mb-3">Key Strengths</h4>
                <ul className="space-y-2">
                  {getStrengths(selectedAgent).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-200">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: selectedAgent.color }} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-xs text-surface-300 uppercase tracking-wider mb-3">Known Blind Spots</h4>
                <ul className="space-y-2">
                  {getWeaknesses(selectedAgent).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-surface-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-surface-300 mt-1.5 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Behavioral Patterns */}
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-surface-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-400" />
              Behavioral Patterns
            </h3>
            <div className="space-y-3">
              {getBehaviors(selectedAgent).map((b, i) => (
                <div key={i} className="bg-surface-800/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-surface-100 mb-1">{b.trigger}</p>
                  <p className="text-sm text-surface-300">{b.reaction}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getStrengths(agent) {
  const map = {
    'macro-bull': ['Excellent at spotting growth inflection points', 'Strong GDP and employment data analysis', 'Good at identifying cyclical opportunities'],
    'doom-bear': ['Best at identifying systemic risks early', 'Protects capital in downturns', 'Credit market expertise unmatched'],
    'quant-algo': ['Removes emotional bias completely', 'Statistical edge in momentum regimes', 'Disciplined position sizing'],
    'crypto-max': ['Deep understanding of on-chain dynamics', 'Early mover in crypto narratives', 'Strong conviction in high-beta trades'],
    'tech-growth': ['Identifies secular growth trends early', 'Strong understanding of AI/cloud economics', 'Good at valuing high-growth businesses'],
    'value-hunter': ['Disciplined downside protection', 'Excels in late-cycle environments', 'Patient capital allocation'],
    'fed-watcher': ['Best at interpreting Fed communications', 'Rate-sensitive sector expertise', 'Yield curve analysis mastery'],
    'geopolitical': ['Identifies supply chain risks before markets', 'Commodity price impact analysis', 'Strong in crisis scenarios'],
    'retail-pulse': ['Real-time sentiment data', 'Options flow analysis', 'Identifies short-squeeze setups'],
    'income-yield': ['Consistent income generation', 'Dividend sustainability analysis', 'Low volatility portfolio construction'],
    'emerging-mkts': ['Global macro perspective', 'Currency and EM-specific expertise', 'Diversification benefits'],
    'volatility-arb': ['Profits in any market regime', 'Tail risk hedging expertise', 'Options pricing edge'],
  }
  return map[agent.id] || ['Specialized domain expertise', 'Data-driven analysis', 'Consistent methodology']
}

function getWeaknesses(agent) {
  const map = {
    'macro-bull': ['Tends to underestimate bear markets', 'Slow to recognize recession signals', 'May hold too long in downturns'],
    'doom-bear': ['Misses rallies by being too cautious', 'Opportunity cost from over-hedging', 'Can be early on short calls'],
    'quant-algo': ['Fails in regime changes', 'No qualitative judgment', 'Can be blindsided by unprecedented events'],
    'crypto-max': ['Extreme volatility tolerance may not suit all', 'Correlation blind spot in risk-off events', 'Sometimes too bullish on altcoins'],
    'tech-growth': ['Ignores valuation concerns too easily', 'Concentrated sector risk', 'Vulnerable to rate hikes'],
    'value-hunter': ['Can catch falling knives', 'Underperforms in growth-led markets', 'May miss momentum opportunities'],
    'fed-watcher': ['Over-focuses on monetary policy', 'May miss fiscal policy shifts', 'Can over-interpret Fed language'],
    'geopolitical': ['Can be overly pessimistic', 'Hard to time geopolitical events', 'May overweight tail risks'],
    'retail-pulse': ['Follows noise sometimes', 'Short-term focus', 'Can get caught in squeeze reversals'],
    'income-yield': ['Misses growth opportunities', 'Interest rate sensitivity', 'May hold declining dividend payers too long'],
    'emerging-mkts': ['Dollar strength blind spot', 'Political risk hard to quantify', 'Liquidity risk in stress'],
    'volatility-arb': ['Can blow up if vol stays elevated', 'Complex strategies hard to unwind', 'Tail risk of selling too much premium'],
  }
  return map[agent.id] || ['May have sector-specific blind spots', 'Could miss cross-asset correlations', 'Limited by methodology constraints']
}

function getBehaviors(agent) {
  const map = {
    'macro-bull': [
      { trigger: 'When GDP beats expectations', reaction: 'Immediately increases equity exposure, especially cyclicals and industrials' },
      { trigger: 'When unemployment ticks up', reaction: 'Slowly rotates from offensive to defensive, but stays net long' },
      { trigger: 'When other agents turn bearish', reaction: 'Often doubles down on bull thesis, citing long-term growth trends' },
    ],
    'doom-bear': [
      { trigger: 'When credit spreads widen', reaction: 'Goes maximum bearish — adds VIX calls, shorts high-yield, buys gold' },
      { trigger: 'When markets rally to new highs', reaction: 'Warns about complacency, increases hedges, waits for the "inevitable" correction' },
      { trigger: 'When bulls form a coalition', reaction: 'Becomes more vocal about risks, often contrarian to the crowd' },
    ],
    'quant-algo': [
      { trigger: 'When momentum z-score exceeds +2', reaction: 'Full long position with tight stop losses at 1 standard deviation' },
      { trigger: 'When volatility regime shifts', reaction: 'Cuts position sizes by 50%, waits for model convergence' },
      { trigger: 'When other agents disagree with model', reaction: 'Ignores qualitative arguments, trusts the model output exclusively' },
    ],
    'crypto-max': [
      { trigger: 'When BTC breaks key resistance', reaction: 'Goes all-in with leveraged longs, adds altcoin exposure' },
      { trigger: 'When regulation news breaks', reaction: 'Initially sells, then looks for "buy the news" opportunity within 24-48 hours' },
      { trigger: 'When traditional finance agents are bearish', reaction: 'Sees it as a buying opportunity — crypto thrives on TradFi skepticism' },
    ],
    'tech-growth': [
      { trigger: 'When AI capex numbers beat', reaction: 'Loads up on semiconductor and cloud infrastructure names' },
      { trigger: 'When rates rise sharply', reaction: 'Reluctantly trims high-multiple names, rotates to cash-flow positive tech' },
      { trigger: 'When Value Hunter criticizes valuations', reaction: 'Dismisses P/E-based criticism, argues growth justifies premium' },
    ],
    'value-hunter': [
      { trigger: 'When P/E ratios hit extremes', reaction: 'Raises cash, waits for the mean reversion trade' },
      { trigger: 'When quality stocks sell off', reaction: 'Deploys cash aggressively into businesses below intrinsic value' },
      { trigger: 'When growth stocks rally', reaction: 'Stays disciplined, refuses to chase momentum, focuses on free cash flow' },
    ],
    'fed-watcher': [
      { trigger: 'When Powell uses new language', reaction: 'Immediately re-calibrates rate expectations, adjusts duration exposure' },
      { trigger: 'When yield curve inverts', reaction: 'Goes maximum cautious, warns about recession timeline' },
      { trigger: 'When inflation data surprises', reaction: 'Re-runs Fed reaction function model, updates terminal rate forecast' },
    ],
    'geopolitical': [
      { trigger: 'When military tensions escalate', reaction: 'Buys defense, energy, and gold. Shorts consumer discretionary' },
      { trigger: 'When trade deal is announced', reaction: 'Cautiously optimistic, reduces geopolitical risk premium slowly' },
      { trigger: 'When other agents ignore geo-risk', reaction: 'Becomes more vocal, warns about tail scenarios with specific probabilities' },
    ],
    'retail-pulse': [
      { trigger: 'When WSB sentiment spikes', reaction: 'Rides the momentum with options, sets tight profit targets' },
      { trigger: 'When retail capitulates', reaction: 'Starts looking for contrarian long setups — retail pain is often the bottom' },
      { trigger: 'When put/call ratio extremes', reaction: 'Uses as a timing signal — extreme puts = bullish, extreme calls = cautious' },
    ],
    'income-yield': [
      { trigger: 'When dividend yields expand', reaction: 'Systematically buys the highest quality names yielding above 4%' },
      { trigger: 'When interest rates fall', reaction: 'Rotates into REITs and longer-duration bonds for total return' },
      { trigger: 'When growth agents chase momentum', reaction: 'Stays the course, collects dividends, compounds quietly' },
    ],
    'emerging-mkts': [
      { trigger: 'When dollar weakens', reaction: 'Aggressively buys EM equities and local currency bonds' },
      { trigger: 'When China PMI surprises up', reaction: 'Adds to EM basket, especially commodity exporters and Asian tech' },
      { trigger: 'When capital flight news breaks', reaction: 'Reduces exposure, waits for stabilization before re-entering' },
    ],
    'volatility-arb': [
      { trigger: 'When VIX spikes above 30', reaction: 'Starts selling premium — puts, straddles, and VIX call spreads' },
      { trigger: 'When IV/RV ratio exceeds 1.5', reaction: 'Maximum premium selling mode — the market is overpaying for protection' },
      { trigger: 'When all agents agree', reaction: 'Gets nervous — consensus is the enemy of vol traders. Adds tail hedges' },
    ],
  }
  return map[agent.id] || [
    { trigger: 'Standard market event', reaction: 'Analyzes through specialized framework' },
  ]
}
