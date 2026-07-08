# 添加新路由的流程
1. 创建相应的 service 文件
2. 创建相应的 controller 文件
3. 创建相应的路由文件
4. 在 `src/routes/index.ts` 挂载路由

# doc-management-backend

## 快速开始

```bash
pnpm install
pnpm run prisma:generate    # 生成 Prisma 客户端
pnpm run dev                # tsx src/server.ts
pnpm run dev:watch          # nodemon --exec tsx src/server.ts
```

## 架构概览

| 层 | 目录 | 职责 |
|-------|------|------|
| 入口 | `src/server.ts` → `src/app.ts` | 初始化数据库，启动 Express |
| 路由 | `src/routes/index.ts` | 挂载所有 `/api/*` 路由 |
| 控制器 | `src/controllers/` | 请求/响应处理 |
| 服务层 | `src/services/` | 业务逻辑 |
| 中间件 | `src/middlewares/` | 认证、权限、限流、审计 |
| 配置 | `src/config/index.ts` | 读取 `.env`，导出类型化配置 |
| 模型 | `src/models/` | TypeScript 接口定义（非 Prisma） |
| 工具 | `src/utils/` | JWT、加密、文件操作、日志、搜索 |
| 常量 | `src/constants/` | 枚举与常量定义 |

**路由路径：**
- `/api/auth` – 用户认证与信息管理
- `/api/oauth` – GitLab OAuth
- `/api/documents` – 文档 CRUD + 分片上传 + 版本管理
- `/api/folders` – 文件夹 CRUD + 树形结构
- `/api/groups` – 组管理
- `/api/permissions` – 权限管理（AclEntry CRUD）
- `/api/onlyoffice` – OnlyOffice 编辑器配置 + 回调
- `/api/search` – 全文搜索（MeiliSearch）
- `/api/audit` – 审计日志查询

## 文件清单与实现状态

### src/ 顶层文件

| 文件 | 功能 | 实现状态 |
|------|------|----------|
| `server.ts` | 入口文件，设置时区，初始化 DB，启动 HTTP 服务 | ✅ 已实现 |
| `app.ts` | Express 应用工厂：CORS、Session、Passport、静态文件、限流、404/错误处理。`makSureAdminUserExist` 确保超级管理员邮箱 role=admin | ✅ 已实现 |
| `db.ts` | 基于 Prisma + libsql/SQLite 的数据库初始化和单例访问（`initDB`/`getDB`/`closeDB`） | ✅ 已实现 |
| `global.d.ts` | 声明 `passport-gitlab2` 模块类型 | ✅ 已实现 |

### src/config/ — 类型化配置

| 文件 | 功能 | 实现状态 |
|------|------|----------|
| `index.ts` | 汇总所有子配置，导出 `config` | ✅ 已实现 |
| `auth.ts` | JWT 密钥/Session/OAuth 凭证 | ✅ 已实现 |
| `database.ts` | SQLite 文件路径 | ✅ 已实现 |
| `redis.ts` | Redis 连接配置 | ✅ 已实现 |
| `email.ts` | SMTP 邮件配置 | ✅ 已实现 |
| `onlyoffice.ts` | OnlyOffice Document Server URL + JWT 密钥 | ✅ 已实现 |
| `meilisearch.ts` | MeiliSearch 客户端 + `documentsIndex` 实例 | ✅ 已实现 |
| `passport.ts` | Passport GitLab 策略配置（副作用模块） | ✅ 已实现 |

### src/models/ — 接口定义

| 文件 | 定义 | 实现状态 |
|------|------|----------|
| `user.ts` | `User` 接口 | ✅ 已实现 |
| `document.ts` | `Document`, `DocumentVersion`, `DocumentShare`, `OwnerType` | ✅ 已实现 |
| `folder.ts` | `Folder` 接口 | ✅ 已实现 |
| `group.ts` | `Group`, `GroupUser`, `GroupTemplate` | ✅ 已实现 |
| `permission.ts` | `Permission` 接口 | ✅ 已实现 |
| `types.ts` | `ShareLink`, `AuditLog` + 统一导出 | ✅ 已实现 |

