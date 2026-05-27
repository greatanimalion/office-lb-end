import { PermissionType } from '../constants/permission';
export const checkPermission = (userPermission, requiredPermission) => {
    if (!userPermission) {
        return false;
    }
    const hierarchy = {
        [PermissionType.VIEW]: 1,
        [PermissionType.DOWNLOAD]: 2,
        [PermissionType.COMMENT]: 3,
        [PermissionType.EDIT]: 4,
        [PermissionType.FULL_CONTROL]: 5
    };
    return hierarchy[userPermission] >= hierarchy[requiredPermission];
};
export const getHighestPermission = (permissions) => {
    if (permissions.length === 0) {
        return null;
    }
    const hierarchy = {
        [PermissionType.VIEW]: 1,
        [PermissionType.DOWNLOAD]: 2,
        [PermissionType.COMMENT]: 3,
        [PermissionType.EDIT]: 4,
        [PermissionType.FULL_CONTROL]: 5
    };
    let highest = permissions[0].permissionType;
    for (const perm of permissions) {
        if (hierarchy[perm.permissionType] > hierarchy[highest]) {
            highest = perm.permissionType;
        }
    }
    return highest;
};
