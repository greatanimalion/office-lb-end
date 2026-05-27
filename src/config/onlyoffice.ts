interface OnlyOfficeConfig {
  documentServerUrl: string
  jwtSecret: string
  jwtHeader: string
  jwtTokenPrefix: string
}

const onlyoffice: OnlyOfficeConfig = {
  documentServerUrl: process.env.ONLYOFFICE_DOCUMENT_SERVER_URL || 'https://localhost',
  jwtSecret: process.env.ONLYOFFICE_JWT_SECRET || 'your-secret-key',
  jwtHeader: process.env.ONLYOFFICE_JWT_HEADER || 'Authorization',
  jwtTokenPrefix: process.env.ONLYOFFICE_JWT_TOKEN_PREFIX || 'Bearer',
}

export default onlyoffice