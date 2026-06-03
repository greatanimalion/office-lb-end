import { PermissionType } from "../constants/permission"

export interface Permission {
  id: number
  userId?: number//针对于特定用户的id
  documentId: number//针对于特定文档的id
  groupId?: number//针对于特定组的id
  shareType: "user" | "group" | "link"|"public"//分享类型
  permissionType: PermissionType
  inheritedPermissionId?: number
  createdAt: Date
  updatedAt: Date
}