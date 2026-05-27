export enum DocumentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

export enum DocumentType {
  WORD = 'word',
  EXCEL = 'excel',
  POWERPOINT = 'powerpoint',
  PDF = 'pdf',
  TEXT = 'text',
  OTHER = 'other'
}

export const DOCUMENT_EXTENSIONS: Record<DocumentType, string[]> = {
  [DocumentType.WORD]: ['.doc', '.docx', '.odt', '.rtf'],
  [DocumentType.EXCEL]: ['.xls', '.xlsx', '.ods', '.csv'],
  [DocumentType.POWERPOINT]: ['.ppt', '.pptx', '.odp'],
  [DocumentType.PDF]: ['.pdf'],
  [DocumentType.TEXT]: ['.txt', '.md'],
  [DocumentType.OTHER]: ['.*']
}

export const getDocumentType = (extension: string): DocumentType => {
  const ext = extension.toLowerCase()
  for (const [type, extensions] of Object.entries(DOCUMENT_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type as DocumentType
    }
  }
  return DocumentType.OTHER
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024