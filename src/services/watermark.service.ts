import fs from 'fs'
import path from 'path'
import logger from '../utils/logger'

export interface WatermarkOptions {
  userId: number
  username?: string
  timestamp?: Date
  customText?: string
  type?: 'text' | 'image' | 'both'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'tiled'
  opacity?: number
}

export interface WatermarkInfo {
  userId: number
  username?: string
  timestamp: Date
  customText?: string
  appliedAt: Date
}

export const addTextWatermark = (
  inputPath: string,
  outputPath: string,
  options: WatermarkOptions
): boolean => {
  try {
    if (!fs.existsSync(inputPath)) {
      return false
    }

    const timestamp = options.timestamp || new Date()
    const username = options.username || `User_${options.userId}`
    
    let watermarkText = options.customText
    if (!watermarkText) {
      watermarkText = `© ${username} | ID: ${options.userId} | ${timestamp.toISOString()}`
    }

    const content = fs.readFileSync(inputPath, 'utf-8')
    
    const watermarkComment = `<!-- Watermark: ${watermarkText} -->`
    
    let modifiedContent = content
    
    if (content.startsWith('<?xml')) {
      const xmlDeclarationEnd = content.indexOf('?>') + 2
      modifiedContent = content.slice(0, xmlDeclarationEnd) + '\n' + watermarkComment + '\n' + content.slice(xmlDeclarationEnd)
    } else if (content.startsWith('<!DOCTYPE')) {
      const doctypeEnd = content.indexOf('>') + 1
      modifiedContent = content.slice(0, doctypeEnd) + '\n' + watermarkComment + '\n' + content.slice(doctypeEnd)
    } else {
      modifiedContent = watermarkComment + '\n' + content
    }

    fs.writeFileSync(outputPath, modifiedContent)
    
    return true
  } catch (error) {
    logger.error('Add text watermark error:', error)
    return false
  }
}

export const addDocumentWatermark = (
  inputPath: string,
  outputPath: string,
  options: WatermarkOptions
): boolean => {
  const ext = path.extname(inputPath).toLowerCase()
  
  switch (ext) {
    case '.xml':
    case '.html':
    case '.htm':
    case '.svg':
    case '.txt':
      return addTextWatermark(inputPath, outputPath, options)
    
    case '.docx':
      return addDocxWatermark(inputPath, outputPath, options)
    
    default:
      return addGenericWatermark(inputPath, outputPath, options)
  }
}

const addDocxWatermark = (
  inputPath: string,
  outputPath: string,
  options: WatermarkOptions
): boolean => {
  try {
    if (!fs.existsSync(inputPath)) {
      return false
    }

    fs.copyFileSync(inputPath, outputPath)
    
    const timestamp = options.timestamp || new Date()
    const username = options.username || `User_${options.userId}`
    const watermarkText = options.customText || `© ${username} | ID: ${options.userId} | ${timestamp.toISOString()}`

    const admZip = require('adm-zip')
    const zip = new admZip(outputPath)
    
    const xmlContent = zip.readAsText('word/document.xml')
    
    if (xmlContent) {
      const watermarkComment = `<!-- Watermark: ${watermarkText} -->`
      const updatedContent = xmlContent.replace(/(<w:body>)/, `$1${watermarkComment}\n`)
      
      zip.updateFile('word/document.xml', Buffer.from(updatedContent, 'utf-8'))
      zip.writeZip(outputPath)
    }

    return true
  } catch (error) {
    logger.error('Add docx watermark error:', error)
    return false
  }
}

const addGenericWatermark = (
  inputPath: string,
  outputPath: string,
  options: WatermarkOptions
): boolean => {
  try {
    if (!fs.existsSync(inputPath)) {
      return false
    }

    const timestamp = options.timestamp || new Date()
    const username = options.username || `User_${options.userId}`
    const watermarkText = options.customText || `© ${username} | ID: ${options.userId} | ${timestamp.toISOString()}`

    const watermarkBuffer = Buffer.from(`\n\n/* Watermark: ${watermarkText} */\n`)
    
    const inputBuffer = fs.readFileSync(inputPath)
    const outputBuffer = Buffer.concat([inputBuffer, watermarkBuffer])
    
    fs.writeFileSync(outputPath, outputBuffer)
    
    return true
  } catch (error) {
    logger.error('Add generic watermark error:', error)
    return false
  }
}

export const generateWatermarkText = (options: { userId: number; username?: string; timestamp?: Date }): string => {
  const timestamp = options.timestamp || new Date()
  const username = options.username || `User_${options.userId}`
  return `User: ${username} | ID: ${options.userId} | AccessTime: ${timestamp.toLocaleString('zh-CN')}`
}

export const extractWatermarkInfo = (filePath: string): WatermarkInfo | null => {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    
    const watermarkMatch = content.match(/<!-- Watermark:.*?User:\s*([^|]*?)\s*\|\s*ID:\s*(\d+)\s*\|\s*.*?AccessTime:\s*(.+?)-->/s)
    
    if (watermarkMatch) {
      return {
        userId: parseInt(watermarkMatch[2], 10),
        username: watermarkMatch[1].trim(),
        timestamp: new Date(watermarkMatch[3].trim()),
        appliedAt: new Date()
      }
    }

    const simpleMatch = content.match(/Watermark:\s*.*?ID:\s*(\d+)/)
    if (simpleMatch) {
      return {
        userId: parseInt(simpleMatch[1], 10),
        timestamp: new Date(),
        appliedAt: new Date()
      }
    }

    return null
  } catch (error) {
    logger.error('Extract watermark info error:', error)
    return null
  }
}

export const verifyWatermark = (filePath: string, expectedUserId: number): boolean => {
  const watermarkInfo = extractWatermarkInfo(filePath)
  
  if (!watermarkInfo) {
    return false
  }
  
  return watermarkInfo.userId === expectedUserId
}

export const removeWatermark = (filePath: string, outputPath: string): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      return false
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    
    const cleanedContent = content
      .replace(/<!-- Watermark:.*?-->\s*/g, '')
      .replace(/\/\* Watermark:.*?\*\/\s*/g, '')
      .trim()
    
    fs.writeFileSync(outputPath, cleanedContent)
    
    return true
  } catch (error) {
    logger.error('Remove watermark error:', error)
    return false
  }
}

export const generateAccessToken = (userId: number, documentId: number, expiresInMinutes: number = 60): string => {
  const payload = {
    userId,
    documentId,
    expiresAt: Date.now() + expiresInMinutes * 60 * 1000,
    token: Math.random().toString(36).substr(2, 15)
  }
  
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export const validateAccessToken = (token: string): { userId: number; documentId: number; valid: boolean } => {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)
    
    if (payload.expiresAt && payload.expiresAt > Date.now()) {
      return { userId: payload.userId, documentId: payload.documentId, valid: true }
    }
    
    return { userId: 0, documentId: 0, valid: false }
  } catch (error) {
    logger.error('Validate access token error:', error)
    return { userId: 0, documentId: 0, valid: false }
  }
}