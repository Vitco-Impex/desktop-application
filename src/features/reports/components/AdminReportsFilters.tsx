/**
 * Admin Reports Filters Component
 * Filter panel for admin reports page
 */

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { logger } from '@/shared/utils/logger';
import './AdminReportsFilters.css';

interface ReportFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

interface AdminReportsFiltersProps {
  filters: ReportFilters;
  onFilterChange: (filters: ReportFilters) => void;
  loading?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  employeeId?: string;
  department?: string;
}

export const AdminReportsFilters: React.FC<AdminReportsFiltersProps> = ({
  filters,
  onFilterChange,
  loading = false,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/reports/admin/users');
      if (response.data.success && response.data.data) {
        setUsers(response.data.data);
      }
    } catch (error) {
      logger.error('[AdminReportsFilters] Failed to load users', error);
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleClearFilters = () => {
    const clearedFilters: ReportFilters = {
      startDate: getTodayDateString(),
      endDate: getTodayDateString(),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="admin-reports-filters">
      <div className="filters-header">
        <h3>Filters</h3>
        <button
          type="button"
          className="btn-clear-filters"
          onClick={handleClearFilters}
          disabled={loading}
        >
          Clear All
        </button>
      </div>

      <div className="filters-content">
        <div className="filter-group">
          <label htmlFor="filter-employee">Employee</label>
          <select
            id="filter-employee"
            value={localFilters.employeeId || ''}
            onChange={(e) => handleFilterChange('employeeId', e.target.value)}
            className="filter-select"
            disabled={loading || loadingUsers}
          >
            <option value="">All Users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} {user.email ? `(${user.email})` : ''} {user.department ? `- ${user.department}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-start-date">Start Date</label>
          <input
            id="filter-start-date"
            type="date"
            value={localFilters.startDate || ''}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
            className="filter-input"
            disabled={loading}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-end-date">End Date</label>
          <input
            id="filter-end-date"
            type="date"
            value={localFilters.endDate || ''}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="filter-input"
            disabled={loading}
          />
        </div>

        <div className="filter-group filter-group-full">
          <label htmlFor="filter-search">Search</label>
          <input
            id="filter-search"
            type="text"
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Search in title or content..."
            className="filter-input"
            disabled={loading}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-sort-by">Sort By</label>
          <select
            id="filter-sort-by"
            value={localFilters.sortBy || 'createdAt'}
            onChange={(e) =>
              handleFilterChange('sortBy', e.target.value as 'createdAt' | 'updatedAt' | 'title')
            }
            className="filter-select"
            disabled={loading}
          >
            <option value="createdAt">Date Created</option>
            <option value="updatedAt">Date Updated</option>
            <option value="title">Title</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-sort-order">Order</label>
          <select
            id="filter-sort-order"
            value={localFilters.sortOrder || 'desc'}
            onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
            className="filter-select"
            disabled={loading}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="filter-actions">
          <button
            type="button"
            className="btn-apply-filters"
            onClick={handleApplyFilters}
            disabled={loading}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

