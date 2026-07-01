
export enum PermissionType {
    VIEW = 'view',
    DOWNLOAD = 'download',  
    EDIT = 'edit',
    DELETE = 'delete',
    COMMENT = 'comment',
    CHANGE_PERMISSION = 'change_permission',
    SHARE = 'share',
    MAKE_TEMPLATE = 'make_template',
    UPLOAD_FILE = 'upload_file',
}
export type Permission = PermissionType
export enum PermissionNumber{
    VIEW =             0b000000001,
    DOWNLOAD =         0b000000010,
    EDIT =             0b000000100,
    DELETE =           0b000001000,
    COMMENT =          0b000010000,
    CHANGE_PERMISSION =0b000100000,
    SHARE =            0b001000000,
    MAKE_TEMPLATE =    0b010000000,
    UPLOAD_FILE =      0b100000000,
}
/**
 * 将权限数组转换为二进制数
*/
export function permissonToNum(
  permission: Permission[],
): number {
  let binary = 0x0000000
  for (let p of permission) {
    switch (p) {
      case PermissionType.VIEW:
        binary |= PermissionNumber.VIEW
        break
      case PermissionType.SHARE:
        binary |= PermissionNumber.SHARE
        break
      case PermissionType.DELETE:
        binary |= PermissionNumber.DELETE
        break;
      case PermissionType.MAKE_TEMPLATE:
        binary |= PermissionNumber.MAKE_TEMPLATE
        break;
      case PermissionType.COMMENT:
        binary |= PermissionNumber.COMMENT
        break;
      case PermissionType.CHANGE_PERMISSION:
        binary |= PermissionNumber.CHANGE_PERMISSION
        break;
      case PermissionType.DOWNLOAD:
        binary |= PermissionNumber.DOWNLOAD
        break;
      case PermissionType.EDIT:
        binary |= PermissionNumber.EDIT
        break;
    }
  }
  return binary
}
/**
 * 将二进制数转换为权限数组,如0x00000011转换为[VIEW,SHARE],
*/
export function numToPermisson(
  binary: number,
): Permission[] {
  const permission: Permission[] = []
  
  if (binary & PermissionNumber.VIEW) {
    permission.push(PermissionType.VIEW)
  }
  if (binary & PermissionNumber.DOWNLOAD) {
    permission.push(PermissionType.DOWNLOAD)
  }
  if (binary & PermissionNumber.EDIT) {
    permission.push(PermissionType.EDIT)
  }
  if (binary & PermissionNumber.DELETE) {
    permission.push(PermissionType.DELETE)
  }
  if (binary & PermissionNumber.COMMENT) {
    permission.push(PermissionType.COMMENT)
  }
  if (binary & PermissionNumber.CHANGE_PERMISSION) {
    permission.push(PermissionType.CHANGE_PERMISSION)
  }
  if (binary & PermissionNumber.SHARE) {
    permission.push(PermissionType.SHARE)
  }
  if (binary & PermissionNumber.MAKE_TEMPLATE) {
    permission.push(PermissionType.MAKE_TEMPLATE)
  }
  
  return permission
}