### src/constants/ — 枚举与常量

| 文件 | 功能 | 实现状态 |
|------|------|----------|
| `audit.ts` | `AuditAction`（15 种操作）、`AuditEntityType`（5 种实体）枚举 + 中文标签 | ✅ 已实现 |
| `permission.ts` | `PermissionType` 枚举（8 种）、`PERMISSION_HIERARCHY`、`hasPermission` | ✅ 已实现 |
| `document.ts` | `DocumentStatus`、`DocumentType`、文件扩展名映射、50MB 大小限制 | ✅ 已实现 |
| `createTable.ts` | 空文件，占位 | ⚠️ 空文件 |

### src/routes/ — 路由定义

| 文件 | 挂载路径 | 注册路由 | 实现状态 |
|------|----------|----------|----------|
| `index.ts` | 汇总 | `/api/auth`, `/api/oauth`, `/api/documents`, `/api/folders`, `/api/permissions`, `/api/onlyoffice`, `/api/search`, `/api/audit`, `/api/groups` | ✅ 已实现 |
| `user.routes.ts` | `/api/auth` | `POST /login`, `POST /register`, `POST /sendcode`, `GET /user/all`, `GET /user/:id`, `GET /users`, `POST /user/change-group`, `POST /user/socialAccount` | ✅ 已实现 |
| `oauth.routes.ts` | `/api/oauth` | `GET /gitlab`, `GET /gitlab/callback` | ✅ 已实现 |
| `document.routes.ts` | `/api/documents` | 文档 CRUD（约 20 个路由）+ 分片上传（7 个路由） | ✅ 已实现 |
| `folder.routes.ts` | `/api/folders` | `GET /`, `GET /tree/:groupId`, `POST /`, `PUT /:id`, `DELETE /:id` | ✅ 已实现 |
| `group.routes.ts` | `/api/groups` | `POST /`, `PUT /:id`, `DELETE /:id`, `GET /all`, `POST /:id/members`, `DELETE /:id/members/:userId`, `GET /:id/members` | ✅ 已实现 |
| `permission.routes.ts` | `/api/permissions` | `GET /:documentId/permissions`, `POST /:documentId/permissions`, `DELETE /:documentId/permissions/:userId` | ✅ 已实现 |
| `onlyoffice.routes.ts` | `/api/onlyoffice` | `GET /:documentId/config`（需认证）, `POST /:documentId/callback`（无需认证） | ✅ 已实现 |
| `search.routes.ts` | `/api/search` | `GET /`（需认证） | ✅ 已实现 |
| `audit.routes.ts` | `/api/audit` | `GET /`（需认证） | ✅ 已实现 |

### src/controllers/ — 请求/响应处理

