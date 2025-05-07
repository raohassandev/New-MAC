// Define all available permissions
export const PERMISSIONS = {
  // Device permissions
  DEVICES: {
    VIEW: 'view_devices',
    ADD: 'add_devices',
    EDIT: 'edit_devices',
    DELETE: 'delete_devices',
    TEST: 'test_devices',
  },
  // Profile permissions
  PROFILES: {
    VIEW: 'view_profiles',
    ADD: 'add_profiles',
    EDIT: 'edit_profiles',
    DELETE: 'delete_profiles',
    APPLY: 'apply_profiles',
  },
  // User permissions
  USERS: {
    VIEW: 'view_users',
    ADD: 'add_users',
    EDIT: 'edit_users',
    DELETE: 'delete_users',
  },
  // System permissions
  SYSTEM: {
    VIEW: 'view_system',
    EDIT: 'edit_system',
    RESTART: 'restart_services',
  },
};

// Define role-based permission sets
export const ROLE_PERMISSIONS = {
  admin: [
    // All device permissions
    ...Object.values(PERMISSIONS.DEVICES),
    // All profile permissions
    ...Object.values(PERMISSIONS.PROFILES),
    // All user permissions
    ...Object.values(PERMISSIONS.USERS),
    // All system permissions
    ...Object.values(PERMISSIONS.SYSTEM),
  ],
  engineer: [
    // Device permissions
    PERMISSIONS.DEVICES.VIEW,
    PERMISSIONS.DEVICES.ADD,
    PERMISSIONS.DEVICES.EDIT,
    PERMISSIONS.DEVICES.TEST,
    // Profile permissions
    PERMISSIONS.PROFILES.VIEW,
    PERMISSIONS.PROFILES.ADD,
    PERMISSIONS.PROFILES.EDIT,
    PERMISSIONS.PROFILES.APPLY,
    // Limited system permissions
    PERMISSIONS.SYSTEM.VIEW,
  ],
  operator: [
    // Limited device permissions
    PERMISSIONS.DEVICES.VIEW,
    PERMISSIONS.DEVICES.TEST,
    // Limited profile permissions
    PERMISSIONS.PROFILES.VIEW,
    PERMISSIONS.PROFILES.APPLY,
  ],
  viewer: [
    // Read-only permissions
    PERMISSIONS.DEVICES.VIEW,
    PERMISSIONS.PROFILES.VIEW,
  ],
};

// Helper function to check if a user has a specific permission
export const hasPermission = (
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean => {
  if (!userPermissions) return false;
  return userPermissions.includes(requiredPermission);
};

// Helper function to check if a user has a specific role
export const hasRole = (userRole: string | undefined, requiredRole: string): boolean => {
  if (!userRole) return false;

  const roles = ['viewer', 'operator', 'engineer', 'admin'];
  const userRoleIndex = roles.indexOf(userRole);
  const requiredRoleIndex = roles.indexOf(requiredRole);

  // User has the required role or a higher role
  return userRoleIndex >= requiredRoleIndex;
};

// Helper function to get permissions for a role
export const getPermissionsForRole = (role: string): string[] => {
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
};

// Helper function to get permission categories for UI display
export const getPermissionCategories = () => {
  return {
    DEVICES: {
      name: 'Devices',
      permissions: Object.values(PERMISSIONS.DEVICES),
      descriptions: {
        [PERMISSIONS.DEVICES.VIEW]: 'View device information',
        [PERMISSIONS.DEVICES.ADD]: 'Add new devices',
        [PERMISSIONS.DEVICES.EDIT]: 'Edit existing devices',
        [PERMISSIONS.DEVICES.DELETE]: 'Delete devices',
        [PERMISSIONS.DEVICES.TEST]: 'Test device connections',
      },
    },
    PROFILES: {
      name: 'Profiles',
      permissions: Object.values(PERMISSIONS.PROFILES),
      descriptions: {
        [PERMISSIONS.PROFILES.VIEW]: 'View profiles',
        [PERMISSIONS.PROFILES.ADD]: 'Create new profiles',
        [PERMISSIONS.PROFILES.EDIT]: 'Edit existing profiles',
        [PERMISSIONS.PROFILES.DELETE]: 'Delete profiles',
        [PERMISSIONS.PROFILES.APPLY]: 'Apply profiles to devices',
      },
    },
    USERS: {
      name: 'Users',
      permissions: Object.values(PERMISSIONS.USERS),
      descriptions: {
        [PERMISSIONS.USERS.VIEW]: 'View user information',
        [PERMISSIONS.USERS.ADD]: 'Add new users',
        [PERMISSIONS.USERS.EDIT]: 'Edit existing users',
        [PERMISSIONS.USERS.DELETE]: 'Delete users',
      },
    },
    SYSTEM: {
      name: 'System',
      permissions: Object.values(PERMISSIONS.SYSTEM),
      descriptions: {
        [PERMISSIONS.SYSTEM.VIEW]: 'View system information',
        [PERMISSIONS.SYSTEM.EDIT]: 'Edit system settings',
        [PERMISSIONS.SYSTEM.RESTART]: 'Restart system services',
      },
    },
  };
};
