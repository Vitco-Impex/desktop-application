/**
 * Inline Edit Field - Reusable component for inline editing
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/shared/components/ui';
import { Button } from '@/shared/components/ui';
import './InlineEditField.css';

interface InlineEditFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => Promise<void> | void;
  disabled?: boolean;
  type?: 'text' | 'email' | 'tel' | 'date';
  placeholder?: string;
  readOnly?: boolean;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  label,
  value,
  onSave,
  disabled = false,
  type = 'text',
  placeholder,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleEdit = () => {
    if (disabled || readOnly) return;
    setIsEditing(true);
    setEditValue(value);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (readOnly) {
    return (
      <div className="inline-edit-field">
        <label className="inline-edit-label">{label}</label>
        <div className="inline-edit-value">{value || '—'}</div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="inline-edit-field">
        <Input
          label={label}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={placeholder}
          error={error || undefined}
          disabled={saving}
          autoFocus
        />
        <div className="inline-edit-actions">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || editValue === value}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-edit-field">
      <label className="inline-edit-label">{label}</label>
      <div className="inline-edit-value-container">
        <div className="inline-edit-value" onClick={handleEdit}>
          {value || <span className="inline-edit-placeholder">{placeholder || 'Click to edit'}</span>}
        </div>
        {!disabled && (
          <button
            className="inline-edit-button"
            onClick={handleEdit}
            title="Edit"
          >
            ✏️
          </button>
        )}
      </div>
    </div>
  );
};

