import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Workers from './pages/Workers';
import DeadLetter from './pages/DeadLetter';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/jobs" element={
          <ProtectedRoute>
            <Jobs />
          </ProtectedRoute>
        } />
        
        <Route path="/workers" element={
          <ProtectedRoute>
            <Workers />
          </ProtectedRoute>
        } />
        
        <Route path="/dead-letter" element={
          <ProtectedRoute>
            <DeadLetter />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default App;
