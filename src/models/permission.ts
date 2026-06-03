import { PermissionType } from "../constants/permission"

export interface Permission {
  id: number
  targetId?: number//根据shareType针对于特定用户的id或文件夹的id
  shareType: "user" | "folder" |"document" | "link"|"public"//分享类型
  permission: string//权限字符串
  createdAt: Date
  updatedAt: Date
}