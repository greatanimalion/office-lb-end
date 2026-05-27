import { getDocumentsByOwner, getSharedDocuments } from './document.service';
export const searchDocuments = async (query, userId) => {
    const ownedDocuments = await getDocumentsByOwner(userId);
    const sharedDocuments = await getSharedDocuments(userId);
    const allDocuments = [...ownedDocuments, ...sharedDocuments];
    const lowerQuery = query.toLowerCase();
    const filtered = allDocuments.filter((doc) => doc.title.toLowerCase().includes(lowerQuery) ||
        doc.filename.toLowerCase().includes(lowerQuery));
    return {
        documents: filtered,
        total: filtered.length
    };
};
export const buildSearchIndex = async (documents) => {
    console.log(`Building search index for ${documents.length} documents`);
};
export const updateSearchIndex = async (document) => {
    console.log(`Updating search index for document ${document.id}`);
};
