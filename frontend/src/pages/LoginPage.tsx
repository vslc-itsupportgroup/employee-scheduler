import React from 'react';
import { authAPI } from '../api/client';

const LoginPage: React.FC = () => {
  const [step, setStep] = React.useState<'login' | 'verify' | 'change-password' | 'forgot-password-request' | 'forgot-password-verify' | 'forgot-password-reset'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [resetCode, setResetCode] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(email, password);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      // Check if error is due to disabled account
      if (err.response?.status === 403 && err.response?.data?.account_disabled) {
        setError(err.response.data.error || 'Your account has been disabled. Please contact the administrator to re-enable your account.');
      } else if (err.response?.status === 403 && err.response?.data?.requires_verification) {
        setUserId(err.response.data.user_id);
        setStep('verify');
        setError('');
      } else if (err.response?.status === 403 && err.response?.data?.requires_password_change) {
        setUserId(err.response.data.user_id);
        setStep('change-password');
        setError('');
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!verificationCode || verificationCode.length !== 6) {
        setError('Please enter a valid 6-digit confirmation code');
        setLoading(false);
        return;
      }

      const response = await authAPI.verifyEmail(userId, verificationCode);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.changePassword(userId, password, newPassword);
      // Clear states and redirect to login
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authAPI.requestPasswordReset(email);
      setSuccess('Reset code has been sent to your email');
      setStep('forgot-password-verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!resetCode || resetCode.length !== 6) {
      setError('Please enter a valid 6-digit reset code');
      setLoading(false);
      return;
    }

    try {
      // Verify the reset code is valid
      await authAPI.verifyPasswordResetCode(email, resetCode);
      setStep('forgot-password-reset');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword(email, resetCode, newPassword);
      setSuccess('Password reset successfully! Redirecting to login...');
      setStep('login');
      setEmail('');
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {step === 'login' ? (
          <>
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
              Schedule Manager
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600 text-sm space-y-2">
              <div>
                Don't have an account?{' '}
                <a href="/register" className="text-blue-600 hover:underline">
                  Register here
                </a>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('forgot-password-request');
                    setError('');
                    setEmail('');
                  }}
                  className="text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </p>
          </>
        ) : step === 'verify' ? (
          <>
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
              Verify Email
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-700">
                Your email address needs to be verified. A confirmation code has been sent to <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmation Code (6 digits)
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600 text-sm">
              <button
                onClick={() => {
                  setStep('login');
                  setError('');
                  // Clear verification code but keep email
                  setVerificationCode('');
                }}
                className="text-blue-600 hover:underline"
              >
                Back to login
              </button>
            </p>
          </>
        ) : step === 'forgot-password-request' ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">
              Reset Password
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-700">
                Enter your email address and we'll send you a code to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600 text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setError('');
                  setEmail('');
                }}
                className="text-blue-600 hover:underline"
              >
                Back to login
              </button>
            </p>
          </>
        ) : step === 'forgot-password-verify' ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">
              Verify Reset Code
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-gray-700">
                We've sent a reset code to <strong>{email}</strong>. Please enter it below.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reset Code (6 digits)
                </label>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code from your email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || resetCode.length !== 6}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600 text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('forgot-password-request');
                  setError('');
                  setResetCode('');
                }}
                className="text-blue-600 hover:underline"
              >
                Back
              </button>
            </p>
          </>
        ) : step === 'forgot-password-reset' ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">
              Create New Password
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-gray-700">
                Please enter your new password below.
              </p>
            </div>

            <form onSubmit={handleForgotPasswordReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600 text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setError('');
                  setEmail('');
                  setResetCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="text-blue-600 hover:underline"
              >
                Back to login
              </button>
            </p>
          </>
        ) : step === 'change-password' ? (
          <>
            <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">
              Change Password
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded">
              <p className="text-sm text-gray-700">
                Your administrator has required you to change your password before accessing the system.
              </p>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </button>
            </form>
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
