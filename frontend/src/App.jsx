import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import StudentInfo from './pages/StudentInfo.jsx'
import Diagnosis from './pages/Diagnosis.jsx'
import DiagnosisResult from './pages/DiagnosisResult.jsx'
import History from './pages/History.jsx'
import FAQ from './pages/FAQ.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/student-info" element={<StudentInfo />} />
        <Route path="/diagnosis" element={<Diagnosis />} />
        <Route path="/diagnosis-result/:id" element={<DiagnosisResult />} />
        <Route path="/history" element={<History />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Layout>
  )
}
