# Attendance Page Design Documentation

## Overview

The Attendance page is a role-aware, enterprise-grade attendance management interface that adapts its UI and functionality based on the logged-in user's role and permissions.

## Role-Based Permissions

### Employee
- ✅ **Can mark own attendance** (Check In/Check Out)
- ✅ **Can view own attendance** status and details
- ❌ **Cannot view others' attendance**

### Manager
- ✅ **Can mark own attendance** (Check In/Check Out)
- ✅ **Can view own attendance** status and details
- ✅ **Can view team attendance** (employees in same department)
- ❌ **Cannot view other departments**

### HR
- ✅ **Can mark own attendance** (Check In/Check Out)
- ✅ **Can view own attendance** status and details
- ✅ **Can view all employees' attendance**
- ✅ **Can view all managers' attendance**
- ❌ **Cannot view HRs' or Admins' attendance**

### Admin
- ❌ **Cannot mark attendance** (view-only role)
- ✅ **Can view own attendance** status (read-only)
- ✅ **Can view all HRs' attendance**
- ✅ **Can view all managers' attendance**
- ✅ **Can view all employees' attendance**

## Page Structure

### 1. Self Attendance Section (Always Visible)

**Location:** Top of page

**Components:**
- Today's date display
- Current attendance status badge (Not Checked In / Checked In / Checked Out)
- Attendance details table:
  - Check-in time
  - Check-out time
  - Total duration (if checked out)
- Action buttons (role-dependent):
  - Check In button (if can mark attendance and not checked in)
  - Check Out button (if can mark attendance and checked in)
- Info message (for Admin: explains attendance marking unavailable)

**Visual Design:**
- Compact card layout
- Status badge with color coding
- Table-based details (data-dense)
- Clear action buttons or disabled state

### 2. Attendance List Section (Role-Based Visibility)

**Location:** Below self attendance section

**Visibility:**
- **Employee:** Hidden
- **Manager:** Visible (team members only)
- **HR:** Visible (employees + managers)
- **Admin:** Visible (all roles)

**Components:**
- Date filter (default: today)
- Attendance table with columns:
  - Name
  - Role
  - Department
  - Status (Checked In / Checked Out / Not Started)
  - Check-in time
  - Check-out time
  - Duration
- Summary statistics:
  - Total records
  - Checked In count
  - Checked Out count
  - Not Started count

**Visual Design:**
- Compact, data-dense table
- Read-only (no edit actions)
- Status badges with color coding
- Monospace font for times/durations
- Hover states for rows

## Component Architecture

```
AttendancePage
├── SelfAttendance (always visible)
│   ├── Status display
│   ├── Details table
│   └── Action buttons (conditional)
└── AttendanceList (role-based visibility)
    ├── Date filter
    ├── Attendance table
    └── Summary statistics
```

## State Management

### Self Attendance State
- Current attendance status
- Today's attendance record
- Loading state
- Error state
- Real-time updates via Socket.IO

### Attendance List State
- Dashboard data (filtered by role)
- Selected date
- Loading state
- Error state
- Real-time updates via Socket.IO

## API Integration

### Self Attendance
- `GET /attendance/status` - Get current status
- `POST /attendance/check-in` - Check in (if allowed)
- `POST /attendance/check-out` - Check out (if allowed)

### Attendance List
- `GET /attendance/dashboard` - Get filtered attendance data
  - Query params: `date`, `department` (for manager)
  - Backend filters based on viewer role

## Real-Time Updates

### Socket.IO Events
- `attendance:update` - Broadcast when any attendance changes
- `attendance:status` - Personal status update
- `attendance:dashboard:refresh` - Dashboard refresh signal

### Update Behavior
- Self attendance refreshes on personal updates
- Attendance list refreshes on any relevant update
- Immediate UI update after successful action

## Edge Cases Handled

1. **Network Failure**
   - Error message displayed
   - Retry capability
   - Server state is source of truth

2. **Duplicate Actions**
   - Buttons disabled when action not allowed
   - Server validates and rejects duplicates
   - Clear error messages

3. **Role Mismatch**
   - UI adapts based on role
   - Unauthorized actions hidden/disabled
   - Clear messaging for unavailable features

4. **Page Refresh**
   - State reloaded from server
   - No client-side state persistence
   - Always reflects server state

5. **Multiple Devices**
   - Server is single source of truth
   - Real-time updates sync across devices
   - Consistent state everywhere

## Visual Design Specifications

### Typography
- Base font: 13px
- Small text: 12px
- Headers: 16-20px
- Monospace for times/durations

### Colors
- Status badges: Color-coded (blue for checked in, green for checked out, gray for not started)
- Neutral backgrounds: White cards, light gray page background
- Accent: Primary blue for actions

### Spacing
- Compact padding: 12-16px
- Minimal gaps between elements
- Data-dense layout

### Tables
- Compact row height
- Clear column headers
- Hover states for rows
- No decorative elements

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Semantic HTML structure

## Extensibility

### Future Features Ready
- **Breaks:** Can extend status enum and add break actions
- **Location Validation:** Location fields already in data model
- **Wi-Fi Validation:** Can add network validation
- **Manual Overrides:** Admin can be given override capabilities
- **Shift Management:** Can add shift-based filtering
- **Reports:** Can link to detailed reports

### Role Extensions
- Easy to add new roles
- Role-based visibility configurable
- Permission system extensible

## Testing Checklist

- [ ] Employee can check in/out
- [ ] Employee cannot see attendance list
- [ ] Manager can check in/out
- [ ] Manager sees only team members
- [ ] HR can check in/out
- [ ] HR sees employees and managers (not HRs/Admins)
- [ ] Admin cannot check in/out
- [ ] Admin sees all roles
- [ ] Real-time updates work correctly
- [ ] Date filtering works
- [ ] Error states display correctly
- [ ] Loading states display correctly
- [ ] Network failures handled gracefully

---

**Design Philosophy:** Role clarity, correctness, and audit safety over visual flair. Enterprise-grade reliability and consistency.

