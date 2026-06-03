import { PermissionType } from '../constants/permission'
import { Permission } from '../models/permission'

const hierarchy: Record<PermissionType, number> = {
  [PermissionType.VIEW]: 1,
  [PermissionType.DOWNLOAD]: 2,
  [PermissionType.COMMENT]: 3,
  [PermissionType.EDIT]: 4,
  [PermissionType.DELETE]: 5,
  [PermissionType.SHARE]: 6,
  [PermissionType.FULL_CONTROL]: 7
}
export const checkPermission = (
  userPermission: PermissionType | null,
  requiredPermission: PermissionType
): boolean => {
  if (!userPermission) {
    return false
  }
  return hierarchy[userPermission] >= hierarchy[requiredPermission]
}

export const getHighestPermission = (
  permissions: Permission[]
): PermissionType | null => {
  if (permissions.length === 0) {
    return null
  }

  let highest = permissions[0].permissionType

  for (const perm of permissions) {
    if (hierarchy[perm.permissionType] > hierarchy[highest]) {
      highest = perm.permissionType
    }
  }
  return highest
}