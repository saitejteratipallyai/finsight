import { useState, useEffect } from 'react'
import { X, Key, CheckCircle, AlertCircle, Loader2, Cpu, Zap, Brain } from 'lucide-react'
import { getApiKey, setApiKey, clearApiKey, validateApiKey, checkBackendHealth } from '../engine/claudeApi'

export default function Settings({ isOpen, onClose }) {
  const [key, setKey] = useState('')
  const [validating, setValidating] = useState(false)
  const [isValid, setIsValid] = useState(null)
  const [backendUp, setBackendUp] = useState(null)
  const [model, setModel] = useState(localStorage.getItem('finsight_model') || 'claude-haiku-4-5-20251001')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setKey(getApiKey())
      checkBackendHealth().then(setBackendUp)
    }
  }, [isOpen])

  const handleValidate = async () => {
    if (!key) return
    setValidating(true)
    const valid = await validateApiKey(key)
    setIsValid(valid)
    setValidating(false)
    if (valid) {
      setApiKey(key)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleSave = () => {
    if (key) {
      setApiKey(key)
      localStorage.setItem('finsight_model', model)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleClear = () => {
    clearApiKey()
    setKey('')
    setIsValid(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-[560px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-800">
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent-400" />
            Claude AI Settings
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-surface-300" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Backend Status */}
          <div className="bg-surface-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-300">Backend Server</span>
              {backendUp === null ? (
                <span className="text-xs text-surface-300">Checking...</span>
              ) : backendUp ? (
                <span className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Connected (port 3001)
                </span>
              ) : (
                <span className="text-xs text-danger flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Not running
                </span>
              )}
            </div>
            {!backendUp && backendUp !== null && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-surface-300">
                  Start both frontend + backend: <code className="bg-surface-700 px-2 py-0.5 rounded text-primary-400">npm run dev</code>
                </p>
                <p className="text-xs text-surface-300">
                  Or just the backend: <code className="bg-surface-700 px-2 py-0.5 rounded text-primary-400">node server.js</code>
                </p>
              </div>
            )}
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-accent-400" />
              Anthropic API Key
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={key}
                onChange={e => { setKey(e.target.value); setIsValid(null); }}
                placeholder="sk-ant-api03-..."
                className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-4 py-2.5 text-sm text-surface-100 placeholder-surface-300 focus:outline-none focus:border-primary-500 font-mono"
              />
              <button
                onClick={handleValidate}
                disabled={!key || validating}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate'}
              </button>
            </div>
            {isValid === true && (
              <p className="text-xs text-success mt-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Key is valid and saved
              </p>
            )}
            {isValid === false && (
              <p className="text-xs text-danger mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Invalid key. Check your Anthropic dashboard.
              </p>
            )}
            <p className="text-xs text-surface-300 mt-2">
              Your key is stored locally in your browser. It's only sent to your local backend server, which proxies requests to Anthropic.
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-surface-100 mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-primary-400" />
              Model
            </label>
            <div className="space-y-2">
              {[
                {
                  id: 'claude-haiku-4-5-20251001',
                  name: 'Claude Haiku 4.5',
                  desc: 'Fast & cheap — ~$0.03 per full simulation',
                  speed: 'Fast',
                  badge: 'Recommended',
                },
                {
                  id: 'claude-sonnet-4-6',
                  name: 'Claude Sonnet 4.6',
                  desc: 'Higher quality analysis — ~$0.15 per simulation',
                  speed: 'Medium',
                  badge: 'Best quality',
                },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => { setModel(m.id); localStorage.setItem('finsight_model', m.id); }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    model === m.id
                      ? 'bg-primary-600/20 border-primary-500/50'
                      : 'bg-surface-800 border-surface-700 hover:border-surface-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-surface-100">{m.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        m.speed === 'Fast' ? 'bg-success/20 text-success' : 'bg-primary-600/20 text-primary-400'
                      }`}>{m.speed}</span>
                      {m.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-600/20 text-accent-400">{m.badge}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-surface-300 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-surface-800/30 border border-surface-800 rounded-lg p-4">
            <h3 className="text-xs text-surface-300 uppercase tracking-wider mb-2">How Claude Mode Works</h3>
            <ul className="space-y-1.5 text-xs text-surface-300">
              <li className="flex items-start gap-2">
                <Zap className="w-3 h-3 mt-0.5 text-warning shrink-0" />
                Each of the 13 agents gets a unique system prompt matching their persona
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-3 h-3 mt-0.5 text-warning shrink-0" />
                All 13 agents are called in parallel for speed (~2-3 seconds per round)
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-3 h-3 mt-0.5 text-warning shrink-0" />
                Prior round responses are passed as context — agents genuinely react to each other
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-3 h-3 mt-0.5 text-warning shrink-0" />
                If no API key, falls back to the built-in deterministic engine
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleClear}
              className="text-sm text-danger hover:text-danger/80 transition-colors"
            >
              Clear API Key
            </button>
            <div className="flex items-center gap-3">
              {saved && <span className="text-xs text-success">Saved!</span>}
              <button
                onClick={handleSave}
                disabled={!key}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
