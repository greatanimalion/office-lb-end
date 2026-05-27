import Tesseract from 'tesseract.js';
export const extractTextFromImage = async (imagePath) => {
    const result = await Tesseract.recognize(imagePath, 'eng+chi_sim', {
        logger: (m) => console.log('OCR Progress:', m),
    });
    return {
        text: result.data.text,
        confidence: result.data.confidence,
    };
};
export const extractTextFromPdf = async (pdfPath) => {
    return {
        text: 'PDF OCR extraction not implemented',
        confidence: 0,
    };
};
