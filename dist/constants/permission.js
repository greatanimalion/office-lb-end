export var PermissionType;
(function (PermissionType) {
    PermissionType["VIEW"] = "view";
    PermissionType["DOWNLOAD"] = "download";
    PermissionType["EDIT"] = "edit";
    PermissionType["COMMENT"] = "comment";
    PermissionType["FULL_CONTROL"] = "full_control";
})(PermissionType || (PermissionType = {}));
export var ShareLinkType;
(function (ShareLinkType) {
    ShareLinkType["PUBLIC"] = "public";
    ShareLinkType["PRIVATE"] = "private";
    ShareLinkType["PASSWORD_PROTECTED"] = "password_protected";
})(ShareLinkType || (ShareLinkType = {}));
export const PERMISSION_HIERARCHY = {
    [PermissionType.VIEW]: 1,
    [PermissionType.DOWNLOAD]: 2,
    [PermissionType.COMMENT]: 3,
    [PermissionType.EDIT]: 4,
    [PermissionType.FULL_CONTROL]: 5
};
export const hasPermission = (userPermission, requiredPermission) => {
    return PERMISSION_HIERARCHY[userPermission] >= PERMISSION_HIERARCHY[requiredPermission];
};
