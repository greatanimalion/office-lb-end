<img width="338" height="511" alt="e4dacfe23d4b451a94d1df2a192bc732" src="https://github.com/user-attachments/assets/e3364924-45c1-461a-996e-f20ac1f70b4d" />
<img width="338" height="279" alt="a9ab7e71f0f84250a38de3c35ef103f4" src="https://github.com/user-attachments/assets/01f49977-4f85-4d42-a164-f3eeb0725289"


文件夹具有以下权限：
- 编辑权限
- 分享权限
- 下载权限
- 删除权限
- 公开权限

任何人对组空间内文件的变动，都需要添加审计记录，记录操作人、操作时间、操作类型、操作对象等信息
# 操作流程
## 私有空间：
1. 应该是用户可以创建文件夹，在文件夹里创建文件，文件夹设置有默认权限，文件夹下的文件默认继承文件夹的权限，并可以设置自己的权限。
            文件夹具有多个模板，用户可以使用模板并创建新的文件。
2. 文件编辑权限后，设置共享方式，内部共享（用户，组）/外部共享（密码，有效期，访问次数）
## 组空间
1 用户登录后，首先看见自己得全部组，点击可以进入组空间，查看组内全部文件,并对当前文件的权限进行相应操作


文件夹onwerID=>创建则
文件夹关系表{
id: number,
folderId: number,
temlpateID:number
userID:number

editAuth:boolean
shareAuth:boolean
downloadAuth:boolean
deleteAuth:boolean
authorChangeAuth:boolean
}

文件夹属性{
id: number
name: string
public: boolean//是否公开
ownerId: number
createdAt: Date
updatedAt: Date

}


export interface User {
  id: number
  username: string
  email: string
  password: string
  role: string
  createdAt?: Date
  updatedAt?: Date
}

export interface Document {
  id: number
  title: string
  filename: string
  filepath: string
  version: number
  ownerId: number
  createdAt: Date
  updatedAt: Date
}

export interface Folder {
  id: number
  name: string
  parentId: number | null
  ownerId: number
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  id: number
  userId: number
  documentId: number
  permissionType: string
  grantedBy: number
  createdAt: Date
  updatedAt: Date
}

export interface DocumentShare {
  id: number
  documentId: number
  userId: number
  permission: string
  sharedBy: number
  createdAt: Date
}

export interface ShareLink {
  id: number
  documentId: number
  token: string
  password?: string
  expiresAt?: Date
  permission: string
  createdBy: number
  createdAt: Date
}

export interface DocumentVersion {
  id: number
  documentId: number
  version: number
  fileSize: number
  filepath: string
  createdBy: number
  createdAt: Date
  comment?: string
}

export interface AuditLog {
  id: number
  userId: number
  documentId?: number
  action: string
  entityType: string
  details?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}