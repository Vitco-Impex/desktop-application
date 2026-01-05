/**
 * Login Form Component - Minimal, compact design
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '@/store/authStore';
import { authService } from '@/services/auth.service';
import { LoginRequest } from '@/types';
import { Input } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui';
import { Card } from '@/shared/components/ui';
import './LoginForm.css';

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const login = authStore((state) => state.login);

  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Helper function to detect if input is email or phone number
  const isEmailFormat = (input: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input.trim());
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Prepare login request based on input format
      const loginRequest: LoginRequest = {
        password,
      };

      if (isEmailFormat(identifier)) {
        loginRequest.email = identifier.trim();
      } else {
        // Normalize phone number (remove spaces, dashes, parentheses)
        loginRequest.phoneNumber = identifier.replace(/[\s\-\(\)]/g, '');
      }

      const response = await authService.login(loginRequest);
      login(response.user, response.accessToken, response.refreshToken, response.sessionId);

      const roleRoutes: Record<string, string> = {
        admin: '/admin',
        hr: '/hr',
        manager: '/manager',
        employee: '/employee',
      };

      const targetRoute = roleRoutes[response.user.role] || '/dashboard';
      navigate(targetRoute);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Invalid email/phone number or password. Please try again.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" padding="lg">
        <div className="login-header">
          <h1>vitco Desktop</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <Input
            label="Email or Phone Number"
            type="text"
            name="identifier"
            value={identifier}
            onChange={handleIdentifierChange}
            required
            autoComplete="username"
            placeholder="Enter your email or phone number"
            error={error ? undefined : undefined}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={password}
            onChange={handlePasswordChange}
            required
            autoComplete="current-password"
            placeholder="Enter your password"
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="login-footer">
          <p className="role-hints">Admin • HR • Manager • Employee</p>
        </div>
      </Card>
    </div>
  );
};

