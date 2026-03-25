import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Briefcase, Mail, Lock, ArrowRight } from 'lucide-react';

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-bg flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-[#141414] border border-white/10 p-8" style={{ borderRadius: '2px' }}>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#E5FE40] flex items-center justify-center" style={{ borderRadius: '2px' }}>
              <Briefcase className="w-5 h-5 text-[#0A0A0A]" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-tight">Job Tracker</h1>
              <p className="text-xs text-gray-400 font-mono tracking-wide">TRACK YOUR CAREER</p>
            </div>
          </div>

          <h2 className="font-heading text-2xl font-bold mb-2">Welcome back</h2>
          <p className="text-gray-400 mb-6">Sign in to continue tracking your applications</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 mb-6 text-sm" style={{ borderRadius: '2px' }} data-testid="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" strokeWidth={1.5} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-10 bg-transparent border-white/20 focus:border-[#E5FE40] focus:ring-[#E5FE40] h-11"
                  style={{ borderRadius: '2px' }}
                  required
                  data-testid="login-email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-[0.2em] text-gray-400 font-bold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" strokeWidth={1.5} />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10 bg-transparent border-white/20 focus:border-[#E5FE40] focus:ring-[#E5FE40] h-11"
                  style={{ borderRadius: '2px' }}
                  required
                  data-testid="login-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E5FE40] text-[#0A0A0A] hover:bg-[#D4ED31] font-bold h-11 flex items-center justify-center gap-2"
              style={{ borderRadius: '2px' }}
              data-testid="login-submit"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="w-4 h-4" strokeWidth={1.5} />}
            </Button>
          </form>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#E5FE40] hover:underline font-medium" data-testid="register-link">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
