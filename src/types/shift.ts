/**
 * Shift Management Types
 */

export interface ShiftBreak {
  name: string;
  type: 'fixed' | 'flexible';
  // Fixed break fields
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  // Flexible break fields
  allowedWindowStart?: string; // HH:mm
  allowedWindowEnd?: string; // HH:mm
  duration: number; // minutes
  isPaid: boolean;
  autoDeduct: boolean;
  autoStart: boolean; // For fixed breaks
  autoEnd: boolean; // For flexible breaks
  status: 'active' | 'inactive';
  // Validation rules
  minDuration?: number;
  maxDuration: number;
  // Abuse prevention
  dailyLimit?: number; // undefined = unlimited
  // Order/priority
  order: number;
}

export interface ShiftCheckInRules {
  earliestCheckIn: number; // minutes
  latestCheckIn: number; // minutes
  gracePeriod: number; // minutes
  allowMultipleCheckIns: boolean;
  allowManualCheckIn: boolean;
  lateCheckInBehavior: 'flag' | 'mark_late' | 'half_day' | 'deduct_leave';
  allowEarlyCheckIn: boolean;
  monthlyLateLimit: number; // 0 = unlimited
}

export interface ShiftCheckOutRules {
  earliestCheckOut: number; // minutes
  autoCheckOutTime?: string; // HH:mm
  autoCheckOutEnabled: boolean;
  gracePeriod: number; // minutes
  allowManualCheckOut: boolean;
  earlyCheckOutBehavior: 'flag' | 'half_day' | 'absent';
}

export interface ShiftOvertimeRules {
  // Enablement
  enabled: boolean;
  
  // Eligibility
  eligibleOnWorkingDays: boolean;
  eligibleOnHolidays: boolean;
  eligibleOnWeeklyOffs: boolean;
  excludeIfHalfDay: boolean;
  excludeIfAbsent: boolean;
  requireContinuousCheckIn: boolean;
  
  // Qualification threshold
  minimumMinutes: number;
  
  // Calculation window
  bufferMinutesAfterShiftEnd: number;
  hardStopTime?: string;
  excludeBreakTime: boolean;
  
  // Caps & Limits
  maxHoursPerDay?: number;
  maxHoursPerWeek?: number;
  maxHoursPerMonth?: number;
  exceedLimitBehavior: 'ignore' | 'flag';
  
  // Classification
  defaultClassification: 'paid' | 'comp_off';
  allowManualClassification: boolean;
  
  // Approval workflow
  requireApproval: boolean;
  autoApprove: boolean;
  approvalRequiredWithinDays?: number;
  
  // Rounding rules
  roundingEnabled: boolean;
  roundingUnit: 15 | 30 | 60;
  roundingMethod: 'nearest' | 'floor';
}

export interface ShiftAttendanceRules {
  minHoursForFullDay: number;
  minHoursForHalfDay: number;
  graceLimitPerMonth: number;
  deductGraceFromLeave: boolean;
  markAsHalfDayOnGrace: boolean;
  halfDayThresholdLateArrival: number; // minutes
  halfDayThresholdEarlyDeparture: number; // minutes
  halfDayTreatment: 'deduct_leave' | 'unpaid' | 'carry_forward';
  markAbsentOnNoCheckIn: boolean;
  markAbsentBelowMinHours: boolean;
  allowManualOverride: boolean;
  excludeUnpaidBreaks: boolean;
  maxBreakOveruse: number; // 0 = no limit
  breakOveruseBehavior: 'flag' | 'deduct_hours' | 'half_day';
  dailyGraceAllowed: number; // minutes
  graceCarryForward: boolean;
}

export interface ShiftRestrictions {
  requireWifi: boolean;
  requireLocation: boolean;
  requireDeviceFingerprint: boolean;
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  status: 'active' | 'inactive';
  checkInRules: ShiftCheckInRules;
  checkOutRules: ShiftCheckOutRules;
  workingDays: number[]; // 0-6 where 0=Sunday
  weeklyOffs: number[];
  breakRules: ShiftBreak[];
  overtimeRules: ShiftOvertimeRules;
  attendanceRules: ShiftAttendanceRules;
  holidayBehavior: 'ignore' | 'paid' | 'optional_with_compoff';
  restrictions: ShiftRestrictions;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftRequest {
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  status?: 'active' | 'inactive';
  checkInRules?: Partial<ShiftCheckInRules>;
  checkOutRules?: Partial<ShiftCheckOutRules>;
  workingDays: number[];
  weeklyOffs?: number[];
  breakRules?: ShiftBreak[];
  overtimeRules?: Partial<ShiftOvertimeRules>;
  attendanceRules?: Partial<ShiftAttendanceRules>;
  holidayBehavior?: 'ignore' | 'paid' | 'optional_with_compoff';
  restrictions?: Partial<ShiftRestrictions>;
}

export interface UpdateShiftRequest extends Partial<CreateShiftRequest> {
  status?: 'active' | 'inactive';
}

export interface ShiftListQuery {
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
  search?: string;
}

export interface ShiftListResponse {
  shifts: Shift[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ShiftAssignment {
  id: string;
  assignmentMode: 'individual' | 'team' | 'department' | 'role';
  employeeId?: string;
  employeeName?: string;
  teamId?: string;
  department?: string;
  role?: string;
  shiftId?: string;
  shiftName?: string;
  shiftCode?: string;
  assignmentType: 'permanent' | 'temporary' | 'rotational' | 'override';
  rotationalConfig?: {
    pattern: 'weekly' | 'bi_weekly' | 'custom';
    cycleDays?: number;
    shiftSequence: string[];
    shiftSequenceNames?: string[];
  };
  startDate: string;
  endDate?: string;
  priority: number;
  assignedBy: string;
  assignedByName?: string;
  reason?: string;
  status: 'active' | 'completed' | 'cancelled';
  overridesAssignmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateShiftAssignmentRequest {
  assignmentMode: 'individual' | 'team' | 'department' | 'role';
  employeeId?: string; // Required for individual mode, optional for team mode (manager ID)
  teamId?: string; // For team mode (optional, can use employeeId instead)
  department?: string; // For department mode
  role?: string; // For role mode (UserRole enum value)
  shiftId?: string; // Not required for rotational type
  assignmentType: 'permanent' | 'temporary' | 'rotational' | 'override';
  rotationalConfig?: {
    pattern: 'weekly' | 'bi_weekly' | 'custom';
    cycleDays?: number;
    shiftSequence: string[];
  };
  startDate: string;
  endDate?: string;
  priority?: number;
  overridesAssignmentId?: string;
  reason?: string;
}

export interface UpdateShiftAssignmentRequest {
  shiftId?: string;
  assignmentType?: 'permanent' | 'temporary' | 'rotational' | 'override';
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'completed' | 'cancelled';
  priority?: number;
  rotationalConfig?: {
    pattern: 'weekly' | 'bi_weekly' | 'custom';
    cycleDays?: number;
    shiftSequence: string[];
  };
  reason?: string;
}

export interface ShiftAssignmentQuery {
  employeeId?: string;
  shiftId?: string;
  status?: 'active' | 'completed' | 'cancelled' | 'all';
  page?: number;
  limit?: number;
}

export interface ShiftAssignmentListResponse {
  assignments: ShiftAssignment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

