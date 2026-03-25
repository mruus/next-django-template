# Plan: Fix WebSocket Notifications for Permission Changes

## Problem Analysis
The WebSocket consumers are not being notified when permissions are changed via:
1. `UserDirectPermissionsDeltaView` - Direct permission assignments to users
2. `UserGroupsDeltaView` - Group assignments to users

Although signals are properly registered and implemented, there may be transaction timing issues or the need for manual triggers.

## Solution Plan

### 1. Add Manual Signal Triggers in Service Methods
We'll add explicit calls to trigger permission updates in the service methods to ensure WebSocket notifications are sent:

**File: `/Users/mruus/Desktop/projects/sna-v2/server/core/permissions/service.py`**
- In `apply_user_direct_permission_delta()`: After `user.user_permissions.add(*perms)` and `user.user_permissions.remove(*perms)`, call `trigger_permission_update(user.pk)`
- In `apply_group_permission_delta()`: After `group.permissions.add(*perms)` and `group.permissions.remove(*perms)`, trigger updates for all users in the group

**File: `/Users/mruus/Desktop/projects/sna-v2/server/core/users/views.py`**
- In `UserGroupsDeltaView.post()`: After `user.groups.add(*groups)` and `user.groups.remove(*groups)`, call `trigger_permission_update(user.pk)`

### 2. Import and Use Signal Functions
We need to import the `trigger_permission_update` function from `core.signals` in both files.

### 3. Handle Transaction Context
Ensure that signal triggers happen after transactions commit by placing them outside the `transaction.atomic()` block or using Django's `transaction.on_commit()`.

### 4. Test the Fix
- Test direct permission assignments via the UI
- Test group assignments via the UI
- Verify WebSocket connections receive permission updates
- Check Redis cache is updated correctly

## Implementation Steps

1. **Update `service.py`**: Add manual triggers for permission updates
2. **Update `views.py`**: Add manual triggers for group changes  
3. **Test the implementation**: Verify WebSocket notifications work
4. **Run any existing tests**: Ensure no regressions

## Expected Outcome
- WebSocket consumers receive real-time updates when permissions change
- Redis cache is properly updated
- Frontend permission state updates immediately
- No breaking changes to existing functionality