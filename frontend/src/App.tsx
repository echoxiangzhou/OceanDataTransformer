import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DataDownloadPage from './features/data-download/pages/DataDownloadPage'
import DataTransform from './pages/DataTransform'
import TerrainInversion from './pages/TerrainInversion'
import DataVisualization from './pages/DataVisualization'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/download" element={<DataDownloadPage />} />
          <Route path="/transform" element={<DataTransform />} />
          <Route path="/terrain" element={<TerrainInversion />} />
          <Route path="/visualization" element={<DataVisualization />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App 