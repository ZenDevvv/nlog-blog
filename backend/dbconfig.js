import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();
// const db = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: "password",
//     database: "nlog"
// })
const db = mysql.createConnection({
 host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
})



db.connect((err) => {
    if(err){
        console.log(err)
    }else{
        console.log("database connected suucessfully")
    }
})

export default db;