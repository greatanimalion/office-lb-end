import AdmZip from 'adm-zip';
export const extractTextFromDocx = async (filePath) => {
    const zip = new AdmZip(filePath);
    const documentXml = zip.readAsText('word/document.xml');
    const textContent = documentXml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return textContent;
};
export const extractTextFromXml = (xmlContent) => {
    return xmlContent
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};
export const parseDocxMetadata = (filePath) => {
    const zip = new AdmZip(filePath);
    const metadata = {};
    try {
        const appXml = zip.readAsText('docProps/app.xml');
        const coreXml = zip.readAsText('docProps/core.xml');
        const titleMatch = coreXml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
        if (titleMatch)
            metadata.title = titleMatch[1];
        const authorMatch = coreXml.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/);
        if (authorMatch)
            metadata.author = authorMatch[1];
        const createdMatch = coreXml.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/);
        if (createdMatch)
            metadata.created = createdMatch[1];
        const modifiedMatch = coreXml.match(/<dcterms:modified[^>]*>([^<]+)<\/dcterms:modified>/);
        if (modifiedMatch)
            metadata.modified = modifiedMatch[1];
    }
    catch (error) {
        console.error('Error parsing docx metadata:', error);
    }
    return metadata;
};
