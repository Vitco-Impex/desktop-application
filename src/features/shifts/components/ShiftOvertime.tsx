/**
 * Shift Overtime Component
 * Configure overtime rules for a shift
 */

import React, { useState, useEffect } from 'react';
import { shiftService } from '@/services/shift.service';
import { Shift, ShiftOvertimeRules } from '@/types/shift';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { Checkbox } from '@/shared/components/ui/Checkbox';
import { LoadingState, ErrorState } from '@/shared/components/data-display';
import { Card } from '@/shared/components/ui/Card';
import { extractErrorMessage } from '@/utils/error';
import './ShiftOvertime.css';

interface ShiftOvertimeProps {
  shiftId: string;
}

export const ShiftOvertime: React.FC<ShiftOvertimeProps> = ({ shiftId }) => {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [overtimeRules, setOvertimeRules] = useState<ShiftOvertimeRules>({
    enabled: false,
    eligibleOnWorkingDays: true,
    eligibleOnHolidays: false,
    eligibleOnWeeklyOffs: false,
    excludeIfHalfDay: true,
    excludeIfAbsent: true,
    requireContinuousCheckIn: true,
    minimumMinutes: 30,
    bufferMinutesAfterShiftEnd: 0,
    hardStopTime: undefined,
    excludeBreakTime: true,
    maxHoursPerDay: undefined,
    maxHoursPerWeek: undefined,
    maxHoursPerMonth: undefined,
    exceedLimitBehavior: 'ignore',
    defaultClassification: 'paid',
    allowManualClassification: true,
    requireApproval: false,
    autoApprove: false,
    approvalRequiredWithinDays: undefined,
    roundingEnabled: false,
    roundingUnit: 15,
    roundingMethod: 'nearest',
  });

  useEffect(() => {
    loadShift();
  }, [shiftId]);

  const loadShift = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedShift = await shiftService.getShift(shiftId);
      setShift(loadedShift);
      if (loadedShift.overtimeRules) {
        setOvertimeRules(loadedShift.overtimeRules);
      }
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to load shift'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ShiftOvertimeRules, value: any) => {
    setOvertimeRules((prev) => ({
      ...prev,
      [field]: value,
    }));
    setSuccess(null);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await shiftService.updateShift(shiftId, {
        overtimeRules,
      });

      setSuccess('Overtime rules saved successfully');
      await loadShift();
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to save overtime rules'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="shift-overtime">
        <LoadingState message="Loading shift..." />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="shift-overtime">
        <ErrorState title="Shift not found" message="The shift you're looking for doesn't exist." />
      </div>
    );
  }

  return (
    <div className="shift-overtime">
      <div className="shift-overtime-header">
        <h3 className="shift-overtime-title">Overtime Configuration</h3>
        <p className="shift-overtime-subtitle">
          Configure how overtime is calculated and managed for <strong>{shift.name}</strong>
        </p>
      </div>

      {error && (
        <div className="shift-overtime-error-message">{error}</div>
      )}

      {success && (
        <div className="shift-overtime-success-message">{success}</div>
      )}

      <div className="shift-overtime-sections">
        {/* Enablement */}
        <Card className="shift-overtime-section">
          <div className="shift-overtime-section-header">
            <h4>Enablement</h4>
          </div>
          <div className="shift-overtime-section-content">
            <div className="shift-overtime-field">
              <label>
                <input
                  type="checkbox"
                  checked={overtimeRules.enabled}
                  onChange={(e) => handleChange('enabled', e.target.checked)}
                />
                <span>Enable overtime tracking for this shift</span>
              </label>
              <small>When disabled, extra hours are ignored completely</small>
            </div>
          </div>
        </Card>

        {overtimeRules.enabled && (
          <>
            {/* Eligibility */}
            <Card className="shift-overtime-section">
              <div className="shift-overtime-section-header">
                <h4>Eligibility Conditions</h4>
              </div>
              <div className="shift-overtime-section-content">
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.eligibleOnWorkingDays}
                      onChange={(e) => handleChange('eligibleOnWorkingDays', e.target.checked)}
                    />
                    <span>Allow overtime on working days</span>
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.eligibleOnHolidays}
                      onChange={(e) => handleChange('eligibleOnHolidays', e.target.checked)}
                    />
                    <span>Allow overtime on holidays</span>
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.eligibleOnWeeklyOffs}
                      onChange={(e) => handleChange('eligibleOnWeeklyOffs', e.target.checked)}
                    />
                    <span>Allow overtime on weekly offs</span>
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.excludeIfHalfDay}
                      onChange={(e) => handleChange('excludeIfHalfDay', e.target.checked)}
                    />
                    <span>Exclude overtime if attendance is marked as half-day</span>
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.excludeIfAbsent}
                      onChange={(e) => handleChange('excludeIfAbsent', e.target.checked)}
                    />
                    <span>Exclude overtime if attendance is marked as absent</span>
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.requireContinuousCheckIn}
                      onChange={(e) => handleChange('requireContinuousCheckIn', e.target.checked)}
                    />
                    <span>Require continuous check-in (no breaks after shift end)</span>
                  </label>
                </div>
              </div>
            </Card>

            {/* Qualification Threshold */}
            <Card className="shift-overtime-section">
              <div className="shift-overtime-section-header">
                <h4>Qualification Threshold</h4>
              </div>
              <div className="shift-overtime-section-content">
                <div className="shift-overtime-field">
                  <label>
                    Minimum minutes to qualify as overtime
                    <Input
                      type="number"
                      value={overtimeRules.minimumMinutes}
                      onChange={(e) => handleChange('minimumMinutes', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </label>
                  <small>Time below this threshold is ignored (e.g., 30 minutes)</small>
                </div>
              </div>
            </Card>

            {/* Calculation Window */}
            <Card className="shift-overtime-section">
              <div className="shift-overtime-section-header">
                <h4>Calculation Window</h4>
              </div>
              <div className="shift-overtime-section-content">
                <div className="shift-overtime-field">
                  <label>
                    Buffer minutes after shift end
                    <Input
                      type="number"
                      value={overtimeRules.bufferMinutesAfterShiftEnd}
                      onChange={(e) => handleChange('bufferMinutesAfterShiftEnd', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </label>
                  <small>Overtime starts after shift end + buffer (e.g., 10 minutes)</small>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    Hard stop time (optional)
                    <Input
                      type="time"
                      value={overtimeRules.hardStopTime || ''}
                      onChange={(e) => handleChange('hardStopTime', e.target.value || undefined)}
                    />
                  </label>
                  <small>Maximum time for overtime calculation (HH:mm format)</small>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.excludeBreakTime}
                      onChange={(e) => handleChange('excludeBreakTime', e.target.checked)}
                    />
                    <span>Exclude break time from overtime calculation</span>
                  </label>
                </div>
              </div>
            </Card>

            {/* Caps & Limits */}
            <Card className="shift-overtime-section">
              <div className="shift-overtime-section-header">
                <h4>Caps & Limits</h4>
              </div>
              <div className="shift-overtime-section-content">
                <div className="shift-overtime-field">
                  <label>
                    Maximum hours per day (leave empty for no limit)
                    <Input
                      type="number"
                      value={overtimeRules.maxHoursPerDay || ''}
                      onChange={(e) => handleChange('maxHoursPerDay', e.target.value ? parseFloat(e.target.value) : undefined)}
                      min="0"
                      step="0.5"
                    />
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    Maximum hours per week (leave empty for no limit)
                    <Input
                      type="number"
                      value={overtimeRules.maxHoursPerWeek || ''}
                      onChange={(e) => handleChange('maxHoursPerWeek', e.target.value ? parseFloat(e.target.value) : undefined)}
                      min="0"
                      step="0.5"
                    />
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    Maximum hours per month (leave empty for no limit)
                    <Input
                      type="number"
                      value={overtimeRules.maxHoursPerMonth || ''}
                      onChange={(e) => handleChange('maxHoursPerMonth', e.target.value ? parseFloat(e.target.value) : undefined)}
                      min="0"
                      step="0.5"
                    />
                  </label>
                </div>
                <div className="shift-overtime-field">
                  <label>
                    Behavior when limit exceeded
                    <select
                      value={overtimeRules.exceedLimitBehavior}
                      onChange={(e) => handleChange('exceedLimitBehavior', e.target.value as 'ignore' | 'flag')}
                    >
                      <option value="ignore">Ignore excess</option>
                      <option value="flag">Flag for HR review</option>
                    </select>
                  </label>
                </div>
              </div>
            </Card>

            {/* Classification */}
            <Card className="shift-overtime-section">
              <div className="shift-overtime-section-header">
                <h4>Classification</h4>
              </div>
              <div className="shift-overtime-section-content">
                <div className="shift-overtime-field">
                  <Select
                    label="Default classification"
                    value={overtimeRules.defaultClassification}
                    onChange={(e) => handleChange('defaultClassification', e.target.value as 'paid' | 'comp_off')}
                    options={[
                      { value: 'paid', label: 'Paid' },
                      { value: 'comp_off', label: 'Comp-off' },
                    ]}
                  />
                </div>
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.allowManualClassification}
                      onChange={(e) => handleChange('allowManualClassification', e.target.checked)}
                    />
                    <span>Allow HR/Admin to change classification</span>
                  </label>
                </div>
              </div>
            </Card>

            {/* Approval Workflow */}
            <Card className="shift-overtime-section">
              <div className="shift-overtime-section-header">
                <h4>Approval Workflow</h4>
              </div>
              <div className="shift-overtime-section-content">
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.requireApproval}
                      onChange={(e) => handleChange('requireApproval', e.target.checked)}
                    />
                    <span>Require approval for overtime</span>
                  </label>
                </div>
                {overtimeRules.requireApproval && (
                  <>
                    <div className="shift-overtime-field">
                      <label>
                        <input
                          type="checkbox"
                          checked={overtimeRules.autoApprove}
                          onChange={(e) => handleChange('autoApprove', e.target.checked)}
                        />
                        <span>Auto-approve (no manager action needed)</span>
                      </label>
                    </div>
                    <div className="shift-overtime-field">
                      <label>
                        Approval required within days (leave empty for no deadline)
                        <Input
                          type="number"
                          value={overtimeRules.approvalRequiredWithinDays || ''}
                          onChange={(e) => handleChange('approvalRequiredWithinDays', e.target.value ? parseInt(e.target.value) : undefined)}
                          min="1"
                        />
                      </label>
                      <small>Days after overtime to require approval (for post-approval)</small>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Rounding Rules */}
            <Card className="shift-overtime-section">
              <div className="shift-overtime-section-header">
                <h4>Rounding Rules</h4>
              </div>
              <div className="shift-overtime-section-content">
                <div className="shift-overtime-field">
                  <label>
                    <input
                      type="checkbox"
                      checked={overtimeRules.roundingEnabled}
                      onChange={(e) => handleChange('roundingEnabled', e.target.checked)}
                    />
                    <span>Enable rounding</span>
                  </label>
                </div>
                {overtimeRules.roundingEnabled && (
                  <>
                    <div className="shift-overtime-field">
                      <Select
                        label="Rounding unit (minutes)"
                        value={String(overtimeRules.roundingUnit)}
                        onChange={(e) => handleChange('roundingUnit', parseInt(e.target.value) as 15 | 30 | 60)}
                        options={[
                          { value: '15', label: '15 minutes' },
                          { value: '30', label: '30 minutes' },
                          { value: '60', label: '60 minutes' },
                        ]}
                      />
                    </div>
                    <div className="shift-overtime-field">
                      <Select
                        label="Rounding method"
                        value={overtimeRules.roundingMethod}
                        onChange={(e) => handleChange('roundingMethod', e.target.value as 'nearest' | 'floor')}
                        options={[
                          { value: 'nearest', label: 'Nearest' },
                          { value: 'floor', label: 'Floor (never round up)' },
                        ]}
                      />
                    </div>
                  </>
                )}
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="shift-overtime-actions">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="primary"
        >
          {saving ? 'Saving...' : 'Save Overtime Rules'}
        </Button>
      </div>
    </div>
  );
};