| 文件 | 主要函数 | 功能 | 实现状态 |
|------|----------|------|----------|
| `auth.controller.ts` | `gitlabCallBackController` | GitLab OAuth 回调，生成 JWT 并重定向 | ✅ 已实现 |
| `user.controller.ts` | `loginController`, `registerController`, `getAllUsersController`, `getUserByIdController`, `getUsersController`, `changeGroupController`, `getUserSocialAccountController` | 用户登录/注册/信息查询/切换组/社交账号 | ✅ 已实现 |
| `document.controller.ts` | `getDocumentController`, `createDocumentController`, `updateDocumentController`, `deleteDocumentController`, `deleteDocumentForeverController`, `recoverDocumentController`, `getAllDocumentsController`, `getDeleteDocumentsController`, `getDocumentVersionsController`, `revertDocumentVersionController`, `deleteDocumentVersionController`, `lockDocumentController`, `unlockDocumentController`, `uploadDocumentController`, `recentDocumentController`, `getSharedDocumentsController` | 文档全生命周期：CRUD、回收站、版本管理、锁定/解锁、上传到组、最近文档、共享文档 | ✅ 已实现 |
| `chunk.controller.ts` | `initUploadController`, `uploadChunkController`, `mergeChunksController`, `getUploadProgressController`, `cancelUploadController`, `listUploadSessionsController`, `verifyChunkController` | 分片上传：初始化/上传/合并/进度查询/取消/会话列表/完整性校验 | ✅ 已实现 |
| `folder.controller.ts` | `createFolderController`, `getFolderTreeController`, `getFolderListController`, `updateFolderController`, `deleteFolderController` | 文件夹 CRUD + 树形结构查询 | ✅ 已实现 |
| `group.controller.ts` | `createGroupController`, `updateGroupController`, `deleteGroupController`, `getAllGroupsController`, `addMemberController`, `removeMemberController`, `getMembersController` | 组管理：CRUD、成员增删、成员列表 | ✅ 已实现 |
| `onlyoffice.controller.ts` | `getEditorConfigController`, `callbackController` | 生成 OnlyOffice 编辑器配置（含权限校验）+ 回调处理（保存文档、创建版本） | ✅ 已实现 |
| `permission.controller.ts` | `getPermissionsController`, `setPermissionController`, `removePermissionController` | AclEntry 查询/创建/删除（基于新权限模型） | ✅ 已实现 |
| `search.controller.ts` | `searchController` | 全文搜索入口，接收 `q` 参数 | ✅ 已实现 |
| `audit.controller.ts` | `getAuditLogsController` | 审计日志查询（按用户/文档/操作/时间范围过滤 + 分页） | ✅ 已实现 |
| `verification.controller.ts` | `sendVerificationCodeController` | 发送邮箱验证码 | ✅ 已实现 |

### src/services/ — 业务逻辑

| 文件 | 主要函数 | 功能 | 实现状态 |
|------|----------|------|----------|
| `user.service.ts` | `login`, `register`, `getUserById`, `getAllUsers`, `createTampAccountOrUpdate`, `getSocialAccountsByUserId`, `changeGroup` | 用户认证/注册/OAuth 临时账号/社交账号关联/切换组 | ✅ 已实现 |
| `document.service.ts` | `getDocumentById`, `createDocument`, `updateDocument`, `deleteDocumentTemp`, `deleteDocumentForever`, `recorveyDocument`, `getAllDocuments`, `getDocumentVersion`, `restoreDocumentVersion`, `lockDocument`, `unlockDocument`, `createDocumentVersion`, `DocumentRelateDV`, `deleteDVserion`, `getDeleteDoc`, `getRecentDocuments`, `getSharedDocuments`, `trackDocumentUpdate`, `recoredRecentDocument` | 文档全生命周期业务逻辑 + 版本管理 + 回收站 + 最近文档 | ✅ 已实现 |
| `folder.ts` | `createFolder`, `deleteFolder`, `updateFolderName`, `getFoldersList`, `buildFolderTree` | 文件夹业务 + 树形构建 | ✅ 已实现 |
| `group.service.ts` | `createGroup`, `updateGroup`, `deleteGroup`, `getGroupById`, `getAllGroups`, `getGroupsByUserId`, `addMemberToGroup`, `removeMemberFromGroup`, `getGroupMembers`, `isGroupOwner` | 组 CRUD + 成员管理（创建者自动为 owner） | ✅ 已实现 |
| `onlyoffice.service.ts` | `generateEditorConfig`, `handleCallback` | 构造 OnlyOffice 编辑器配置 + 处理回调（下载文件、创建版本、更新关联） | ✅ 已实现 |
| `permission.service.ts` | `checkDocumentAccess`, `DocumentAccessResult` | **权限校验引擎**：admin/owner 放行、文档级 ACL、文件夹级 ACL、路径继承、组成员默认权限 | ✅ 已实现 |
| `upload.service.ts` | `initUploadSession`, `uploadChunk`, `mergeChunks`, `getUploadProgress`, `cancelUploadSession`, `listUploadSessions`, `verifyChunkIntegrity`, `getMissingChunks`, `checkSessionExists`, `resumeUploadSession`, `getSessionInfo` | 分片上传业务：断点续传、完整性校验、进度追踪 | ✅ 已实现 |
| `search.service.ts` | `searchDocuments`, `initMeiliSearch`, `updateDocumentInIndex`, `extractTextFromFile` | MeiliSearch 搜索 + 索引管理 + docx 文本提取（mammoth） | ✅ 已实现 |
| `shareLink.service.ts` | `createShareLink`, `getShareLinkByToken`, `verifyShareLinkPassword`, `useShareLink`, `deleteShareLink` | 外部分享链接（密码/过期时间/访问次数） | ✅ 已实现 |
| `audit.service.ts` | `logAction`, `getAuditLogs` | 审计日志记录与查询 | ✅ 已实现 |
| `watermark.service.ts` | `addTextWatermark`, `WatermarkOptions`, `WatermarkInfo` | 文档图片文字水印叠加 | ✅ 已实现 |
| `verification.service.ts` | `generateVerificationCode`, `verifyCode` | 邮箱验证码（Redis + nodemailer） | ✅ 已实现 |

