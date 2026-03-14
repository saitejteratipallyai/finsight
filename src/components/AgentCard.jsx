import { SENTIMENT_LEVELS } from '../engine/agents'
import { TrendingUp, TrendingDown, Minus, ArrowLeftRight, Globe, Cpu } from 'lucide-react'

export default function AgentCard({ response, compact = false }) {
  const { agent, sentiment, confidence, analysis, trades, flipped, previousSentiment, claudePowered } = response
  const sentimentInfo = SENTIMENT_LEVELS[sentiment]

  const SentimentIcon = sentimentInfo.score > 0 ? TrendingUp : sentimentInfo.score < 0 ? TrendingDown : Minus

  const agentNames = ['Marcus', 'Diana', 'Quinn', 'Max', 'Tara', 'Victor', 'Fiona', 'Geo', 'Riley', 'Irene', 'Elena', 'Vince']
  const mentionsOthers = agentNames.some(name => name !== agent.name.split(' ')[0] && analysis?.includes(name))

  return (
    <div className={`card overflow-hidden slide-up ${
      flipped ? 'ring-2 ring-warning/40' : ''
    }`}>
      <div className="p-4 border-b border-black/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: agent.color + '15', color: agent.color }}
            >
              {agent.avatar}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-surface-100">{agent.name}</h3>
              <p className="text-[11px] text-surface-300">{agent.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {claudePowered && (
              <span className="flex items-center gap-1 text-[10px] bg-accent-600/10 text-accent-500 px-1.5 py-0.5 rounded-md">
                <Cpu className="w-3 h-3" />
                <Globe className="w-3 h-3" />
              </span>
            )}
            {mentionsOthers && (
              <span className="text-[10px] bg-primary-50 text-primary-500 px-1.5 py-0.5 rounded-md font-medium">
                Arguing
              </span>
            )}
            {flipped && (
              <span className="flex items-center gap-1 text-[10px] bg-warning/10 text-warning px-1.5 py-0.5 rounded-md font-medium">
                <ArrowLeftRight className="w-3 h-3" />
                Flipped
              </span>
            )}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: sentimentInfo.color + '12', color: sentimentInfo.color }}
            >
              <SentimentIcon className="w-3 h-3" />
              {sentimentInfo.label}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-surface-300">Confidence</span>
            <span className="text-surface-200 font-medium">{confidence}%</span>
          </div>
          <div className="w-full bg-surface-800 rounded-full h-1">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{ width: `${confidence}%`, backgroundColor: sentimentInfo.color }}
            />
          </div>
        </div>
      </div>

      {!compact && (
        <div className="p-4">
          <p className="text-[11px] text-surface-300 uppercase tracking-wider mb-2 font-medium">
            {mentionsOthers ? 'Argument' : 'Analysis'}
          </p>
          <p className="text-[13px] text-surface-200 leading-relaxed">{analysis}</p>

          {trades && trades.length > 0 && (
            <div className="mt-3 pt-3 border-t border-black/[0.04]">
              <p className="text-[11px] text-surface-300 mb-2 font-medium uppercase tracking-wider">Trades</p>
              <div className="flex flex-wrap gap-1.5">
                {trades.map((trade, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: sentimentInfo.color + '08',
                      color: sentimentInfo.color,
                    }}
                  >
                    {trade}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
