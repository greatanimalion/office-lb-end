import config from '../config/index'
import { generateToken } from '../utils/jwt'

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
  }
}

export const generateEditorConfig = (
  documentId: number,
  documentTitle: string,
  callbackUrl: string,
  canEdit: boolean = true,
  user:{id:string,name:string}
): OnlyOfficeConfig => {
  const key = `${documentId}_${Date.now()}`
  const documentConfig: any = {
    type: 'desktop',
    documentServerUrl: 'http://localhost',
    editorConfig: {
      callbackUrl,
      mode: 'edit',
      lang: "zh-CN",
      user: {
        id: user.id,
        name: user.name
      },
    },
    permissions: {
      edit: canEdit,
      download: canEdit,
      print: canEdit,
    },
    document: {
      lang: "zh",
      url: 'http://localhost:5000/test.doc',
      title: documentTitle,
      fileType: documentTitle.split('.').pop() || 'docx',
      key
    },
  }
  documentConfig.token = generateToken(documentConfig, config.onlyoffice.jwtSecret)
  return documentConfig
}

export const handleCallback = async (body: any): Promise<void> => {
  console.log('OnlyOffice callback received:', body)

  const { status, key, userId } = body

  switch (status) {
    case 1:
      console.log(`Document ${key} is being edited by user ${userId}`)
      break
    case 2:
      console.log(`Document ${key} editing complete`)
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