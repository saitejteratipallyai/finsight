import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { FileText, TrendingUp, TrendingDown, AlertTriangle, Shield, Target, ArrowLeft, Users, Zap, Clock, Trash2 } from 'lucide-react'
import { SENTIMENT_LEVELS } from '../engine/agents'
import SentimentGauge from '../components/SentimentGauge'

// Report history helpers
function getReportHistory() {
  try {
    return JSON.parse(localStorage.getItem('finsight_reports') || '[]')
  } catch { return [] }
}

function saveReportToHistory(report) {
  const history = getReportHistory()
  // Avoid duplicates by timestamp
  if (history.some(r => r.timestamp === report.timestamp)) return
  history.unshift(report) // newest first
  // Keep max 20 reports
  if (history.length > 20) history.length = 20
  localStorage.setItem('finsight_reports', JSON.stringify(history))
}

function deleteReportFromHistory(timestamp) {
  const history = getReportHistory().filter(r => r.timestamp !== timestamp)
  localStorage.setItem('finsight_reports', JSON.stringify(history))
}

export default function Report() {
  const location = useLocation()
  const navigate = useNavigate()
  const incomingReport = location.state?.report
  const [report, setReport] = useState(incomingReport || null)
  const [reportHistory, setReportHistory] = useState([])
  const [showHistory, setShowHistory] = useState(!incomingReport)

  // Save incoming report to history and load history
  useEffect(() => {
    if (incomingReport) {
      saveReportToHistory(incomingReport)
      setReport(incomingReport)
      setShowHistory(false)
    }
    setReportHistory(getReportHistory())
  }, [incomingReport])

  const handleSelectReport = (r) => {
    setReport(r)
    setShowHistory(false)
  }

  const handleDeleteReport = (timestamp) => {
    deleteReportFromHistory(timestamp)
    setReportHistory(getReportHistory())
    if (report?.timestamp === timestamp) {
      setReport(null)
      setShowHistory(true)
    }
  }

  // Show history / empty state
  if (!report || showHistory) {
    return (
      <div className="p-6 space-y-6 fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-accent-400" />
              Reports
            </h1>
            <p className="text-surface-300 text-sm mt-1">View current and previous simulation reports</p>
          </div>
          <button
            onClick={() => navigate('/simulation')}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to Simulation
          </button>
        </div>

        {reportHistory.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center max-w-md">
              <FileText className="w-16 h-16 text-surface-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-surface-100 mb-2">No Reports Yet</h2>
              <p className="text-surface-300 text-sm mb-6">
                Run a full simulation (4 rounds) to generate a comprehensive investment analysis report with consensus verdicts, risk assessments, and trade ideas.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {reportHistory.map((r, i) => {
              const verdictColor = r.consensus?.verdict?.includes('BUY') ? 'text-success' : r.consensus?.verdict?.includes('SELL') ? 'text-danger' : 'text-warning'
              return (
                <button
                  key={r.timestamp || i}
                  onClick={() => handleSelectReport(r)}
                  className="w-full text-left bg-surface-900 border border-surface-800 hover:border-surface-600 rounded-xl p-5 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-lg font-bold ${verdictColor}`}>{r.consensus?.verdict || 'N/A'}</span>
                        <span className="text-xs text-surface-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(r.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-surface-200 truncate">{r.seedEvent}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-surface-300">
                        <span>{r.totalRounds} rounds</span>
                        <span className="text-success">{r.consensus?.bulls} bulls</span>
                        <span className="text-danger">{r.consensus?.bears} bears</span>
                        <span className="text-warning">{r.consensus?.neutrals} neutral</span>
                        {r.shocks?.length > 0 && (
                          <span className="text-danger flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {r.shocks.length} shock{r.shocks.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteReport(r.timestamp) }}
                        className="p-2 text-surface-300 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const pieData = [
    { name: 'Bulls', value: report.consensus.bulls, color: '#10b981' },
    { name: 'Bears', value: report.consensus.bears, color: '#ef4444' },
    { name: 'Neutral', value: report.consensus.neutrals, color: '#f59e0b' },
  ]

  const radarData = report.riskFactors.map(r => ({
    factor: r.factor.replace(' Risk', ''),
    level: r.level,
    fullMark: 100,
  }))

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setShowHistory(true); setReport(null) }}
            className="p-2 bg-surface-800 hover:bg-surface-700 rounded-lg transition-colors"
            title="Back to report history"
          >
            <ArrowLeft className="w-5 h-5 text-surface-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-accent-400" />
              Investment Analysis Report
            </h1>
            <p className="text-surface-300 text-sm mt-1">
              Synthesized from {report.totalRounds} rounds of multi-agent simulation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-surface-300">
          <span>Generated: {new Date(report.timestamp).toLocaleString()}</span>
        </div>
      </div>

      {/* Seed Event Banner */}
      <div className="bg-surface-900 border border-primary-500/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-primary-400 uppercase tracking-wider">Seed Event</h3>
        </div>
        <p className="text-surface-100 text-lg">{report.seedEvent}</p>
        {report.shocks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-surface-800">
            <p className="text-xs text-danger font-semibold uppercase tracking-wider mb-2">Injected Shocks:</p>
            {report.shocks.map((s, i) => (
              <p key={i} className="text-sm text-surface-200 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-danger" />
                Round {s.round}: {s.shock}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Verdict Section */}
      <div className="grid grid-cols-3 gap-4">
        {/* Main Verdict */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6 text-center">
          <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4">Consensus Verdict</h3>
          <div
            className="text-4xl font-black mb-3"
            style={{ color: report.consensus.verdictColor }}
          >
            {report.consensus.verdict}
          </div>
          <SentimentGauge value={report.consensus.avgSentiment} label="Average Sentiment" size="md" />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-success">{report.consensus.bulls}</p>
              <p className="text-xs text-surface-300">Bulls</p>
            </div>
            <div>
              <p className="text-lg font-bold text-warning">{report.consensus.neutrals}</p>
              <p className="text-xs text-surface-300">Neutral</p>
            </div>
            <div>
              <p className="text-lg font-bold text-danger">{report.consensus.bears}</p>
              <p className="text-xs text-surface-300">Bears</p>
            </div>
          </div>
        </div>

        {/* Sentiment Distribution Pie */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4">Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-surface-300">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Radar */}
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4">Risk Assessment</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <PolarRadiusAxis tick={false} domain={[0, 100]} />
              <Radar dataKey="level" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sentiment Evolution */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4">Sentiment Evolution Across Rounds</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={report.sentimentHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="round" tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={r => `R${r}`} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
            <Bar dataKey="bulls" stackId="a" fill="#10b981" name="Bulls" />
            <Bar dataKey="neutrals" stackId="a" fill="#f59e0b" name="Neutral" />
            <Bar dataKey="bears" stackId="a" fill="#ef4444" name="Bears" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bull vs Bear Case */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bull Case */}
        <div className="bg-surface-900 border border-success/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-success flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Bull Case
            </h3>
            <span className="text-xs bg-success/20 text-success px-2.5 py-1 rounded-full font-semibold">
              {report.bullCase.probability}% probability
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-success shrink-0" />
              <span className="text-sm text-surface-200">
                Target: <strong className="text-success">{report.bullCase.targetMove}</strong> over {report.bullCase.timeframe}
              </span>
            </div>
            <div className="space-y-2">
              {report.bullCase.keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success mt-1.5 shrink-0" />
                  <p className="text-sm text-surface-200">{point}</p>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-surface-800">
              <p className="text-xs text-surface-300 mb-1">Leading Advocates:</p>
              <div className="flex gap-2">
                {report.bullCase.leadingAgents.map(a => (
                  <span key={a} className="text-xs bg-success/10 text-success px-2 py-1 rounded">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bear Case */}
        <div className="bg-surface-900 border border-danger/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-danger flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Bear Case
            </h3>
            <span className="text-xs bg-danger/20 text-danger px-2.5 py-1 rounded-full font-semibold">
              {report.bearCase.probability}% probability
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Target className="w-4 h-4 text-danger shrink-0" />
              <span className="text-sm text-surface-200">
                Target: <strong className="text-danger">{report.bearCase.targetMove}</strong> over {report.bearCase.timeframe}
              </span>
            </div>
            <div className="space-y-2">
              {report.bearCase.keyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 shrink-0" />
                  <p className="text-sm text-surface-200">{point}</p>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-surface-800">
              <p className="text-xs text-surface-300 mb-1">Leading Advocates:</p>
              <div className="flex gap-2">
                {report.bearCase.leadingAgents.map(a => (
                  <span key={a} className="text-xs bg-danger/10 text-danger px-2 py-1 rounded">{a}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Trade Ideas */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4">Top Consensus Trade Ideas</h3>
        <div className="grid grid-cols-4 gap-3">
          {report.topTrades.map(([trade, count], i) => (
            <div
              key={trade}
              className="bg-surface-800 rounded-lg p-4 border border-surface-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-surface-300">#{i + 1}</span>
                <span className="text-xs bg-primary-600/20 text-primary-400 px-2 py-0.5 rounded">
                  {count} agent{count > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm font-semibold text-surface-100">{trade}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coalitions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-success" />
            Bull Coalition ({report.bullCoalition.length} agents)
          </h3>
          <div className="space-y-2">
            {report.bullCoalition.map(a => (
              <div key={a.name} className="flex items-center justify-between bg-surface-800/50 rounded-lg px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-surface-100">{a.name}</p>
                  <p className="text-xs text-surface-300">{a.role}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    backgroundColor: SENTIMENT_LEVELS[a.sentiment]?.color + '20',
                    color: SENTIMENT_LEVELS[a.sentiment]?.color,
                  }}>
                    {SENTIMENT_LEVELS[a.sentiment]?.label}
                  </span>
                  <p className="text-xs text-surface-300 mt-1">{a.confidence}% confidence</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
          <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-danger" />
            Bear Coalition ({report.bearCoalition.length} agents)
          </h3>
          <div className="space-y-2">
            {report.bearCoalition.map(a => (
              <div key={a.name} className="flex items-center justify-between bg-surface-800/50 rounded-lg px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-surface-100">{a.name}</p>
                  <p className="text-xs text-surface-300">{a.role}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 rounded-full" style={{
                    backgroundColor: SENTIMENT_LEVELS[a.sentiment]?.color + '20',
                    color: SENTIMENT_LEVELS[a.sentiment]?.color,
                  }}>
                    {SENTIMENT_LEVELS[a.sentiment]?.label}
                  </span>
                  <p className="text-xs text-surface-300 mt-1">{a.confidence}% confidence</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Factors Detail */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent-400" />
          Risk Factor Analysis
        </h3>
        <div className="space-y-3">
          {report.riskFactors.map(risk => (
            <div key={risk.factor}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-surface-100 font-medium">{risk.factor}</span>
                <span className={`text-xs font-semibold ${
                  risk.level > 60 ? 'text-danger' : risk.level > 40 ? 'text-warning' : 'text-success'
                }`}>
                  {risk.level}%
                </span>
              </div>
              <div className="w-full bg-surface-800 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${risk.level}%`,
                    backgroundColor: risk.level > 60 ? '#ef4444' : risk.level > 40 ? '#f59e0b' : '#10b981',
                  }}
                />
              </div>
              <p className="text-xs text-surface-300 mt-1">{risk.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disagreement Index */}
      <div className="bg-surface-900 border border-surface-800 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-1">Disagreement Index</h3>
            <p className="text-3xl font-bold text-surface-100">{report.consensus.disagreementIndex}<span className="text-lg text-surface-300">/100</span></p>
            <p className="text-sm text-surface-300 mt-1">
              {report.consensus.disagreementIndex > 60
                ? 'High disagreement among agents — expect volatile price action'
                : report.consensus.disagreementIndex > 30
                ? 'Moderate disagreement — mixed signals, proceed with caution'
                : 'Low disagreement — strong consensus, higher conviction setup'}
            </p>
          </div>
          <div className="w-32 h-32">
            <div className="w-full h-full rounded-full border-8 flex items-center justify-center"
              style={{
                borderColor: report.consensus.disagreementIndex > 60 ? '#ef4444' : report.consensus.disagreementIndex > 30 ? '#f59e0b' : '#10b981',
              }}
            >
              <span className="text-2xl font-bold text-surface-100">{report.consensus.disagreementIndex}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-surface-800/30 border border-surface-800 rounded-xl p-4 text-center">
        <p className="text-xs text-surface-300">
          This report is generated by AI agent simulation for educational purposes only.
          Not financial advice. Always do your own research before making investment decisions.
        </p>
      </div>
    </div>
  )
}
