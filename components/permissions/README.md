# Real-Time Permissions System

This directory contains components and hooks for the real-time permissions system that uses WebSocket connections to receive instant permission updates.

## Overview

The system provides:
- Real-time permission updates via WebSocket
- Fallback to REST API when WebSocket is unavailable
- Connection status indicators
- Helper hooks for permission checking
- Automatic reconnection on failure

## Hooks

### `usePermissions()`

Main hook for accessing permissions and connection status.

```tsx
import { usePermissions } from "@/hooks/usePermissions";

function MyComponent() {
  const {
    permissions,    // string[] - List of permission codenames
    version,        // number | null - Current version of permissions
    source,         // "ws" | "api" | null - Source of permissions (WebSocket or API)
    isConnecting,   // boolean - Whether WebSocket is connecting
    isConnected,    // boolean - Whether WebSocket is connected
    hasError,       // boolean - Whether there's a connection error
    retryConnection // function - Manual retry function
  } = usePermissions();

  // Check for specific permission
  const canEdit = permissions.includes("can_edit");

  return (
    <div>
      {canEdit && <button>Edit</button>}
      <small>Permissions v{version} via {source}</small>
    </div>
  );
}
```

### `useHasPermission(permission: string): boolean`

Helper hook to check for a specific permission.

```tsx
import { useHasPermission } from "@/hooks/usePermissions";

function EditButton() {
  const canEdit = useHasPermission("can_edit");

  if (!canEdit) return null;

  return <button>Edit</button>;
}
```

### `useHasPermissions(permissions: string[]): boolean`

Helper hook to check for ALL specified permissions.

```tsx
import { useHasPermissions } from "@/hooks/usePermissions";

function AdminPanel() {
  const isAdmin = useHasPermissions(["can_edit", "can_delete", "can_view"]);

  if (!isAdmin) return <div>Access denied</div>;

  return <AdminPanelContent />;
}
```

### `useHasAnyPermission(permissions: string[]): boolean`

Helper hook to check for ANY of the specified permissions.

```tsx
import { useHasAnyPermission } from "@/hooks/usePermissions";

function ModeratorTools() {
  const isModerator = useHasAnyPermission(["can_edit", "can_delete"]);

  if (!isModerator) return null;

  return <ModeratorTools />;
}
```

## Components

### `PermissionsConnectionStatus`

Displays a connection status bar at the bottom of the screen.

```tsx
import { PermissionsConnectionStatus } from "@/app/[locale]/(home)/components/permissions-connection-status";

function AppLayout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
      <PermissionsConnectionStatus />
    </div>
  );
}
```

**Features:**
- Shows "Connecting..." when establishing WebSocket connection
- Shows "Connection failed" with retry button on error
- Automatically hides when successfully connected
- Fixed position at bottom of screen with primary background
- Full width

### `PermissionsExample`

Example component demonstrating all features of the permissions system.

```tsx
import { PermissionsExample } from "@/components/permissions/PermissionsExample";

function ExamplePage() {
  return (
    <div>
      <h1>Permissions Demo</h1>
      <PermissionsExample />
    </div>
  );
}
```

## Integration

### 1. Add to Root Layout

Add the `PermissionsConnectionStatus` component to your root layout to show connection status:

```tsx
// app/layout.tsx
import { PermissionsConnectionStatus } from "@/app/[locale]/(home)/components/permissions-connection-status";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <PermissionsConnectionStatus />
      </body>
    </html>
  );
}
```

### 2. Use in Protected Components

Use the permission hooks to conditionally render content:

```tsx
import { useHasPermission } from "@/hooks/usePermissions";

function Dashboard() {
  const canViewDashboard = useHasPermission("view_dashboard");

  if (!canViewDashboard) {
    return <div>You don't have permission to view the dashboard</div>;
  }

  return <DashboardContent />;
}
```

### 3. Check Permissions in Actions

```tsx
import { useHasPermission } from "@/hooks/usePermissions";

function DeleteButton({ itemId }) {
  const canDelete = useHasPermission("can_delete");

  const handleDelete = async () => {
    if (!canDelete) {
      alert("You don't have permission to delete");
      return;
    }

    // Perform delete action
  };

  return (
    <button onClick={handleDelete} disabled={!canDelete}>
      Delete
    </button>
  );
}
```

## Backend Integration

The system expects:
- WebSocket endpoint: `ws://host:port/ws/permissions/`
- Fallback API endpoint: `GET /api/v2/permissions/current/`
- JWT authentication via cookies/session

## Styling

The `PermissionsConnectionStatus` component uses the following Tailwind classes:
- `bg-primary` for background color
- `text-primary-foreground` for text color
- Fixed positioning at bottom of screen
- Full width

You can customize the appearance by modifying the component in `hooks/usePermissions.ts`.

## Error Handling

The system automatically:
1. Falls back to REST API when WebSocket fails
2. Attempts to reconnect WebSocket every 3 seconds on failure
3. Shows visual feedback for connection status
4. Provides manual retry option

## Performance

- Permission checks are memoized
- WebSocket reconnection uses exponential backoff (fixed 3s for now)
- Version tracking prevents unnecessary re-renders
- Cleanup on component unmount

## Troubleshooting

### WebSocket Connection Issues
1. Check that Django Channels is running
2. Verify Redis is running on port 6379
3. Check browser console for WebSocket errors
4. Ensure CORS is properly configured

### Permission Not Updating
1. Check WebSocket connection status
2. Verify signals are firing in Django admin
3. Check Redis cache for permission data
4. Look for errors in Django logs

### API Fallback Not Working
1. Verify `/api/v2/permissions/current/` endpoint exists
2. Check authentication is working
3. Verify Redis connection in Django
