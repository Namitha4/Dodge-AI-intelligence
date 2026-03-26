/*import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME     || "o2c_graph",
  user:     process.env.DB_USER     || "postgres",
  password: process.env.DB_PASSWORD,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

export default pool;

*/


import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// On Render, DATABASE_URL is automatically provided by your Postgres instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // This SSL setting is mandatory for Render's Free Tier Postgres
  ssl: { 
    rejectUnauthorized: false 
  } 
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

export default pool;
