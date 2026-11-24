import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

const connectionUrl = process.env.DATABASE_URL;
const connectionOptions = connectionUrl
  ? (() => {
      let url;
      try {
        url = new URL(connectionUrl);
        if (url.protocol !== "mysql:" || !url.hostname || !url.username || !url.pathname.slice(1)) {
          throw new Error();
        }
      } catch {
        throw new Error("DATABASE_URL must be a valid MySQL connection URL with a database name");
      }
      return {
        host: url.hostname,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: decodeURIComponent(url.pathname.slice(1)),
        port: url.port ? Number(url.port) : 3306,
        // TiDB Cloud requires TLS. An empty SSL options object uses Node's trusted CAs
        // and keeps certificate and hostname verification enabled.
        ssl: {},
      };
    })()
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    };

const db = mysql.createConnection(connectionOptions);

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.code || "CONNECTION_ERROR");
  } else {
    console.log("database connected successfully");
  }
});

export default db;
