import mysql from "mysql2";

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "nlog"
})

db.connect((err) => {
    if(err){
        console.log(err)
    }else{
        console.log("database connected suucessfully")
    }
})

export default db;