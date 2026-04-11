import React, { useState, useEffect } from 'react';
import { emailConfigAPI } from '../api/client';

interface EmailConfig {
  id: string;
  smtp_server: string;
  smtp_port: number;
  sender_email: string;
  sender_name?: string;
  test_email_subject?: string;
  confirmation_email_subject?: string;
  is_configured: boolean;
}

const EmailConfigPage: React.FC = () => {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  const [formData, setFormData] = useState({
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    sender_email: '',
    sender_name: 'Employee Schedule',
    test_email_subject: 'Test Email - Employee Scheduling System',
    confirmation_email_subject: 'Email Verification - Employee Scheduling System',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await emailConfigAPI.getConfig();
      setConfig(response.data);
      setFormData({
        smtp_server: response.data.smtp_server,
        smtp_port: response.data.smtp_port,
        smtp_username: '',
        smtp_password: '',
        sender_email: response.data.sender_email,
        sender_name: response.data.sender_name || 'Employee Schedule',
        test_email_subject: response.data.test_email_subject || 'Test Email - Employee Scheduling System',
        confirmation_email_subject: response.data.confirmation_email_subject || 'Email Verification - Employee Scheduling System',
      });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('No email configuration found. Create a new one.');
      } else {
        setError(err.response?.data?.error || 'Failed to load configuration');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'smtp_port' ? parseInt(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.smtp_server || !formData.smtp_port || !formData.smtp_username || !formData.smtp_password || !formData.sender_email) {
      setError('All fields are required');
      return;
    }

    try {
      const response = await emailConfigAPI.updateConfig(formData);
      setConfig(response.data.config);
      setSuccess('Email configuration saved successfully!');
      // Clear password field after successful save
      setFormData({ ...formData, smtp_password: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update configuration');
    }
  };

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!testEmail) {
      setError('Please enter a test email address');
      return;
    }

    try {
      setTestLoading(true);
      await emailConfigAPI.testConfig(testEmail);
      setSuccess('Test email sent successfully! Check your inbox.');
      setTestEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send test email');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          Email Configuration
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

        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading configuration...</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                SMTP Settings
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Server
                    </label>
                    <input
                      type="text"
                      name="smtp_server"
                      value={formData.smtp_server}
                      onChange={handleChange}
                      placeholder="smtp.gmail.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      name="smtp_port"
                      value={formData.smtp_port}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    name="smtp_username"
                    value={formData.smtp_username}
                    onChange={handleChange}
                    placeholder="your-email@gmail.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SMTP Password
                  </label>
                  <input
                    type="password"
                    name="smtp_password"
                    value={formData.smtp_password}
                    onChange={handleChange}
                    placeholder="Your app password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    For Gmail, use an App Password (not your regular password)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Email
                    </label>
                    <input
                      type="email"
                      name="sender_email"
                      value={formData.sender_email}
                      onChange={handleChange}
                      placeholder="noreply@company.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sender Name
                    </label>
                    <input
                      type="text"
                      name="sender_name"
                      value={formData.sender_name}
                      onChange={handleChange}
                      placeholder="Employee Schedule"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Email Subject
                  </label>
                  <input
                    type="text"
                    name="test_email_subject"
                    value={formData.test_email_subject}
                    onChange={handleChange}
                    placeholder="Test Email - Employee Scheduling System"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Subject line for test/connectivity emails
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmation Email Subject
                  </label>
                  <input
                    type="text"
                    name="confirmation_email_subject"
                    value={formData.confirmation_email_subject}
                    onChange={handleChange}
                    placeholder="Email Verification - Employee Scheduling System"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Subject line for email verification messages
                  </p>
                </div>

                {config?.is_configured && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                    Status: Email is configured and active
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Save Configuration
                </button>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow-md p-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Test Email
              </h2>

              <form onSubmit={handleTestEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Send Test Email To
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <button
                      type="submit"
                      disabled={testLoading}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                      {testLoading ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                <p className="font-semibold mb-2">Setup Instructions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>For Gmail: Enable 2FA and generate an App Password</li>
                  <li>For Office 365: Use your office email and password</li>
                  <li>For other providers: Check their SMTP documentation</li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailConfigPage;
