# Navbar Design Documentation

## Overview

The top navigation bar is a minimal, compact, professional horizontal navigation component designed for enterprise vitco desktop applications. It prioritizes clarity, efficiency, and consistency over visual flair.

## Structure

### Layout (48px height)

```
┌─────────────────────────────────────────────────────────────┐
│ [vitco Desktop]  [Dashboard] [Attendance] [Reports]  [User ▼] │
└─────────────────────────────────────────────────────────────┘
   LEFT              CENTER                    RIGHT
```

### Sections

1. **Left Section** (Logo/App Name)
   - Text-based app name: "vitco Desktop"
   - Clickable, navigates to Dashboard
   - No heavy branding or icons

2. **Center Section** (Primary Navigation)
   - Horizontal list of navigation items
   - Text-only labels: Dashboard, Attendance, Reports
   - Active item highlighted with accent color and underline
   - Hover state: subtle background change

3. **Right Section** (User Menu)
   - User name (prominent)
   - User role (small, muted text)
   - Dropdown menu on click
   - Menu items: Logout (extensible for Profile, Settings)

## Visual Design

### Colors
- **Background**: White (`--color-bg-primary`)
- **Border**: Light gray bottom border (`--color-border`)
- **Text (inactive)**: Secondary gray (`--color-text-secondary`)
- **Text (active)**: Primary blue (`--color-primary`)
- **Hover**: Light gray background (`--color-bg-secondary`)

### Typography
- **Font size**: 13px (`--font-size-base`)
- **Font weight**: Normal (400) for nav items, Medium (500) for active
- **User name**: Medium weight
- **User role**: Small (12px), tertiary color

### Spacing
- **Height**: 48px (compact, not overwhelming)
- **Padding**: 12px horizontal (`--spacing-xl`)
- **Nav item padding**: 6px vertical, 10px horizontal
- **Gap between items**: 4px

### Interactions
- **Hover**: Subtle background color change
- **Active**: Blue color + underline indicator
- **Focus**: 2px blue outline for keyboard navigation
- **No animations**: Instant state changes

## Accessibility

### ARIA Attributes
- `role="navigation"` on nav element
- `role="menubar"` on nav list
- `role="menuitem"` on nav buttons
- `aria-current="page"` on active item
- `aria-expanded` on user menu trigger
- `aria-haspopup` on user menu trigger

### Keyboard Navigation
- **Tab**: Navigate through nav items
- **Enter/Space**: Activate nav item
- **Escape**: Close user menu
- **Focus visible**: Clear outline indicator

## Role-Based Features (Future-Ready)

### Current Implementation
- All nav items visible to all roles
- No role restrictions yet

### Extensibility
```typescript
interface NavItem {
  label: string;
  path: string;
  roles?: string[];      // Optional role restriction
  disabled?: boolean;   // Optional disabled state
}
```

### Future Enhancements
- Hide/show items based on user role
- Disable items for certain roles
- Add role-specific navigation items
- Conditional menu items in user dropdown

## Component Structure

```
Navbar
├── navbar-container
│   ├── navbar-left (Logo)
│   ├── navbar-center (Nav Items)
│   │   └── navbar-nav (List)
│   │       └── navbar-nav-item (Buttons)
│   └── navbar-right (User Menu)
│       ├── navbar-user-trigger
│       └── navbar-user-menu (Dropdown)
│           └── navbar-menu-item
```

## Usage Example

```tsx
import { Navbar } from '@/components/Layout/Navbar';

// In AppLayout
<Navbar />
```

## Customization

### Adding Navigation Items
Edit `NAV_ITEMS` array in `Navbar.tsx`:

```typescript
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Reports', path: '/reports' },
  { label: 'New Item', path: '/new-item', roles: ['admin', 'hr'] },
];
```

### Styling Overrides
All styles use CSS custom properties from the design system. Override in `Navbar.css` if needed.

## Best Practices

1. **Keep it minimal**: Don't add icons unless they add clear meaning
2. **Text-first**: Prefer text labels over icons
3. **Consistent spacing**: Use design system spacing variables
4. **Accessible**: Always include ARIA attributes
5. **Keyboard-friendly**: Ensure all interactions work with keyboard
6. **Role-aware**: Design for role-based visibility (even if not implemented yet)

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Electron renderer process
- No IE11 support required

## Performance

- Minimal DOM structure
- CSS-only hover states (no JavaScript)
- Efficient click handlers
- No unnecessary re-renders

---

**Design Philosophy**: Information-focused, productivity-oriented, enterprise-grade navigation for daily use.

