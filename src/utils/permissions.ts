import { User, UserRole } from '../../types';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export const checkPermission = (user: User | null, resource: string, action: PermissionAction): boolean => {
    if (!user) return false;

    // 1. Admin always has full access
    if (user.role === UserRole.ADMIN) return true;

    // 2. Supervisor / Worker Logic (can be customized, but usually permission based now)
    // For backwards compatibility or specific role overrides:
    // if (user.role === UserRole.SUPERVISOR) return true; 

    const permissions = user.allowedSections || [];

    // 3. Check for specific granular permission (e.g., 'clients:create')
    const specificPermission = `${resource}:${action}`;
    if (permissions.includes(specificPermission)) return true;

    // 4. Check for Wildcard (e.g., 'clients:*')
    if (permissions.includes(`${resource}:*`)) return true;

    // 5. Backwards Compatibility: Check for legacy section name (e.g., 'clients')
    // If the user has the legacy 'clients' string, we grant FULL access to that resource.
    // This prevents breaking existing users until they are migrated.
    if (permissions.includes(resource)) return true;

    return false;
};

// Helper: Check if user has ANY access to a resource (usually for Sidebar visibility)
export const hasAnyPermission = (user: User | null, resource: string): boolean => {
    return checkPermission(user, resource, 'read');
};
