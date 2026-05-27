import fs from 'fs';
import { getDB } from '../db';
import { documentsIndex } from '../config/meilisearch';
import logger from '../utils/logger';
let meilisearchAvailable = true;
export const initMeiliSearch = async () => {
    try {
        await documentsIndex.updateSettings({
            searchableAttributes: ['title', 'filename', 'content', 'tags'],
            filterableAttributes: ['owner_id', 'created_at', 'updated_at'],
            sortableAttributes: ['created_at', 'updated_at'],
            displayedAttributes: ['id', 'title', 'filename', 'owner_id', 'created_at', 'updated_at']
        });
        logger.info('MeiliSearch initialized successfully');
    }
    catch (error) {
        meilisearchAvailable = false;
        logger.warn('MeiliSearch not available, falling back to database search:', error);
    }
};
export const addDocumentToIndex = async (document) => {
    if (!meilisearchAvailable)
        return;
    try {
        await documentsIndex.addDocuments([document]);
    }
    catch (error) {
        logger.error('Failed to add document to MeiliSearch:', error);
    }
};
export const updateDocumentInIndex = async (document) => {
    if (!meilisearchAvailable)
        return;
    try {
        await documentsIndex.updateDocuments([document]);
    }
    catch (error) {
        logger.error('Failed to update document in MeiliSearch:', error);
    }
};
export const deleteDocumentFromIndex = async (documentId) => {
    if (!meilisearchAvailable)
        return;
    try {
        await documentsIndex.deleteDocument(documentId.toString());
    }
    catch (error) {
        logger.error('Failed to delete document from MeiliSearch:', error);
    }
};
export const searchDocuments = async (options) => {
    if (meilisearchAvailable && options.query) {
        try {
            const filters = [];
            if (options.author) {
                filters.push(`owner_id = ${options.author}`);
            }
            if (options.startDate) {
                filters.push(`created_at >= "${options.startDate}"`);
            }
            if (options.endDate) {
                filters.push(`created_at <= "${options.endDate}"`);
            }
            const result = await documentsIndex.search(options.query, {
                filter: filters.length > 0 ? filters.join(' AND ') : undefined,
                limit: options.limit || 20,
                offset: options.offset || 0
            });
            return result.hits.map((hit) => ({
                id: parseInt(hit.id),
                title: hit.title,
                filename: hit.filename,
                owner_id: hit.owner_id,
                created_at: hit.created_at,
                updated_at: hit.updated_at,
                score: hit._score
            }));
        }
        catch (error) {
            logger.error('MeiliSearch search failed, falling back to database:', error);
            meilisearchAvailable = false;
        }
    }
    return searchDocumentsDB(options);
};
const searchDocumentsDB = async (options) => {
    const db = getDB();
    if (!db) {
        return [];
    }
    let sql = `
    SELECT d.id, d.title, d.filename, d.owner_id, d.created_at, d.updated_at
    FROM documents d
    WHERE d.status != 'deleted'
  `;
    const conditions = [];
    if (options.query) {
        const escapedQuery = options.query.replace(/"/g, '\\"');
        conditions.push(`(d.title LIKE "%${escapedQuery}%" OR d.filename LIKE "%${escapedQuery}%")`);
    }
    if (options.author) {
        conditions.push(`d.owner_id = ${options.author}`);
    }
    if (options.startDate) {
        conditions.push(`d.created_at >= "${options.startDate}"`);
    }
    if (options.endDate) {
        conditions.push(`d.created_at <= "${options.endDate}"`);
    }
    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }
    sql += ` ORDER BY d.updated_at DESC`;
    if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
        sql += ` OFFSET ${options.offset}`;
    }
    try {
        const result = db.exec(sql);
        const documents = [];
        if (result.length && result[0].values.length) {
            result[0].values.forEach((row) => {
                documents.push({
                    id: row[0],
                    title: row[1],
                    filename: row[2],
                    owner_id: row[3],
                    created_at: row[4],
                    updated_at: row[5]
                });
            });
        }
        return documents;
    }
    catch (error) {
        logger.error('Search documents error:', error);
        return [];
    }
};
export const extractDocxText = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            return '';
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('<?xml')) {
            const textMatch = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
            if (textMatch) {
                return textMatch.map(m => m.replace(/<[^>]*>/g, '')).join(' ');
            }
        }
        return '';
    }
    catch (error) {
        logger.error('Extract docx text error:', error);
        return '';
    }
};
export const searchByContent = async (query, userId) => {
    if (meilisearchAvailable) {
        try {
            const result = await documentsIndex.search(query, {
                filter: `owner_id = ${userId}`,
                limit: 20
            });
            return result.hits.map((hit) => ({
                id: parseInt(hit.id),
                title: hit.title,
                filename: hit.filename,
                owner_id: hit.owner_id,
                created_at: hit.created_at,
                updated_at: hit.updated_at,
                content: hit.content?.substring(0, 200),
                score: hit._score
            }));
        }
        catch (error) {
            logger.error('MeiliSearch content search failed:', error);
        }
    }
    const db = getDB();
    if (!db) {
        return [];
    }
    const result = db.exec(`
    SELECT DISTINCT d.id, d.title, d.filename, d.filepath, d.owner_id, d.created_at, d.updated_at
    FROM documents d
    LEFT JOIN document_shares ds ON d.id = ds.document_id AND ds.user_id = ${userId}
    WHERE d.status != 'deleted' AND (d.owner_id = ${userId} OR ds.id IS NOT NULL)
  `);
    const results = [];
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            const filepath = row[3];
            const content = extractDocxText(filepath);
            if (content.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    id: row[0],
                    title: row[1],
                    filename: row[2],
                    owner_id: row[4],
                    created_at: row[5],
                    updated_at: row[6],
                    content: content.substring(0, 200)
                });
            }
        });
    }
    return results;
};
export const getDocumentsByTag = async (tag, userId) => {
    if (meilisearchAvailable) {
        try {
            const result = await documentsIndex.search(tag, {
                filter: `owner_id = ${userId}`,
                limit: 20
            });
            return result.hits.map((hit) => ({
                id: parseInt(hit.id),
                title: hit.title,
                filename: hit.filename,
                owner_id: hit.owner_id,
                created_at: hit.created_at,
                updated_at: hit.updated_at
            }));
        }
        catch (error) {
            logger.error('MeiliSearch tag search failed:', error);
        }
    }
    const db = getDB();
    if (!db) {
        return [];
    }
    const result = db.exec(`
    SELECT DISTINCT d.id, d.title, d.filename, d.owner_id, d.created_at, d.updated_at
    FROM documents d
    LEFT JOIN document_shares ds ON d.id = ds.document_id AND ds.user_id = ${userId}
    WHERE d.status != 'deleted' AND (d.owner_id = ${userId} OR ds.id IS NOT NULL) AND d.title LIKE "%${tag}%"
    ORDER BY d.updated_at DESC
  `);
    const documents = [];
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            documents.push({
                id: row[0],
                title: row[1],
                filename: row[2],
                owner_id: row[3],
                created_at: row[4],
                updated_at: row[5]
            });
        });
    }
    return documents;
};
export const suggestTags = async (query) => {
    const db = getDB();
    if (!db) {
        return [];
    }
    const result = db.exec(`
    SELECT DISTINCT SUBSTR(d.title, INSTR(d.title, '['), INSTR(d.title, ']') - INSTR(d.title, '[') + 1) as tag
    FROM documents d
    WHERE d.title LIKE "%[%" AND d.title LIKE "%]%" AND d.title LIKE "%${query}%"
  `);
    const tags = [];
    if (result.length && result[0].values.length) {
        result[0].values.forEach((row) => {
            const tag = row[0];
            if (tag) {
                tags.push(tag.replace(/\[|\]/g, ''));
            }
        });
    }
    return [...new Set(tags)];
};
