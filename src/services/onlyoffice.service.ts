import config from '../config/index'
import { downloadFile } from '../utils/file'
import { generateToken } from '../utils/jwt'
import logger from '../utils/logger'
import { createDocumentVersion, DocumentRelateDV, getDocumentById, getMaxVersionNumber } from './document.service'
import { checkDocumentAccess, type DocumentAccessResult } from './permission.service'

export interface OnlyOfficeConfig {
  documentServerUrl: string
  jwtToken: string
  type: string
  documentType: string
  document: {
    title: string
    url: string
    fileType: string
    key: string
  }
  editorConfig: {
    callbackUrl: string
    mode: string
  }
  permissions: {
    edit: boolean
    download: boolean
    print: boolean
    share: boolean
    comment: boolean
    review: boolean
  }
}

export const generateEditorConfig = (
  documentId: number,
  documentTitle: string,
  user: { id: string, name: string, avatar: string },
  version: number,
  access: DocumentAccessResult
): OnlyOfficeConfig => {
  const documentConfig: any = {
    type: 'desktop',
    documentServerUrl: config.onlyoffice.documentServerUrl,
    editorConfig: {
      callbackUrl: `${config.nodeServerUrl}/api/onlyoffice/${documentId}/callback`,
      mode: access.EDIT ? 'edit' : 'view',
      lang: "zh-CN",
      user: {
        id: user.id,
        name: user.name,
        image: user.avatar,
      },
    },
    document: {
      lang: "zh",
      url: `${config.nodeServerUrl}/api/documents/d/${documentId}`,
      title: documentTitle,
      fileType: documentTitle.split('.').pop() || 'docx',
      key: `${documentId}_${version}`,
      permissions: {
        edit: access.EDIT,
        download: access.DOWNLOAD,
        print: access.DOWNLOAD,
        share: access.SHARE,
        comment: access.COMMENT,
        review: access.COMMENT,
      },
    },
  }
  documentConfig.token = generateToken(documentConfig, config.onlyoffice.jwtSecret)
  return documentConfig
}

export const handleCallback = async (body: any): Promise<void> => {
  console.log('OnlyOffice callback received:', body)
  const { status, key, users, url, filetype } = body
  switch (status) {
    case 1:
      console.log(`Document ${key} is being edited by user ${users[0]}`)
      break
    case 2:
      //解析文档id
      const id = Number(key.split('_')[0])
      const version = Number(key.split('_')[1])
      if (isNaN(id) || isNaN(version)) {
        logger.error(`Document ${key} is not a valid document ID`)
        break
      }
      // 校验权限
      const document = await getDocumentById(id)
      if (!document) {
        logger.error(`Document ${id} not found`)
        break
      }
      if(document.owner_type=='public'){
       console.log(`Document ${id} is public`)
        break
      }
      // const access = await checkDocumentAccess(
      //   { id, ownerId: document.owner_id!, ownerType: document.owner_type! },
      //   Number(users[0]),
      //   document
      // )
      // if (!access.EDIT) {
      //   logger.error(`User ${users[0]} does not have edit access to document ${id}`)
      //   break
      // }
      //获取最大版本号
      const maxVersion = await getMaxVersionNumber(id)
      const filePath = await downloadFile(url, `${new Date().getTime()}_v_${id}.` + filetype)
      const vId = await createDocumentVersion(Number(users[0]), id, filePath.filePath, filePath.size, maxVersion + 1)
      DocumentRelateDV(id, vId)//更新节点的版本
      break
    case 3:
      console.log(`Document ${key} has been saved`)
      break
    case 4:
      console.log(`Document ${key} is closed with nothing changed`)
      break
    default:
      console.log(`Unknown status for document ${key}: ${status}`)
  }
}