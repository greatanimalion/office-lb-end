export var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["DRAFT"] = "draft";
    DocumentStatus["ACTIVE"] = "active";
    DocumentStatus["ARCHIVED"] = "archived";
    DocumentStatus["DELETED"] = "deleted";
})(DocumentStatus || (DocumentStatus = {}));
export var DocumentType;
(function (DocumentType) {
    DocumentType["WORD"] = "word";
    DocumentType["EXCEL"] = "excel";
    DocumentType["POWERPOINT"] = "powerpoint";
    DocumentType["PDF"] = "pdf";
    DocumentType["TEXT"] = "text";
    DocumentType["OTHER"] = "other";
})(DocumentType || (DocumentType = {}));
export const DOCUMENT_EXTENSIONS = {
    [DocumentType.WORD]: ['.doc', '.docx', '.odt', '.rtf'],
    [DocumentType.EXCEL]: ['.xls', '.xlsx', '.ods', '.csv'],
    [DocumentType.POWERPOINT]: ['.ppt', '.pptx', '.odp'],
    [DocumentType.PDF]: ['.pdf'],
    [DocumentType.TEXT]: ['.txt', '.md'],
    [DocumentType.OTHER]: ['.*']
};
export const getDocumentType = (extension) => {
    const ext = extension.toLowerCase();
    for (const [type, extensions] of Object.entries(DOCUMENT_EXTENSIONS)) {
        if (extensions.includes(ext)) {
            return type;
        }
    }
    return DocumentType.OTHER;
};
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
