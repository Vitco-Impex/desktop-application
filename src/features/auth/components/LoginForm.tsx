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

  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authService.login(formData);
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
        'Invalid email or password. Please try again.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Card className="login-card" padding="lg">
        <div className="login-header">
          <h1>HRMS Desktop</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <Input
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            placeholder="Enter your email"
            error={error && formData.email ? undefined : undefined}
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
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

