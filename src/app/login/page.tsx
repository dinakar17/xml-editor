'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, Loader2, Server } from 'lucide-react';
import { useLogin, type Environment } from '@/hooks/useLogin';

const LoginPage = () => {
  const router = useRouter();
  const { trigger, isMutating } = useLogin();
  const [serialNumber, setSerialNumber] = useState('');
  const [password, setPassword] = useState('');
  const [environment, setEnvironment] = useState<Environment>('dev');
  const [error, setError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!serialNumber || !password) {
      setError('Please enter both serial number and password');
      return;
    }

    try {
      const response = await trigger({
        serial_number: serialNumber,
        password: password,
        environment: environment,
      });

      if (response.error === 0 && response.token) {
        // Store the authentication token
        localStorage.setItem('authToken', response.token);
        
        // Store the selected environment
        localStorage.setItem('environment', environment);
        
        // Store token expiration if provided
        if (response.token_expire_at) {
          localStorage.setItem('authTokenExpiry', response.token_expire_at);
        }
        
        // Store dealer code if provided
        if (response.dealer_code) {
          localStorage.setItem('dealerCode', response.dealer_code);
        }

        // Redirect to main page
        router.push('/');
      } else {
        setError(response.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">XML Parameter Editor</h1>
            <p className="text-gray-600">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-2">
                Environment
              </label>
              <div className="relative">
                <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  id="environment"
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as Environment)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  disabled={isMutating}
                  required
                >
                  <option value="dev">Development</option>
                  <option value="uat">UAT</option>
                  <option value="prod">Production</option>
                  <option value="test">Test</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Serial Number
              </label>
              <input
                id="serialNumber"
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your serial number"
                disabled={isMutating}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                disabled={isMutating}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isMutating}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isMutating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 px-8 py-4 rounded-b-lg border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Please contact your administrator if you have issues logging in.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