### src/middlewares/ — 中间件

| 文件 | 主要函数 | 功能 | 实现状态 |
|------|----------|------|----------|
| `auth.middleware.ts` | `authenticate`, `AuthenticatedRequest` | JWT 认证：从 Authorization 请求头解析 token，注入 `{id, role, provider, provider_id}` | ✅ 已实现 |
| `permission.middleware.ts` | `checkDocumentPermission`, `checkOwnership` | 权限中间件（当前有缺陷：`checkOwnership` 为空操作） | ⚠️ 有缺陷 |
| `audit.middleware.ts` | `auditAction` | 自动拦截 `res.json`，请求成功时记录审计日志 | ✅ 已实现 |
| `rateLimit.middleware.ts` | `apiLimiter`, `authLimiter` | 通用 API 限流（15min/1000 次）+ 认证限流 | ✅ 已实现 |
| `error.middleware.ts` | `errorHandler`, `notFoundHandler` | 全局错误处理 + 404 JSON 响应 | ✅ 已实现 |
| `upload.middleware.ts` | `createUploadMiddleware` | multer 文件上传中间件工厂（磁盘存储/类型过滤/50MB） | ✅ 已实现 |

### src/utils/ — 工具函数

| 文件 | 主要函数 | 功能 | 实现状态 |
|------|----------|------|----------|
| `jwt.ts` | `generateToken`, `verifyToken`, `TokenPayload` | JWT 生成/验证（支持自定义 secret） | ✅ 已实现 |
| `crypto.ts` | `encrypt`, `decrypt`, `encryptPassword`, `comparePassword`, `generateShareLinkPassword` | AES-256-GCM 加密解密 + PBKDF2 密码哈希 | ✅ 已实现 |
| `logger.ts` | default export（winston） | 控制台 + 文件日志（error.log + combined.log） | ✅ 已实现 |
| `file.ts` | `getStoragePath`, `isAllowedFileType`, `calculateMD5`, `mergeChunks`, `downloadFile`, `ensureDirectoryExists`, `deleteFile`, `moveFile`, `copyFile` | 文件系统操作 + 分片合并 + 类型白名单 | ✅ 已实现 |
| `permission.ts` | `PermissionType` 枚举, `permissonToNum`, `numToPermisson` | 权限位掩码转换（9 种权限 ↔ 二进制数） | ✅ 已实现 |
| `watermark.ts` | `generateTextWatermark`, `applyWatermarkToImage` | Sharp SVG 文字水印合成到图片 | ✅ 已实现 |
| `ocr.ts` | `extractTextFromImage`（Tesseract.js）, `extractTextFromPdf`, `extractTextFromDocx`, `extractTextFromFile` | 多格式文本提取（图片 OCR / PDF / DOCX） | ✅ 已实现 |
| `xmlParser.ts` | `extractTextFromDocx`（AdmZip）, `extractTextFromXml`, `parseDocxMetadata` | DOCX ZIP 解压读取 `word/document.xml` + 元数据解析 | ✅ 已实现 |
| `MeiliSearch.ts` | `searchDocuments`, `addDocumentToIndex`, `updateDocumentInIndex`, `deleteDocumentFromIndex`, `deleteDocumentsFromIndex`, `getIndexStats`, `initMeiliSearch` | MeiliSearch 索引 CRUD（降级策略：不可用时返回空） | ✅ 已实现 |

