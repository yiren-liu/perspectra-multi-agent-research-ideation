import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import AuthProvider from './components/auth'
import { PostHogProvider } from 'posthog-js/react'

const options = {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PostHogProvider
      apiKey={
        import.meta.env.VITE_PUBLIC_POSTHOG_KEY
      }
      options={options}
    >
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/forum" replace />} />
            <Route path="/forum" element={<App mode="forum" />} />
            <Route path="/chat" element={<App mode="chat" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </PostHogProvider>
  </StrictMode>,
)
