import mysql from 'mysql2/promise';

// Pool for reading lines, cells, and workers
export const workermanagePool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE_WORKERMANAGE || 'workermanage',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Pool for writing temporary allocations
export const tempassignmentsPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE_TEMP || 'tempassignments_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
