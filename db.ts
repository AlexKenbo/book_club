
import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { replicateSupabase } from 'rxdb/plugins/replication-supabase';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { Book, BorrowRequest, UserProfile } from './types';
import { useState, useEffect } from 'react';
import { getSupabase } from './lib/supabaseClient';
import { logger } from './lib/logger';

// Initialize RxDB plugins
// Note: Storage plugins don't need to be added via addRxPlugin in RxDB v16
// They are used directly via getRxStorageDexie() and getRxStorageMemory()

// Try to add dev-mode plugin for better error messages (optional)
// Note: Dev-mode requires schema validators, so we'll skip it for now
// to avoid DVM1 errors. You can enable it later with proper validator setup.
let devModeLoaded = false;

// Enable migration plugin for schema upgrades
addRxPlugin(RxDBMigrationSchemaPlugin);
// Temporarily disabled to avoid DVM1 error
// if (import.meta.env.DEV) {
//     import('rxdb/plugins/dev-mode')
//         .then((module) => {
//             if (module.RxDBDevModePlugin) {
//                 addRxPlugin(module.RxDBDevModePlugin);
//                 devModeLoaded = true;
//                 console.log('RxDB dev-mode plugin loaded');
//             }
//         })
//         .catch((e) => {
//             console.warn('RxDB dev-mode plugin not available:', e);
//         });
// }

// --- Mappers for Snake_case <-> CamelCase ---

const toRx = (data: any) => {
    if (!data) return data;
    const newData: any = { ...data };
    
    const map: Record<string, string> = {
        'owner_id': 'ownerId',
        'owner_name': 'ownerName',
        'image_url': 'imageUrl',
        'current_borrower_id': 'currentBorrowerId',
        'current_borrower_name': 'currentBorrowerName',
        'current_borrower_phone': 'currentBorrowerPhone',
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'book_id': 'bookId',
        'book_image_url': 'bookImageUrl',
        'lender_id': 'lenderId',
        'lender_name': 'lenderName',
        'lender_phone': 'lenderPhone',
        'borrower_id': 'borrowerId',
        'borrower_name': 'borrowerName',
        'borrower_phone': 'borrowerPhone',
        'requested_at': 'requestedAt',
        'phone_number': 'phoneNumber',
        'avatar_url': 'avatarUrl',
        'is_public': 'isPublic'
    };

    Object.keys(map).forEach(snake => {
        if (newData[snake] !== undefined) {
            newData[map[snake]] = newData[snake];
            delete newData[snake];
        }
    });

    return newData;
};

const toSupabase = (data: any) => {
    if (!data) return data;
    const newData: any = { ...data };
    
    const map: Record<string, string> = {
        'ownerId': 'owner_id',
        'ownerName': 'owner_name',
        'imageUrl': 'image_url',
        'currentBorrowerId': 'current_borrower_id',
        'currentBorrowerName': 'current_borrower_name',
        'currentBorrowerPhone': 'current_borrower_phone',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'bookId': 'book_id',
        'bookImageUrl': 'book_image_url',
        'lenderId': 'lender_id',
        'lenderName': 'lender_name',
        'lenderPhone': 'lender_phone',
        'borrowerId': 'borrower_id',
        'borrowerName': 'borrower_name',
        'borrowerPhone': 'borrower_phone',
        'requestedAt': 'requested_at',
        'phoneNumber': 'phone_number',
        'avatarUrl': 'avatar_url',
        'isPublic': 'is_public'
    };

    Object.keys(map).forEach(camel => {
        if (newData[camel] !== undefined) {
            newData[map[camel]] = newData[camel];
            delete newData[camel];
        }
    });

    return newData;
};

// --- Schemas ---

const bookSchema = {
    version: 1,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        ownerId: { type: 'string', maxLength: 100 },
        ownerName: { type: 'string' },
        imageUrl: { type: 'string' },
        category: { type: 'string' },
        status: { type: 'string' },
        currentBorrowerId: { type: 'string', maxLength: 100 },
        currentBorrowerName: { type: 'string' },
        currentBorrowerPhone: { type: 'string' },
        createdAt: { type: 'number', minimum: 0, maximum: 100000000000000, multipleOf: 1 },
        updatedAt: { type: 'string', maxLength: 100 },
        updated_at: { type: 'string', maxLength: 100 }
    },
    required: ['id', 'ownerId', 'imageUrl', 'category', 'status', 'createdAt', 'updatedAt'],
    indexes: ['createdAt', 'updatedAt']
};

const requestSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        bookId: { type: 'string', maxLength: 100 },
        bookImageUrl: { type: 'string' },
        lenderId: { type: 'string', maxLength: 100 },
        lenderName: { type: 'string' },
        lenderPhone: { type: 'string' },
        borrowerId: { type: 'string', maxLength: 100 },
        borrowerName: { type: 'string' },
        borrowerPhone: { type: 'string' },
        status: { type: 'string' },
        requestedAt: { type: 'number', minimum: 0, maximum: 100000000000000, multipleOf: 1 },
        updatedAt: { type: 'string', maxLength: 100 },
        updated_at: { type: 'string', maxLength: 100 }
    },
    required: ['id', 'bookId', 'lenderId', 'borrowerId', 'status', 'requestedAt', 'updatedAt']
};

