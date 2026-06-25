
export type shareType= "user" | "folder" |"document" | "link"|"public"
export interface Permission {
  id: number

  operatorType: 'user' | 'folder' | 'group'//操作类型
  operatorId: number//操作人id，用户id或文件夹id或组id
  toId: number//被操作人id，用户id或文件夹id或组id
  targetId: number//根据shareType针对于特定用户的id或文件夹的id

  permission: string//权限字符串

  startTime: Date//开始时间
  endTime: Date//结束时间

  password?: string//密码
  count?: number//次数，代表无限次访问

  createdAt: Date
}