## 关键事实

- **ESM**（`"type": "module"`）。所有导入必须包含 `.js` 扩展名（如 `from './db.js'`）。
- **包管理**：pnpm（`pnpm-lock.yaml`）
- **数据库**：SQLite 通过 Prisma + `@prisma/adapter-libsql`。Schema 位于 `prisma/schema.prisma`。使用 `pnpm run prisma:migrate` 或 `prisma:push` 更改 schema。
- **认证**：JWT 在 `Authorization` 请求头中（无 Bearer 前缀）。参见 `src/utils/jwt.ts` 和 `src/middlewares/auth.middleware.ts`。
- **管理员用户**硬编码在 `src/app.ts:makSureAdminUserExist`，邮箱为 `15294745236@163.com`。
- **两个 JWT 密钥**：一个用于应用认证（`JWT_SECRET`），一个用于 OnlyOffice token（`ONLYOFFICE_JWT_SECRET`）。
- **上传流程**：分片上传通过 `UploadSession` 模型 → `upload.service.ts` → 合并 → `createDocument` + `createDocumentVersion` + `DocumentRelateDV`。
- **文件存储**：`uploads/{temp,documents,versions,previews}`，在 `.env` 中配置。
- **自定义 AES-256-GCM** 加密在 `src/utils/crypto.ts`（与密码的 bcrypt 分开）。
- **没有定义 lint、test 或 typecheck 脚本**。只有 `tsc` 构建。
- **外部服务**：OnlyOffice Document Server、Redis、MeiliSearch、SMTP 邮件。

## 权限模型（已实现）

使用 **AclEntry** 表替代旧的 `Permission` 和 `DocumentShare` 表：

- **AclEntry**：`principalType`（user|group|link）+ `principalId` + `resourceType`（folder|document）+ `resourceId` + `permissionsMask`（位掩码整数）+ `grantedBy` + `expiresAt`
- **PermissionDefinition**：预定义的 9 种权限（view/comment/edit/download/print/delete/move/share/manage）

**config 接口校验流程**（`GET /api/onlyoffice/:documentId/config`）：

```
1. user.role === 'admin' → 放行（fullAccess）
2. document.ownerId === userId → 放行（fullAccess）
3. 查文档级 AclEntry → 有权限 → 放行
4. 查文件夹级 AclEntry → 有权限 → 放行
5. 文件夹继承（通过 Folder.path 查祖先文件夹 AclEntry）→ 有权限 → 放行
6. 组内成员默认权限（VIEW + DOWNLOAD + EDIT + COMMENT）→ 放行
7. 以上都不满足 → 拒绝
```

外共享用户（无系统账号）通过 ShareLink.token 鉴权。

## 已知问题与注意事项

- `permission.middleware.ts:checkDocumentPermission` 引用了未声明的 `document` 变量（第 26-28 行的死代码）。
- 同一文件中的 `checkOwnership` 是空操作（从不检查所有权）。
- `.env` 文件**没有被 gitignore**（`.gitignore` 中有 `.env`，但文件已提交到仓库——可能是误提交）。
- OnlyOffice 回调键格式：`${documentId}_${version}`（在 `onlyoffice.service.ts` 中解析）。
- 服务器在配置中默认端口为 5000，但 `.env` 设置为 `3001`。
- `DocumentShare` 表已废弃，由 `AclEntry` 替代。
- `Permission` 表已废弃（保留仅用于数据迁移），所有新权限走 `AclEntry`。
- `constants/createTable.ts` 为空文件，可清理。
- MeiliSearch 索引在用户访问文档时同步（`recoredRecentDocument`），不会在创建/更新时自动同步。
