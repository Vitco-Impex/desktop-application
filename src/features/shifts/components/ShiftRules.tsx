/**
 * Shift Rules Component
 * Comprehensive rules configuration for attendance calculation
 */

import React, { useState, useEffect } from 'react';
import { shiftService } from '@/services/shift.service';
import { Shift, ShiftCheckInRules, ShiftCheckOutRules, ShiftAttendanceRules, ShiftOvertimeRules } from '@/types/shift';
import { Button } from '@/shared/components/ui/Button';
import './ShiftRules.css';

interface ShiftRulesProps {
  shiftId: string;
}

type RuleSection = 'checkin' | 'checkout' | 'grace' | 'hours' | 'breaks' | 'overtime' | 'halfday' | 'absent' | 'holiday' | 'penalty';

export const ShiftRules: React.FC<ShiftRulesProps> = ({ shiftId }) => {
  const [shift, setShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<RuleSection>>(new Set(['checkin']));

  // Form state
  const [checkInRules, setCheckInRules] = useState<ShiftCheckInRules | null>(null);
  const [checkOutRules, setCheckOutRules] = useState<ShiftCheckOutRules | null>(null);
  const [attendanceRules, setAttendanceRules] = useState<ShiftAttendanceRules | null>(null);
  const [overtimeRules, setOvertimeRules] = useState<ShiftOvertimeRules | null>(null);
  const [holidayBehavior, setHolidayBehavior] = useState<'ignore' | 'paid' | 'optional_with_compoff'>('ignore');

  useEffect(() => {
    loadShift();
  }, [shiftId]);

  const loadShift = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await shiftService.getShift(shiftId);
      setShift(data);
      setCheckInRules(data.checkInRules);
      setCheckOutRules(data.checkOutRules);
      setAttendanceRules(data.attendanceRules);
      setOvertimeRules(data.overtimeRules);
      setHolidayBehavior(data.holidayBehavior);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load shift rules');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: RuleSection) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!shift || !checkInRules || !checkOutRules || !attendanceRules || !overtimeRules) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await shiftService.updateShift(shift.id, {
        checkInRules,
        checkOutRules,
        attendanceRules,
        overtimeRules,
        holidayBehavior,
      });
      setSuccess('Rules updated successfully. Changes will apply from tomorrow.');
      await loadShift();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to update rules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="shift-rules-loading">Loading rules...</div>;
  if (error && !shift) return <div className="shift-rules-error">{error}</div>;
  if (!shift || !checkInRules || !checkOutRules || !attendanceRules || !overtimeRules) {
    return <div className="shift-rules-error">Shift not found</div>;
  }

  return (
    <div className="shift-rules">
      <div className="shift-rules-header">
        <div>
          <h3 className="shift-rules-title">Rules: {shift.name}</h3>
          <p className="shift-rules-subtitle">Configure how attendance is calculated for this shift</p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Rules'}
        </Button>
      </div>

      {error && <div className="shift-rules-error-message">{error}</div>}
      {success && <div className="shift-rules-success-message">{success}</div>}

      <div className="shift-rules-sections">
        {/* Check-In Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('checkin')}>
            <h4>1. Check-In Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('checkin') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('checkin') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label>Earliest Check-In</label>
                <input
                  type="number"
                  value={checkInRules.earliestCheckIn}
                  onChange={(e) => setCheckInRules({ ...checkInRules, earliestCheckIn: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes before shift start (e.g., 30 = 30 min early)</small>
              </div>
              <div className="shift-rules-field">
                <label>Latest Allowed Check-In</label>
                <input
                  type="number"
                  value={checkInRules.latestCheckIn}
                  onChange={(e) => setCheckInRules({ ...checkInRules, latestCheckIn: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes after shift start (grace window)</small>
              </div>
              <div className="shift-rules-field">
                <label>Grace Period</label>
                <input
                  type="number"
                  value={checkInRules.gracePeriod}
                  onChange={(e) => setCheckInRules({ ...checkInRules, gracePeriod: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes of grace for late arrival</small>
              </div>
              <div className="shift-rules-field">
                <label>Late Check-In Behavior</label>
                <select
                  value={checkInRules.lateCheckInBehavior}
                  onChange={(e) => setCheckInRules({ ...checkInRules, lateCheckInBehavior: e.target.value as any })}
                >
                  <option value="flag">Flag only</option>
                  <option value="mark_late">Mark as late</option>
                  <option value="half_day">Convert to half-day</option>
                  <option value="deduct_leave">Deduct from leave</option>
                </select>
              </div>
              <div className="shift-rules-field">
                <label>Monthly Late Limit</label>
                <input
                  type="number"
                  value={checkInRules.monthlyLateLimit}
                  onChange={(e) => setCheckInRules({ ...checkInRules, monthlyLateLimit: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Max late arrivals per month (0 = unlimited)</small>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={checkInRules.allowEarlyCheckIn}
                    onChange={(e) => setCheckInRules({ ...checkInRules, allowEarlyCheckIn: e.target.checked })}
                  />
                  <span>Allow early check-in</span>
                </label>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={checkInRules.allowMultipleCheckIns}
                    onChange={(e) => setCheckInRules({ ...checkInRules, allowMultipleCheckIns: e.target.checked })}
                  />
                  <span>Allow multiple check-ins per day</span>
                </label>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={checkInRules.allowManualCheckIn}
                    onChange={(e) => setCheckInRules({ ...checkInRules, allowManualCheckIn: e.target.checked })}
                  />
                  <span>Allow manual check-in by HR/Admin</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Check-Out Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('checkout')}>
            <h4>2. Check-Out Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('checkout') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('checkout') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label>Earliest Allowed Check-Out</label>
                <input
                  type="number"
                  value={checkOutRules.earliestCheckOut}
                  onChange={(e) => setCheckOutRules({ ...checkOutRules, earliestCheckOut: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes before shift end</small>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={checkOutRules.autoCheckOutEnabled}
                    onChange={(e) => setCheckOutRules({ ...checkOutRules, autoCheckOutEnabled: e.target.checked })}
                  />
                  <span>Enable auto check-out</span>
                </label>
              </div>
              {checkOutRules.autoCheckOutEnabled && (
                <div className="shift-rules-field">
                  <label>Auto Check-Out Time</label>
                  <input
                    type="time"
                    value={checkOutRules.autoCheckOutTime || ''}
                    onChange={(e) => setCheckOutRules({ ...checkOutRules, autoCheckOutTime: e.target.value })}
                  />
                  <small>Time to auto-checkout if employee forgets</small>
                </div>
              )}
              <div className="shift-rules-field">
                <label>Grace Period</label>
                <input
                  type="number"
                  value={checkOutRules.gracePeriod}
                  onChange={(e) => setCheckOutRules({ ...checkOutRules, gracePeriod: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes of grace for early departure</small>
              </div>
              <div className="shift-rules-field">
                <label>Early Check-Out Behavior</label>
                <select
                  value={checkOutRules.earlyCheckOutBehavior}
                  onChange={(e) => setCheckOutRules({ ...checkOutRules, earlyCheckOutBehavior: e.target.value as any })}
                >
                  <option value="flag">Flag only</option>
                  <option value="half_day">Mark as half-day</option>
                  <option value="absent">Mark as absent</option>
                </select>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={checkOutRules.allowManualCheckOut}
                    onChange={(e) => setCheckOutRules({ ...checkOutRules, allowManualCheckOut: e.target.checked })}
                  />
                  <span>Allow manual check-out by HR/Admin</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Grace Period Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('grace')}>
            <h4>3. Grace Period Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('grace') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('grace') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label>Daily Grace Allowed</label>
                <input
                  type="number"
                  value={attendanceRules.dailyGraceAllowed}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, dailyGraceAllowed: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes of grace per day</small>
              </div>
              <div className="shift-rules-field">
                <label>Monthly Grace Limit</label>
                <input
                  type="number"
                  value={attendanceRules.graceLimitPerMonth}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, graceLimitPerMonth: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Max grace usage per month (0 = unlimited)</small>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={attendanceRules.graceCarryForward}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, graceCarryForward: e.target.checked })}
                  />
                  <span>Carry forward unused grace</span>
                </label>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={attendanceRules.deductGraceFromLeave}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, deductGraceFromLeave: e.target.checked })}
                  />
                  <span>Deduct grace usage from leave balance</span>
                </label>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={attendanceRules.markAsHalfDayOnGrace}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, markAsHalfDayOnGrace: e.target.checked })}
                  />
                  <span>Mark as half-day when grace exceeds limit</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Minimum Working Hours Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('hours')}>
            <h4>4. Minimum Working Hours Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('hours') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('hours') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label>Minimum Hours for Full Day</label>
                <input
                  type="number"
                  step="0.5"
                  value={attendanceRules.minHoursForFullDay}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, minHoursForFullDay: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="24"
                />
                <small>Hours required to count as full day</small>
              </div>
              <div className="shift-rules-field">
                <label>Minimum Hours for Half Day</label>
                <input
                  type="number"
                  step="0.5"
                  value={attendanceRules.minHoursForHalfDay}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, minHoursForHalfDay: parseFloat(e.target.value) || 0 })}
                  min="0"
                  max="24"
                />
                <small>Hours required to count as half day</small>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={attendanceRules.excludeUnpaidBreaks}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, excludeUnpaidBreaks: e.target.checked })}
                  />
                  <span>Exclude unpaid breaks from working hours</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Half-Day Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('halfday')}>
            <h4>5. Half-Day Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('halfday') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('halfday') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label>Late Arrival Threshold for Half-Day</label>
                <input
                  type="number"
                  value={attendanceRules.halfDayThresholdLateArrival}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, halfDayThresholdLateArrival: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes late = automatic half-day</small>
              </div>
              <div className="shift-rules-field">
                <label>Early Departure Threshold for Half-Day</label>
                <input
                  type="number"
                  value={attendanceRules.halfDayThresholdEarlyDeparture}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, halfDayThresholdEarlyDeparture: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Minutes early = automatic half-day</small>
              </div>
              <div className="shift-rules-field">
                <label>Half-Day Treatment</label>
                <select
                  value={attendanceRules.halfDayTreatment}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, halfDayTreatment: e.target.value as any })}
                >
                  <option value="deduct_leave">Deduct half leave</option>
                  <option value="unpaid">Mark as unpaid</option>
                  <option value="carry_forward">Carry forward for payroll</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Absent Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('absent')}>
            <h4>6. Absent Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('absent') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('absent') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={attendanceRules.markAbsentOnNoCheckIn}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, markAbsentOnNoCheckIn: e.target.checked })}
                  />
                  <span>Mark absent if no check-in</span>
                </label>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={attendanceRules.markAbsentBelowMinHours}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, markAbsentBelowMinHours: e.target.checked })}
                  />
                  <span>Mark absent if working hours below minimum</span>
                </label>
              </div>
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={attendanceRules.allowManualOverride}
                    onChange={(e) => setAttendanceRules({ ...attendanceRules, allowManualOverride: e.target.checked })}
                  />
                  <span>Allow manual override by HR/Admin (requires reason)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Break Impact Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('breaks')}>
            <h4>7. Break Impact Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('breaks') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('breaks') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label>Max Break Overuse</label>
                <input
                  type="number"
                  value={attendanceRules.maxBreakOveruse}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, maxBreakOveruse: parseInt(e.target.value) || 0 })}
                  min="0"
                />
                <small>Max minutes break can be exceeded (0 = no limit)</small>
              </div>
              <div className="shift-rules-field">
                <label>Break Overuse Behavior</label>
                <select
                  value={attendanceRules.breakOveruseBehavior}
                  onChange={(e) => setAttendanceRules({ ...attendanceRules, breakOveruseBehavior: e.target.value as any })}
                >
                  <option value="flag">Flag only</option>
                  <option value="deduct_hours">Deduct from working hours</option>
                  <option value="half_day">Mark as half-day</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Overtime Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('overtime')}>
            <h4>8. Overtime Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('overtime') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('overtime') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label className="shift-rules-checkbox-label">
                  <input
                    type="checkbox"
                    checked={overtimeRules.enabled}
                    onChange={(e) => setOvertimeRules({ ...overtimeRules, enabled: e.target.checked })}
                  />
                  <span>Enable overtime calculation</span>
                </label>
              </div>
              {overtimeRules.enabled && (
                <>
                  <div className="shift-rules-field">
                    <label>Minimum Minutes to Qualify</label>
                    <input
                      type="number"
                      value={overtimeRules.minimumMinutes}
                      onChange={(e) => setOvertimeRules({ ...overtimeRules, minimumMinutes: parseInt(e.target.value) || 0 })}
                      min="0"
                    />
                    <small>Minimum extra minutes to count as overtime</small>
                  </div>
                  <div className="shift-rules-field">
                    <label>Max Overtime per Day (hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={overtimeRules.maxHoursPerDay || ''}
                      onChange={(e) => setOvertimeRules({ ...overtimeRules, maxHoursPerDay: e.target.value ? parseFloat(e.target.value) : undefined })}
                      min="0"
                    />
                    <small>Maximum overtime hours per day (leave empty for no limit)</small>
                  </div>
                  <div className="shift-rules-field">
                    <label className="shift-rules-checkbox-label">
                      <input
                        type="checkbox"
                        checked={overtimeRules.isPaid}
                        onChange={(e) => setOvertimeRules({ ...overtimeRules, isPaid: e.target.checked })}
                      />
                      <span>Overtime is paid</span>
                    </label>
                  </div>
                  <div className="shift-rules-field">
                    <label className="shift-rules-checkbox-label">
                      <input
                        type="checkbox"
                        checked={overtimeRules.isCompOffEligible}
                        onChange={(e) => setOvertimeRules({ ...overtimeRules, isCompOffEligible: e.target.checked })}
                      />
                      <span>Overtime is comp-off eligible</span>
                    </label>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Holiday & Week-Off Rules */}
        <div className="shift-rules-section">
          <div className="shift-rules-section-header" onClick={() => toggleSection('holiday')}>
            <h4>9. Holiday & Week-Off Rules</h4>
            <span className="shift-rules-toggle">{expandedSections.has('holiday') ? '−' : '+'}</span>
          </div>
          {expandedSections.has('holiday') && (
            <div className="shift-rules-section-content">
              <div className="shift-rules-field">
                <label>Holiday Behavior</label>
                <select
                  value={holidayBehavior}
                  onChange={(e) => {
                    setHolidayBehavior(e.target.value as any);
                  }}
                >
                  <option value="ignore">Ignore attendance (holiday off)</option>
                  <option value="paid">Count as paid holiday</option>
                  <option value="optional_with_compoff">Allow optional work with comp-off</option>
                </select>
                <small>What happens if employee checks in on a holiday</small>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="shift-rules-footer">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Rules'}
        </Button>
        <p className="shift-rules-note">Rule changes apply from tomorrow. Historical attendance remains unchanged.</p>
      </div>
    </div>
  );
};
