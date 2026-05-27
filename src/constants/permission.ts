export enum PermissionType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
  COMMENT = 'comment',
  FULL_CONTROL = 'full_control'
}

export enum ShareLinkType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PASSWORD_PROTECTED = 'password_protected'
}

export const PERMISSION_HIERARCHY: Record<PermissionType, number> = {
  [PermissionType.VIEW]: 1,
  [PermissionType.DOWNLOAD]: 2,
  [PermissionType.COMMENT]: 3,
  [PermissionType.EDIT]: 4,
  [PermissionType.FULL_CONTROL]: 5
}

export const hasPermission = (userPermission: PermissionType, requiredPermission: PermissionType): boolean => {
  return PERMISSION_HIERARCHY[userPermission] >= PERMISSION_HIERARCHY[requiredPermission]
}