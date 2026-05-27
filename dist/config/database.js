const database = {
    type: 'sqlite',
    database: process.env.DB_DATABASE || 'database.sqlite',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
};
export default database;
