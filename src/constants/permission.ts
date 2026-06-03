export enum PermissionType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
  DELETE = 'delete',
  COMMENT = 'comment',
  CHANGE_PERMISSION = 'change_permission',
  SHARE = 'share',
  MAKE_TEMPLATE = 'make_template'
}

export enum ShareLinkType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  PASSWORD_PROTECTED = 'password_protected'
}

export const PERMISSION_HIERARCHY: Record<PermissionType, number> = {
  [PermissionType.VIEW]: 1,
  [PermissionType.DOWNLOAD]: 2,
  [PermissionType.SHARE]: 3,
  [PermissionType.DELETE]: 4,
  [PermissionType.EDIT]: 5,
  [PermissionType.COMMENT]: 6,
  [PermissionType.CHANGE_PERMISSION]: 7,
  [PermissionType.MAKE_TEMPLATE]: 8
}

export const hasPermission = (userPermission: PermissionType, requiredPermission: PermissionType): boolean => {
  return PERMISSION_HIERARCHY[userPermission] >= PERMISSION_HIERARCHY[requiredPermission]
}