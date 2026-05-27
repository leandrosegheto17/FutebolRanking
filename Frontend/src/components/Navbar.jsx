import { NavLink } from 'react-router-dom'
import { exportarRankingPdf } from '../utils/exportPdf'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-ball">⚽</span>
        <span className="navbar-title">Futebol Ranking</span>
      </div>
      <ul className="navbar-links">
        <li><NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>🏆 Ranking</NavLink></li>
        <li><NavLink to="/cadastro" className={({ isActive }) => isActive ? 'active' : ''}>➕ Cadastro</NavLink></li>
        <li><NavLink to="/rodada" className={({ isActive }) => isActive ? 'active' : ''}>📋 Rodada</NavLink></li>
        <li>
          <button className="btn-pdf" onClick={exportarRankingPdf}>📄 Exportar PDF</button>
        </li>
      </ul>
    </nav>
  )
}
