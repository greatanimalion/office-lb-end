export enum AuditAction {
  LOGIN = 'login',
  LOGOUT = 'logout',
  REGISTER = 'register',
  VIEW = 'view',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  DOWNLOAD = 'download',
  UPLOAD = 'upload',
  SHARE = 'share',
  UNSHARE = 'unshare',
  EDIT = 'edit',
  PREVIEW = 'preview',
  PRINT = 'print',
  EXPORT = 'export'
}

export enum AuditEntityType {
  USER = 'user',
  DOCUMENT = 'document',
  FOLDER = 'folder',
  PERMISSION = 'permission',
  SHARE_LINK = 'share_link'
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
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
}