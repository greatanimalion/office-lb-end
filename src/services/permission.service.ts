import { PermissionType } from '../constants/permission'

export interface Permission {
  id: number
  userId: number
  documentId: number
  permissionType: PermissionType
  inheritedFrom?: number
  createdAt: Date
  updatedAt: Date
}

export const checkPermission = (
  userPermission: PermissionType | null,
  requiredPermission: PermissionType
): boolean => {
  if (!userPermission) {
    return false
  }

  const hierarchy: Record<PermissionType, number> = {
    [PermissionType.VIEW]: 1,
    [PermissionType.DOWNLOAD]: 2,
    [PermissionType.COMMENT]: 3,
    [PermissionType.EDIT]: 4,
    [PermissionType.FULL_CONTROL]: 5
  }

  return hierarchy[userPermission] >= hierarchy[requiredPermission]
}

export const getHighestPermission = (
  permissions: Permission[]
): PermissionType | null => {
  if (permissions.length === 0) {
    return null
  }

  const hierarchy: Record<PermissionType, number> = {
    [PermissionType.VIEW]: 1,
    [PermissionType.DOWNLOAD]: 2,
    [PermissionType.COMMENT]: 3,
    [PermissionType.EDIT]: 4,
    [PermissionType.FULL_CONTROL]: 5
  }

  let highest = permissions[0].permissionType

  for (const perm of permissions) {
    if (hierarchy[perm.permissionType] > hierarchy[highest]) {
      highest = perm.permissionType
    }
  }

  return highest
}