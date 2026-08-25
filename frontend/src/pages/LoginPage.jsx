import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { loginSuccess } from '../redux/authSlice';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      if (res.data.success) {
        dispatch(loginSuccess({
          user: res.data.user,
          accessToken: res.data.accessToken,
          refreshToken: res.data.refreshToken
        }));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 bg-card rounded-lg shadow-xl border border-border">
        <h2 className="text-3xl font-bold mb-6 text-center text-primary">Login to TaskFlow</h2>
        {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive text-destructive rounded">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-2 bg-input border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-2 bg-input border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
              required 
            />
          </div>
          <button type="submit" className="w-full py-2 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90 transition-opacity">
            Sign In
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
