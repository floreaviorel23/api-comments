let Connection = require('tedious').Connection;

let config = {
    server: "localhost", // or "localhost"
    options: {
        database: "commentsdb"
    },
    authentication: {
        type: "default",
        options: {
            userName: "dev123",
            password: "dev123",
        }
    }
};

let connection = new Connection(config);

// Setup event handler when the connection is established. 
connection.on('connect', function (err) {
    if (err) {
        console.log('Error: ', err)
    }
    else {
        console.log("Connected to db : " + config.options.database);

        let Request = require('tedious').Request;
        const TYPES = require('tedious').TYPES;
        let sql = 'SELECT * FROM comments';

        let request = new Request(sql, (err, rowCount) => {
            if (err) {
                console.log("err : ", err);
            }
            else {
                console.log("no err");
                console.log(rowCount);
            }
        });

        request.on('row', (columns) => {
            columns.forEach((column) => {
                if (column.value === null) {
                    console.log('NULL');
                } else {
                    console.log(column.value);
                }
            });
        });

        request.on('done', (rowCount) => {
            console.log('Done is called!');
        });

        request.on('doneInProc', (rowCount, more) => {
            console.log(rowCount + ' rows returned');
        });





        connection.execSql(request);
    }
});

// Initialize the connection.
connection.connect();