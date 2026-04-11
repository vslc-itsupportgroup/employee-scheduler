import React from 'react';
import { authAPI } from '../api/client';

interface RegistrationData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  department: string;
}

const RegisterPage: React.FC = () => {
  const [step, setStep] = React.useState<'register' | 'verify' | 'setup-2fa'>('register');
  const [formData, setFormData] = React.useState<RegistrationData>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    department: '',
  });
  const [verificationCode, setVerificationCode] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [emailSent, setEmailSent] = React.useState(false);
  const [requires2FASetup, setRequires2FASetup] = React.useState(false);
  const [qrCode, setQrCode] = React.useState('');
  const [totpToken, setTotpToken] = React.useState('');
  const [secret, setSecret] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.register(formData);
      setUserId(response.data.user_id);
      setRequires2FASetup(response.data.requires_2fa_setup || false);
      
      if (response.data.requires_2fa_setup) {
        // Generate 2FA QR code
        await generateTwoFAQR(response.data.user_id);
        setStep('setup-2fa');
      } else {
        setEmailSent(response.data.email_sent);
        setStep('verify');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const generateTwoFAQR = async (userId: string) => {
    try {
      const response = await authAPI.generateTwoFAQR(userId);
      setQrCode(response.data.qr_code);
      setSecret(response.data.secret);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate 2FA QR code');
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
      
      // Save token and redirect
      localStorage.setItem('token', response.data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!totpToken || totpToken.length !== 6) {
        setError('Please enter a valid 6-digit code from your authenticator');
        setLoading(false);
        return;
      }

      const response = await authAPI.verifyTwoFA(userId, totpToken);
      
      // Save token and redirect
      localStorage.setItem('token', response.data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        {step === 'register' ? (
          <>
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
              Create Account
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department (Optional)
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-blue-600 hover:underline">
                Sign in here
              </a>
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
                A confirmation code has been sent to <strong>{formData.email}</strong>
              </p>
              {!emailSent && (
                <p className="text-xs text-orange-600 mt-2">
                  Note: Please ensure email is configured by an admin for notifications to work.
                </p>
              )}
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
              Didn't receive the code?{' '}
              <button
                onClick={() => setStep('register')}
                className="text-blue-600 hover:underline"
              >
                Go back
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
              Set Up Authenticator
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            <div className="mb-6 space-y-4">
              <p className="text-sm text-gray-700">
                For added security, scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.).
              </p>
              
              {qrCode && (
                <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              )}

              {secret && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-gray-600 mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <p className="text-sm font-mono text-center break-all bg-white p-2 rounded border border-gray-300">
                    {secret}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSetup2FASubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter 6-digit code from your authenticator
                </label>
                <input
                  type="text"
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || totpToken.length !== 6}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                {loading ? 'Verifying...' : 'Verify & Complete Setup'}
              </button>
            </form>

            <p className="text-center mt-4 text-gray-600 text-sm">
              <button
                onClick={() => setStep('register')}
                className="text-blue-600 hover:underline"
              >
                Go back
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RegisterPage;
