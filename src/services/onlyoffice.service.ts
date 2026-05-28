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
  documentUrl: string,
  documentType: string,
  callbackUrl: string,
  canEdit: boolean = true
): OnlyOfficeConfig => {
  const key = `${documentId}_${Date.now()}`

  return {
    documentServerUrl: config.onlyoffice.documentServerUrl,
    jwtToken: generateToken({
      userId: documentId,
      email: '',
      role: ''
    }),
    type: 'desktop',
    documentType,
    document: {
      title: documentTitle,
      url: documentUrl,
      fileType: documentType,
      key
    },
    editorConfig: {
      callbackUrl,
      mode: canEdit ? 'edit' : 'view'
    },
    permissions: {
      edit: canEdit,
      download: true,
      print: true
    }
  }
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