import { useState, FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Radio, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import Logo from '../../components/ui/Logo';

export default function LoginPage() {
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Signed in successfully');
      navigate('/', { replace: true });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Login failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FBFAF6] dark:bg-gray-950 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-[26rem] h-[26rem] bg-primary-100 dark:bg-primary-900/20 rounded-full blur-3xl opacity-70 pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-[30rem] h-[30rem] bg-primary-50 dark:bg-primary-900/10 rounded-full blur-3xl pointer-events-none" />

      <button
        type="button"
        onClick={toggle}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 p-2.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 shadow-sm transition-colors"
      >
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Brand panel - desktop only */}
      <div className="hidden lg:flex flex-col justify-between flex-1 p-16 xl:p-24 relative z-10">
        <div className="flex items-center gap-3">
          <Logo size={96} />
          <span className="text-sm font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400">User Portal</span>
        </div>

        <div>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-gray-900 dark:text-white leading-tight">
            Yemisrach Dimts<br />Communication Service
          </h1>
          <p className="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-primary-700 dark:text-primary-400 text-xs sm:text-sm font-semibold tracking-widest uppercase shadow-sm">
            <Radio size={14} />
            Radio Home Management System
          </p>
        </div>

        <p className="text-gray-400 dark:text-gray-500 text-xs tracking-wide">
          &copy; {new Date().getFullYear()} Yemisrach Dimts Communication Service. All rights reserved.
        </p>
      </div>

      {/* Form panel */}
      <div className="w-full lg:w-[480px] xl:w-[540px] shrink-0 bg-white dark:bg-gray-900 lg:shadow-2xl lg:ring-1 lg:ring-black/5 dark:lg:ring-white/10 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-md">
          {/* Brand header - mobile only */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block mb-5">
              <Logo size={128} />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white leading-tight">
              Yemisrach Dimts<br />Communication Service
            </h1>
            <p className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FBFAF6] dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-primary-700 dark:text-primary-400 text-xs font-semibold tracking-widest uppercase">
              <Radio size={14} />
              Radio Home Management System
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold rounded-lg shadow-lg shadow-primary-600/25 transition-all flex items-center justify-center gap-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="lg:hidden text-center text-gray-400 text-xs mt-6 tracking-wide">
            &copy; {new Date().getFullYear()} Yemisrach Dimts Communication Service. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
