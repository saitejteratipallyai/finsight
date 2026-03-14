import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Simulation from './pages/Simulation'
import Report from './pages/Report'
import Agents from './pages/Agents'
import './App.css'

function App() {
  return (
    <div className="flex h-screen bg-surface-950 text-surface-200">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/report" element={<Report />} />
          <Route path="/agents" element={<Agents />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
