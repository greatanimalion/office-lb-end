export var AuditAction;
(function (AuditAction) {
    AuditAction["LOGIN"] = "login";
    AuditAction["LOGOUT"] = "logout";
    AuditAction["REGISTER"] = "register";
    AuditAction["VIEW"] = "view";
    AuditAction["CREATE"] = "create";
    AuditAction["UPDATE"] = "update";
    AuditAction["DELETE"] = "delete";
    AuditAction["DOWNLOAD"] = "download";
    AuditAction["UPLOAD"] = "upload";
    AuditAction["SHARE"] = "share";
    AuditAction["UNSHARE"] = "unshare";
    AuditAction["EDIT"] = "edit";
    AuditAction["PREVIEW"] = "preview";
    AuditAction["PRINT"] = "print";
    AuditAction["EXPORT"] = "export";
})(AuditAction || (AuditAction = {}));
export var AuditEntityType;
(function (AuditEntityType) {
    AuditEntityType["USER"] = "user";
    AuditEntityType["DOCUMENT"] = "document";
    AuditEntityType["FOLDER"] = "folder";
    AuditEntityType["PERMISSION"] = "permission";
    AuditEntityType["SHARE_LINK"] = "share_link";
})(AuditEntityType || (AuditEntityType = {}));
export const AUDIT_ACTION_LABELS = {
    [AuditAction.LOGIN]: '登录',
    [AuditAction.LOGOUT]: '登出',
    [AuditAction.REGISTER]: '注册',
    [AuditAction.VIEW]: '查看',
    [AuditAction.CREATE]: '创建',
    [AuditAction.UPDATE]: '更新',
    [AuditAction.DELETE]: '删除',
    [AuditAction.DOWNLOAD]: '下载',
    [AuditAction.UPLOAD]: '上传',
    [AuditAction.SHARE]: '分享',
    [AuditAction.UNSHARE]: '取消分享',
    [AuditAction.EDIT]: '编辑',
    [AuditAction.PREVIEW]: '预览',
    [AuditAction.PRINT]: '打印',
    [AuditAction.EXPORT]: '导出'
};
