export default function SentimentGauge({ value, label, size = 'md' }) {
  // value is -2 to +2
  const normalized = ((value + 2) / 4) * 100
  const angle = -90 + (normalized / 100) * 180

  const colors = [
    { stop: 0, color: '#ef4444' },
    { stop: 25, color: '#f87171' },
    { stop: 50, color: '#f59e0b' },
    { stop: 75, color: '#34d399' },
    { stop: 100, color: '#10b981' },
  ]

  const getColor = (val) => {
    if (val <= 25) return '#ef4444'
    if (val <= 45) return '#f87171'
    if (val <= 55) return '#f59e0b'
    if (val <= 75) return '#34d399'
    return '#10b981'
  }

  const sizeMap = { sm: 100, md: 140, lg: 180 }
  const w = sizeMap[size]

  return (
    <div className="flex flex-col items-center">
      <svg width={w} height={w / 2 + 20} viewBox="0 0 200 120">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            {colors.map(c => (
              <stop key={c.stop} offset={`${c.stop}%`} stopColor={c.color} />
            ))}
          </linearGradient>
        </defs>
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray="251.2"
          strokeDashoffset={251.2 - (normalized / 100) * 251.2}
        />
        {/* Needle */}
        <g transform={`rotate(${angle}, 100, 100)`}>
          <line x1="100" y1="100" x2="100" y2="35" stroke={getColor(normalized)} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="100" cy="100" r="5" fill={getColor(normalized)} />
        </g>
        {/* Labels */}
        <text x="15" y="115" fontSize="10" fill="#64748b" textAnchor="start">Bear</text>
        <text x="185" y="115" fontSize="10" fill="#64748b" textAnchor="end">Bull</text>
        <text x="100" y="90" fontSize="18" fill="#0f172a" fontWeight="bold" textAnchor="middle">
          {value > 0 ? '+' : ''}{value.toFixed(2)}
        </text>
      </svg>
      {label && <p className="text-xs text-surface-300 mt-1">{label}</p>}
    </div>
  )
}
