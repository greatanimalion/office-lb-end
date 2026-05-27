import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import logger from './logger';
export const extractTextFromImage = async (imagePath, options = {}) => {
    const { language = 'eng+chi_sim', timeout = 60000 } = options;
    try {
        if (!fs.existsSync(imagePath)) {
            return { text: '', confidence: 0 };
        }
        const result = await Tesseract.recognize(imagePath, language, {
            logger: (m) => logger.debug('OCR Progress:', m),
        });
        return {
            text: result.data.text,
            confidence: result.data.confidence,
        };
    }
    catch (error) {
        logger.error('Extract text from image error:', error);
        return { text: '', confidence: 0 };
    }
};
export const extractTextFromPdf = async (pdfPath) => {
    try {
        if (!fs.existsSync(pdfPath)) {
            return { text: '', confidence: 0 };
        }
        const content = fs.readFileSync(pdfPath, 'utf-8');
        const textContent = content
            .replace(/%PDF-\d+\.\d+/g, '')
            .replace(/\/Type\s*\/[^/]+/g, '')
            .replace(/\/Subtype\s*\/[^/]+/g, '')
            .replace(/\/Name\s*\/[^/]+/g, '')
            .replace(/\/Length\s*\d+/g, '')
            .replace(/\/Filter\s*\/[^/]+/g, '')
            .replace(/\d+\s+\d+\s+obj/g, '')
            .replace(/endobj/g, '')
            .replace(/stream[\s\S]*?endstream/g, '')
            .replace(/xref[\s\S]*?trailer/g, '')
            .replace(/<<[\s\S]*?>>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        const cleanText = textContent.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s,.!?。，！？、]/g, '');
        return {
            text: cleanText || 'PDF content extraction requires additional tools',
            confidence: cleanText ? 0.7 : 0,
        };
    }
    catch (error) {
        logger.error('Extract text from PDF error:', error);
        return { text: '', confidence: 0 };
    }
};
export const extractTextFromDocx = (docxPath) => {
    try {
        if (!fs.existsSync(docxPath)) {
            return { text: '', confidence: 0 };
        }
        const content = fs.readFileSync(docxPath, 'utf-8');
        const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
        if (textMatches) {
            const text = textMatches.map(m => m.replace(/<[^>]*>/g, '')).join(' ');
            return { text, confidence: 0.9 };
        }
        return { text: '', confidence: 0 };
    }
    catch (error) {
        logger.error('Extract text from docx error:', error);
        return { text: '', confidence: 0 };
    }
};
export const extractTextFromFile = async (filePath, options = {}) => {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.bmp':
            return extractTextFromImage(filePath, options);
        case '.pdf':
            return extractTextFromPdf(filePath);
        case '.docx':
            return extractTextFromDocx(filePath);
        default:
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                return { text: content.substring(0, 10000), confidence: 1 };
            }
            catch {
                return { text: '', confidence: 0 };
            }
    }
};
