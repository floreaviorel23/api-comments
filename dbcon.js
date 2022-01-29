var Connection = require('tedious').Connection;

var config = {
    server: "localhost", // or "localhost"
    options: {
        database: "localdb"
    },
    authentication: {
        type: "default",
        options: {
            userName: "sa",
            password: "12345678",
        }
    }
};

var connection = new Connection(config);

// Setup event handler when the connection is established. 
connection.on('connect', function (err) {
    if (err) {
        console.log('Error: ', err)
    }
    else {
        console.log("Connected to db");

        let Request = require('tedious').Request;


        const TYPES = require('tedious').TYPES;

        let sql = 'INSERT INTO table1 (column1, column2, column3) VALUES (@col1, @col2, @col3);';

        request = new Request(sql, (err, rowCount) => {
            if (err) {
                console.log("err : ", err);
            }
            else {
                console.log("no err");
                console.log(rowCount);
            }
        });

        request.addParameter('col1', TYPES.Int, 1234);
        request.addParameter('col2', TYPES.NVarChar, '🍕');
        request.addParameter('col3', TYPES.Int, 422);



        connection.execSql(request);
    }
});

// Initialize the connection.
connection.connect();