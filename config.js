const mysql = require("mysql");

// change attributes to connect to your database
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    port: '4306',
    password: "1234",
    database: 'test'
});

connection.connect((err)=>{
    if(err){
        throw err;
    }
})

module.exports = connection;