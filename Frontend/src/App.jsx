import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import CadastroAtleta from './pages/CadastroAtleta'
import Rodada from './pages/Rodada'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cadastro" element={<ProtectedRoute><CadastroAtleta /></ProtectedRoute>} />
            <Route path="/rodada" element={<ProtectedRoute><Rodada /></ProtectedRoute>} />

          </Routes>
        </main>
      </BrowserRouter>
    </AppProvider>
  )
}
