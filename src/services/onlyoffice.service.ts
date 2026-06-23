import config from '../config/index'
import { downloadFile } from '../utils/file'
import { generateToken } from '../utils/jwt'
import logger from '../utils/logger'
import { createDocumentVersion, DocumentRelateDV, getDocumentById } from './document.service'

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
/**
 *  config={{
          document: {
            fileType: 'docx',
            key: 'Khirz6zTPdfd7',
            title: '示例文档.docx',
            url: 'https://moqisoft.github.io/assets/example.docx',
            permissions: {
              chat: true,
              comment: true,
              copy: true,
              copyOut: true,
              download: true,
              edit: true,
              fillForms: true,
              modifyContentControl: true,
              modifyFilter: true,
              print: true,
              review: true,
              reviewGroups: null,
              commentGroups: {},
              userInfoGroups: null,
              protect: true,
            },
          },
          documentType: 'word',
          editorConfig: {
            callbackUrl: 'http://192.168.3.159:3000/api/callback',
            customization: {
              about: true,
              comments: true,
              close: { visible: false },
              feedback: false,
              forcesave: true,
              goback: { blank: false, url: 'https://moqisoft.github.io/' },
              help: false,
              submitForm: true,
              logo: {
                visible: false,
                imageEmbedded:
                  'https://moqisoft.github.io/assets/onlyoffice-logo.svg',
                image:
                  'https://moqisoft.github.io/assets/header-logo_s.svg',
                url: 'https://moqisoft.github.io/',
              },
              loaderLogo:
                'https://moqisoft.github.io/assets/onlyoffice-logo.svg',
              loaderName: '文档服务中国版',
              plugins: true,
              features: {
                spellcheck: false,
              },
              layout: {
                statusBar: {
                  actionStatus: false,
                  docLang: false,
                  textLang: false,
                },
              },
              font: {
                size: 12,
              },
              polling: true,
              waterMark: {
                value: '文档服务中国版\\nQQ群：183026419',
              },
              customer: {
                address: '技术交流QQ群：183026419',
                info: '专业提供功能定制服务，欢迎咨询',
                logo: 'https://moqisoft.github.io/assets/onlyoffice-logo.svg',
                mail: '327554929@qq.com',
                name: 'onlyoffice文档服务中国版',
                phone: '+86-010-12345678',
                www: 'https://moqisoft.github.io/',
              },
            },
            lang: 'zh',
            mode: 'edit',
            user: {
              group: '',
              id: '20250424',
              image: 'https://moqisoft.github.io/assets/avatar.png',
              name: 'moqisoft',
            },
          },
          height: '100%',
          token:
            'ew0KICAidHlwIjogIkpXVCIsDQogICJhbGciOiAiSFMyNTYiDQp9.ew0KICAiZG9jdW1lbnQiOiB7DQogICAgImZpbGVUeXBlIjogImRvY3giLA0KICAgICJrZXkiOiAiYXBpd2hlYzk3YjdmMi05ZjhiLTQ3ODUtYTY4YS00MzlkZTYyZTY3MGMiLA0KICAgICJwZXJtaXNzaW9ucyI6IHt9LA0KICAgICJ0aXRsZSI6ICJFeGFtcGxlIERvY3VtZW50IFRpdGxlLmRvY3giLA0KICAgICJ1cmwiOiAiaHR0cHM6Ly9kMm5sY3RuMTJ2Mjc5bS5jbG91ZGZyb250Lm5ldC9hc3NldHMvZG9jcy9zYW1wbGVzL2RlbW8uZG9jeCINCiAgfSwNCiAgImRvY3VtZW50VHlwZSI6ICJ3b3JkIiwNCiAgImVkaXRvckNvbmZpZyI6IHsNCiAgICAiY2FsbGJhY2tVcmwiOiAiaHR0cHM6Ly9hcGkub25seW9mZmljZS5jb20vZWRpdG9ycy9jYWxsYmFjayIsDQogICAgImN1c3RvbWl6YXRpb24iOiB7DQogICAgICAiYW5vbnltb3VzIjogew0KICAgICAgICAicmVxdWVzdCI6IGZhbHNlDQogICAgICB9DQogICAgfQ0KICB9LA0KICAiaGVpZ2h0IjogIjEwMCUiLA0KICAid2lkdGgiOiAiMTAwJSINCn0.pVqCERdbkcvbl6s8W-0k8QngLRCYNyhW0IB8i7JxWwk',
          width: '100%',
        }}
*/
export const generateEditorConfig = (
  documentId: number,
  documentTitle: string,
  canEdit: boolean = true,
  user: { id: string, name: string },
  version: number,
  asyncEdit: boolean = true
): OnlyOfficeConfig => {
  const documentConfig: any = {
    type: 'desktop',
    documentServerUrl: config.onlyoffice.documentServerUrl,
    editorConfig: {
      //采用127.0.0.1回调，避免跨域问题
      callbackUrl: `${config.nodeServerUrl}/api/onlyoffice/${documentId}/callback`,
      mode: 'edit',
      lang: "zh-CN",
      user: {
        id: user.id,
        name: user.name
      },
      customization: {
        waterMark: {
          value: user.name,
        },
      }
    },
    permissions: {
      edit: canEdit,
      download: canEdit,
      print: canEdit,
    },
    document: {
      lang: "zh",
      url: `${config.nodeServerUrl}/api/documents/d/${documentId}`,
      title: documentTitle,
      fileType: documentTitle.split('.').pop() || 'docx',
      // key:asyncEdit?documentId.toString():`${documentId.toString()}_${Date.now()}`
      key: `${documentId}_${version}`,
    },
  }
  documentConfig.token = generateToken(documentConfig, config.onlyoffice.jwtSecret)
  return documentConfig
}

export const handleCallback = async (body: any): Promise<void> => {
  console.log('OnlyOffice callback received:', body)
  const { status, key, users, url,filetype } = body
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
      const filePath = await downloadFile(url, `${new Date().getTime()}_v_${id}.`+filetype)
      const vId = await createDocumentVersion(Number(users[0]), id, filePath.filePath, filePath.size,version+1)
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