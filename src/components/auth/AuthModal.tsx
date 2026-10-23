import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail } from 'lucide-react';
import { User as UserType } from '../../types';
import { authService } from '../../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setMessage(null);
    try {
      const res = await authService.login(email.trim(), password);
      authService.setCurrentUser(res.user);
      onSuccess(res.user);
      onClose();

      // If user is Admin or SuperAdmin, route immediately to dedicated admin dashboard
      if (res.user.role === 'ADMIN' || res.user.role === 'SUPERADMIN') {
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setMessage(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#161F30] rounded-3xl max-w-md w-full shadow-2xl border border-slate-700 overflow-hidden text-white">
        
        {/* Header */}
        <div className="bg-[#0E1524] px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center font-bold text-white text-sm shadow">
              DVA
            </div>
            <div>
              <h3 className="font-bold text-base text-white">DVA Account Portal</h3>
              <p className="text-xs text-slate-400">Secure Member & Staff Sign In</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message notification */}
        {message && (
          <div className="bg-amber-950/80 border-b border-amber-700 p-3 text-xs text-amber-200 font-medium">
            {message}
          </div>
        )}

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email address"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-white outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-white outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