const profileSchema = {
    version: 2,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        email: { type: 'string' },
        phoneNumber: { type: 'string' },
        avatarUrl: { type: 'string' },
        isPublic: { type: 'boolean' },
        updatedAt: { type: 'string', maxLength: 100 },
        updated_at: { type: 'string', maxLength: 100 }
    },
    required: ['id', 'name', 'updatedAt']
};

// --- Database Types ---

export type LibraryDatabaseCollections = {
    books: RxCollection<Book>;
    requests: RxCollection<BorrowRequest>;
    profiles: RxCollection<UserProfile>;
};

export type LibraryDatabase = RxDatabase<LibraryDatabaseCollections>;

// --- Initialization ---

let dbPromise: Promise<LibraryDatabase> | null = null;
let replicationStates: any[] = [];

const startReplication = async (db: LibraryDatabase) => {
    const supabase = getSupabase();
    if (!supabase) {
        logger.info('Supabase credentials not found, running in local-only mode');
        return;
    }

    logger.info('Starting Supabase replication');

    const collections = [
        { name: 'books', table: 'books' },
        { name: 'requests', table: 'requests' },
        { name: 'profiles', table: 'profiles' }
    ];

    for (const col of collections) {
        const replicationState = replicateSupabase({
            replicationIdentifier: 'supabase-' + col.name,
            client: supabase,
            collection: db[col.name as keyof LibraryDatabaseCollections],
            tableName: col.table,
            modifiedField: 'updated_at',
            pull: {
                modifier: (doc) => {
                    // Convert snake_case from Supabase to camelCase for RxDB
                    return toRx(doc);
                }
            },
            push: {
                modifier: (doc) => {
                    // Ensure updatedAt is set
                    if (!doc.updatedAt) doc.updatedAt = new Date().toISOString();
                    // Convert camelCase to snake_case for Supabase
                    return toSupabase(doc);
                }
            },
            autoStart: true,
        });
        
        replicationStates.push(replicationState);
        
        replicationState.error$.subscribe(err => {
            logger.error(`Replication error on ${col.name}`, { error: String(err) });
        });
    }
};

const _create = async () => {
    let db: LibraryDatabase;
    
    try {
        logger.info('Creating RxDB with Dexie storage');
        const dexieStorage = getRxStorageDexie();

        db = await createRxDatabase<LibraryDatabaseCollections>({
            name: 'libsharedb_rx_v3', // Incremented version to force reset schema
            storage: dexieStorage
        });
        logger.info('RxDB (Dexie) created successfully');
    } catch (err: any) {
        logger.warn('Failed to create RxDB with Dexie, falling back to Memory', {
            error: err?.message || String(err),
            code: err?.code,
        });

        try {
            logger.info('Creating RxDB with Memory storage');
            const memoryStorage = getRxStorageMemory();

            db = await createRxDatabase<LibraryDatabaseCollections>({
                name: 'libsharedb_rx_mem_' + Date.now(),
                storage: memoryStorage
            });
            logger.info('RxDB (Memory) created successfully');
        } catch (memErr: any) {
            logger.error('Failed to create RxDB with Memory storage', {
                error: memErr?.message || String(memErr),
                code: memErr?.code,
            });
            throw memErr;
        }
    }

    logger.info('Adding collections to database');
    await db.addCollections({
        books: {
            schema: bookSchema,
            migrationStrategies: {
                1: (doc: any) => doc
            }
        },
        requests: { schema: requestSchema },
        profiles: {
            schema: profileSchema,
            migrationStrategies: {
                1: (doc) => doc,
                2: (doc) => doc
            }
        }
    });
    logger.info('Collections added successfully');

    // Hook to update 'updatedAt' on saving documents locally
    const collections = ['books', 'requests', 'profiles'];
    collections.forEach(colName => {
        db[colName as keyof LibraryDatabaseCollections].preInsert(function(docData) {
            docData.updatedAt = new Date().toISOString();
        }, false);
        db[colName as keyof LibraryDatabaseCollections].preSave(function(docData) {
            docData.updatedAt = new Date().toISOString();
        }, false);
    });

    // Start replication if configured
    startReplication(db);

    return db;
};

export const getDb = (): Promise<LibraryDatabase> => {
    if (!dbPromise) {
        dbPromise = _create();
    }
    return dbPromise;
};

// --- Utils ---

export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// --- Hooks ---

export function useRxQuery<T>(queryFn: (db: LibraryDatabase) => any, deps: any[] = []): T | undefined {
    const [data, setData] = useState<T | undefined>(undefined);

    useEffect(() => {
        let subscription: any = null;
        let isMounted = true;

        const init = async () => {
            try {
                const db = await getDb();
                const queryOrValue = queryFn(db);

                if (queryOrValue && queryOrValue.$) {
                    subscription = queryOrValue.$.subscribe((result: any) => {
                        if (isMounted) {
                            if (Array.isArray(result)) {
                                setData(result.map((d: any) => d.toJSON()) as any);
                            } 
                            else if (result && typeof result.toJSON === 'function') {
                                setData(result.toJSON() as any);
                            }
                            else {
                                setData(result as any);
                            }
                        }
                    });
                } else if (queryOrValue instanceof Promise) {
                    queryOrValue.then((val: any) => {
                        if (isMounted) setData(val);
                    });
                } else {
                    if (isMounted) setData(queryOrValue);
                }
            } catch (error) {
                logger.error('useRxQuery error', { error: (error as Error)?.message ?? String(error) });
            }
        };

        init();

        return () => {
            isMounted = false;
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, deps);

    return data;
}
