import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const connectDB = async (): Promise<void> => {
  try {
    const res = await pool.query(`SELECT NOW()`);
    console.log(`Connected to database successfully ${res.rows[0]}`);
  } catch (error) {
    console.error("Error connecting to database: ", error);
    process.exit(1);
  }
};

export { connectDB, pool };
