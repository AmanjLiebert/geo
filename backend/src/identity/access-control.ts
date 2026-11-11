export enum UserRole {
  VISITOR = 'visitor',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

export enum Permission {
  VIEW_OWN_ACCOUNT = 'account.view-own',
  MANAGE_SAVED_RECORDS = 'records.saved.manage-own',
  MANAGE_SCIENTIFIC_CONTENT = 'scientific-content.manage',
  PUBLISH_SCIENTIFIC_CONTENT = 'scientific-content.publish',
  MANAGE_RESEARCH = 'research.manage',
  READ_RESTRICTED_LOCATIONS = 'locations.restricted.read',
  MANAGE_USERS = 'users.manage',
  MANAGE_INVITATIONS = 'invitations.manage',
  MANAGE_NEWS = 'news.manage',
  MANAGE_SITE_CONTENT = 'site-content.manage',
  MANAGE_SHOP = 'shop.manage',
}

const visitorPermissions = [Permission.VIEW_OWN_ACCOUNT, Permission.MANAGE_SAVED_RECORDS] as const;

const teacherPermissions = [
  ...visitorPermissions,
  Permission.MANAGE_SCIENTIFIC_CONTENT,
  Permission.PUBLISH_SCIENTIFIC_CONTENT,
  Permission.MANAGE_RESEARCH,
  Permission.READ_RESTRICTED_LOCATIONS,
] as const;

export const ROLE_PERMISSIONS: Readonly<Record<UserRole, readonly Permission[]>> = {
  [UserRole.VISITOR]: visitorPermissions,
  [UserRole.TEACHER]: teacherPermissions,
  [UserRole.ADMIN]: [
    ...teacherPermissions,
    Permission.MANAGE_USERS,
    Permission.MANAGE_INVITATIONS,
    Permission.MANAGE_NEWS,
    Permission.MANAGE_SITE_CONTENT,
    Permission.MANAGE_SHOP,
  ],
};

export const PERMISSION_DEFINITIONS: ReadonlyArray<{
  key: Permission;
  description: string;
  riskLevel: 'standard' | 'elevated' | 'high';
}> = [
  {
    key: Permission.VIEW_OWN_ACCOUNT,
    description: 'View the signed-in account.',
    riskLevel: 'standard',
  },
  {
    key: Permission.MANAGE_SAVED_RECORDS,
    description: "Add and remove records from the signed-in user's saved list.",
    riskLevel: 'standard',
  },
  {
    key: Permission.MANAGE_SCIENTIFIC_CONTENT,
    description: 'Create, edit, translate, validate, archive, and restore scientific content.',
    riskLevel: 'elevated',
  },
  {
    key: Permission.PUBLISH_SCIENTIFIC_CONTENT,
    description: 'Review and publish scientific content after policy validation.',
    riskLevel: 'high',
  },
  {
    key: Permission.MANAGE_RESEARCH,
    description: 'Manage reviewed research publications and their supporting material.',
    riskLevel: 'elevated',
  },
  {
    key: Permission.READ_RESTRICTED_LOCATIONS,
    description: 'Read protected geographical detail for authorized editorial work.',
    riskLevel: 'high',
  },
  {
    key: Permission.MANAGE_USERS,
    description: 'Activate, disable, and assign fixed user roles.',
    riskLevel: 'high',
  },
  {
    key: Permission.MANAGE_INVITATIONS,
    description: 'Create and revoke teacher or admin invitations.',
    riskLevel: 'high',
  },
  {
    key: Permission.MANAGE_NEWS,
    description: 'Manage reviewed geological news.',
    riskLevel: 'elevated',
  },
  {
    key: Permission.MANAGE_SITE_CONTENT,
    description: 'Manage organization information and reviewed site pages.',
    riskLevel: 'elevated',
  },
  {
    key: Permission.MANAGE_SHOP,
    description: 'Manage the optional shop when enabled.',
    riskLevel: 'elevated',
  },
];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
