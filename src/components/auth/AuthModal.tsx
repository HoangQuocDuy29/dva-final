import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Lock, Mail, Shield, CheckCircle2, KeyRound } from 'lucide-react';
import { User as UserType } from '../../types';
import { authService } from '../../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'LOGIN' | 'FORGOT'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
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
      setMessage(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (targetEmail: string, targetPass: string) => {
    setEmail(targetEmail);
    setPassword(targetPass);
    setMessage(null);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    try {
      const res = await authService.forgotPassword(email);
      setMessage(res.message);
      if (res.demoOtp) {
        setDemoOtp(res.demoOtp);
        setOtp(res.demoOtp);
      }
    } catch (err) {
      setMessage('Error sending OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setIsLoading(true);
    try {
      const res = await authService.verifyOtp(email, otp, newPassword);
      setMessage('Password successfully reset. You may now sign in.');
      setTimeout(() => {
        setTab('LOGIN');
        setMessage(null);
      }, 1500);
    } catch (err) {
      setMessage('Invalid verification code.');
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
              <p className="text-xs text-slate-400">Secure Member & Staff Login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection (Real login and forgot password only) */}
        <div className="flex border-b border-slate-800 text-xs font-semibold bg-[#121826]">
          <button
            onClick={() => { setTab('LOGIN'); setMessage(null); }}
            className={`flex-1 py-3.5 text-center border-b-2 transition-all cursor-pointer ${
              tab === 'LOGIN' ? 'border-red-500 text-white bg-[#161F30]' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Sign In with Credentials
          </button>
          <button
            onClick={() => { setTab('FORGOT'); setMessage(null); }}
            className={`flex-1 py-3.5 text-center border-b-2 transition-all cursor-pointer ${
              tab === 'FORGOT' ? 'border-red-500 text-white bg-[#161F30]' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Forgot Password
          </button>
        </div>

        {/* Message notification */}
        {message && (
          <div className="bg-amber-950/80 border-b border-amber-700 p-3 text-xs text-amber-200 font-medium">
            {message}
          </div>
        )}

        <div className="p-6">
          
          {/* TAB 1: LOGIN */}
          {tab === 'LOGIN' && (
            <div className="space-y-5">
              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">
                    Email Address:
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. quocduyhoang42@gmail.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-semibold text-slate-300">
                      Password:
                    </label>
                    <button
                      type="button"
                      onClick={() => setTab('FORGOT')}
                      className="text-[11px] text-orange-400 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter account password"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-white outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-red-600 to-orange-500 hover:brightness-110 shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </form>

              {/* Verified Club Accounts Helper */}
              <div className="p-3.5 rounded-2xl bg-[#0E1524] border border-slate-800 text-[11px] space-y-2">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                  <Shield className="w-3.5 h-3.5 text-orange-400" />
                  <span>Authorized Club Accounts:</span>
                </div>
                
                <div className="space-y-1.5 text-slate-400">
                  <div className="flex items-center justify-between bg-[#131A29] p-2 rounded-xl border border-slate-800/80">
                    <div>
                      <strong className="text-white block font-mono">quocduyhoang42@gmail.com</strong>
                      <span className="text-[10px] text-red-400">SuperAdmin (pass: dva@2025)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('quocduyhoang42@gmail.com', 'dva@2025')}
                      className="px-2.5 py-1 rounded-lg bg-red-950 text-red-300 hover:bg-red-900 border border-red-800 text-[10px] font-bold cursor-pointer"
                    >
                      Fill
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[#131A29] p-2 rounded-xl border border-slate-800/80">
                    <div>
                      <strong className="text-white block font-mono">admin.dva@gmail.com</strong>
                      <span className="text-[10px] text-amber-400">Admin (pass: dva@2025)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('admin.dva@gmail.com', 'dva@2025')}
                      className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-300 hover:bg-amber-900 border border-amber-800 text-[10px] font-bold cursor-pointer"
                    >
                      Fill
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-[#131A29] p-2 rounded-xl border border-slate-800/80">
                    <div>
                      <strong className="text-white block font-mono">player.hung@gmail.com</strong>
                      <span className="text-[10px] text-blue-400">Player (pass: dva@123)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('player.hung@gmail.com', 'dva@123')}
                      className="px-2.5 py-1 rounded-lg bg-blue-950 text-blue-300 hover:bg-blue-900 border border-blue-800 text-[10px] font-bold cursor-pointer"
                    >
                      Fill
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: FORGOT PASSWORD */}
          {tab === 'FORGOT' && (
            <div className="space-y-4 text-xs">
              {!demoOtp ? (
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <p className="text-slate-400">
                    Enter your registered email address to receive a 6-digit OTP verification token:
                  </p>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Registered Email:</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. quocduyhoang42@gmail.com"
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Send Verification OTP</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="p-3 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-300">
                    OTP Sent! Use verification code: <strong className="font-mono text-sm text-white">{demoOtp}</strong>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">6-Digit Verification Code:</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white font-mono text-center font-bold tracking-widest outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">New Secure Password:</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-white outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Password Reset</span>
                  </button>
                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
