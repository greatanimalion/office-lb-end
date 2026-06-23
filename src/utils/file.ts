import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ALLOWED_EXTENSIONS = [
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.pdf', '.txt', '.rtf', '.odt', '.ods', '.odp'
]

export const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase()
}

export const isAllowedFileType = (filename: string): boolean => {
  const ext = getFileExtension(filename)
  return ALLOWED_EXTENSIONS.includes(ext)
}

export const calculateMD5 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('md5')
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

export const getFileSize = (filePath: string): number => {
  const stats = fs.statSync(filePath)
  return stats.size
}

export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

export const deleteFile = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}

export const moveFile = (source: string, destination: string): void => {
  fs.renameSync(source, destination)
}

export const copyFile = (source: string, destination: string): void => {
  fs.copyFileSync(source, destination)
}

export const mergeChunks = async (chunkPaths: string[], outputPath: string): Promise<void> => {
  const writeStream = fs.createWriteStream(outputPath)

  for (const chunkPath of chunkPaths) {
    const data = fs.readFileSync(chunkPath)
    writeStream.write(data)
  }

  writeStream.end()
}

export const getStoragePath = (subdir?: string): string => {
  const basePath = path.join(__dirname, '../../uploads')
  if (subdir) {
    return path.join(basePath, subdir)
  }
  return basePath
}

export const downloadFile = async (url: string,name:string=new Date().getTime().toString()): Promise<{
  filePath:string
  size:number
}> => {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const tempFilePath = path.join(getStoragePath('documents'), name)
  fs.writeFileSync(tempFilePath, buffer)
  const size = getFileSize(tempFilePath)
  return {
    filePath: tempFilePath,
    size
  }
}
