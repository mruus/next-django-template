import { usePermissions, useHasPermission, useHasPermissions, useHasAnyPermission } from "@/hooks/usePermissions";

export function PermissionsExample() {
  const { permissions, version, source, isConnecting, isConnected } = usePermissions();
  const canEdit = useHasPermission("can_edit");
  const canViewAndDelete = useHasPermissions(["can_view", "can_delete"]);
  const canEditOrDelete = useHasAnyPermission(["can_edit", "can_delete"]);

  return (
    <div className="p-6 border rounded-lg bg-card">
      <h2 className="text-2xl font-bold mb-4">Permissions Example</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Connection Status</h3>
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span>
                {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Source: {source || 'none'} | Version: {version || 'none'}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Permission Checks</h3>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${canEdit ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Can Edit: {canEdit ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${canViewAndDelete ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Can View & Delete: {canViewAndDelete ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${canEditOrDelete ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span>Can Edit or Delete: {canEditOrDelete ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">All Permissions ({permissions.length})</h3>
          {permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <span
                  key={permission}
                  className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                >
                  {permission}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground italic">No permissions assigned</div>
          )}
        </div>

        <div className="pt-4 border-t">
          <h3 className="font-semibold mb-2">Conditional UI Example</h3>
          <div className="space-x-4">
            {canEdit && (
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                Edit Content
              </button>
            )}
            {canViewAndDelete && (
              <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90">
                Delete Item
              </button>
            )}
            {!canEdit && !canViewAndDelete && (
              <div className="text-muted-foreground italic">
                You don't have sufficient permissions for these actions
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
