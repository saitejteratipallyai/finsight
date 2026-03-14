import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Brain, FileText, Users, Activity } from 'lucide-react'
import { AGENTS } from '../engine/agents'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/simulation', icon: Brain, label: 'Simulation' },
  { to: '/report', icon: FileText, label: 'Reports', badge: 'reports' },
  { to: '/agents', icon: Users, label: 'Agents' },
]

function getReportCount() {
  try {
    return JSON.parse(localStorage.getItem('finsight_reports') || '[]').length
  } catch { return 0 }
}

export default function Sidebar() {
  const reportCount = getReportCount()

  return (
    <aside className="w-56 bg-white/80 backdrop-blur-xl border-r border-black/[0.06] flex flex-col shrink-0">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-[15px] font-semibold text-surface-100 tracking-tight">FinSight</h1>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {links.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-surface-800 text-surface-100'
                  : 'text-surface-300 hover:bg-surface-800/50 hover:text-surface-200'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge === 'reports' && reportCount > 0 && (
              <span className="ml-auto text-[10px] bg-primary-600/20 text-primary-400 px-1.5 py-0.5 rounded-full font-semibold">{reportCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-success pulse-glow" />
          <span className="text-[11px] text-surface-300">{AGENTS.length} agents online</span>
        </div>
      </div>
    </aside>
  )
}
