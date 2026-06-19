// import pg from "pg";
// import config from "./index.js";
// import logger from "./logger.js";

// const { Pool } = pg;

// const pool = new Pool({
//     host: config.postgres.host,
//     port: config.postgres.port,
//     database: config.postgres.database,
//     user: config.postgres.user,
//     password: config.postgres.password,

//     // Pool settings
//     max: 20,
//     idleTimeoutMillis: 30000,
//     connectionTimeoutMillis: 2000,
// });


// // Pool error listener
// pool.on("error", (err) => {
//     logger.error("Unexpected error on idle PostgreSQL client", err);
// });


// // Test DB connection
// const connectPostgres = async () => {
//     try {
//         const client = await pool.connect();

//         const result = await client.query("SELECT NOW()");

//         logger.info(
//             `PostgreSQL Connected Successfully at ${result.rows[0].now}`
//         );

//         client.release();
//     } catch (error) {
//         logger.error("PostgreSQL Connection Error:", error);
//     }
// };


// // Query helper
// const query = async (text, params) => {
//     const start = Date.now();

//     try {
//         const result = await pool.query(text, params);

//         const duration = Date.now() - start;

//         logger.info("Query Executed", {
//             text,
//             duration: `${duration}ms`,
//             rows: result.rowCount,
//         });

//         return result;
//     } catch (error) {
//         logger.error("Query Error:", {
//             text,
//             error: error.message,
//         });

//         throw error;
//     }
// };


// // Close pool
// const closePG = async () => {
//     try {
//         await pool.end();

//         logger.info("PostgreSQL Pool Closed");
//     } catch (error) {
//         logger.error("Error Closing PostgreSQL Pool:", error);
//     }
// };


// export {
//     pool,
//     connectPostgres,
//     query,
//     closePG,
// };