export const CONFIGS = {
  db: {
    host: process.env["MYSQL_HOST"] || "127.0.0.1",
    port: parseInt(process.env["MYSQL_PORT"] || "3306"),
    database: process.env["MYSQL_DATABASE"] || "zoofi",
    username: process.env["MYSQL_USER"] || "root",
    password: process.env["MYSQL_PASSWORD"] || "root",
  },
  postgres_url: process.env["POSTGRES_URL"],
  env: (process.env["ENV"] || "test") as "prod" | "test",

  server: {
    port: parseInt(process.env["PORT"] || "3000"),
  },
  admin: process.env["ADMIN"] || "",
};
