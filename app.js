const express = require('express');
const app = express();
const PORT = 3000;
app.use(express.json());


let comments = [];

let Connection = require('tedious').Connection;
let config = {
    server: "192.168.0.102", // or "localhost"
    options: {
        database: "commentsdb",
        encrypt: false,
        trustServerCertificate: true
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






function dbConnection() {
    connection.connect((err) => {
        if (err) {
            console.log('Error: ', err)
        }
        else {
            console.log("Connected to db : " + config.options.database);
        }
    });
}

dbConnection();









function getAllComments() {
    const prom = new Promise((resolve, reject) => {
        comments = [];
        let sql = 'exec SelectAllComments';
        let dbrequest = makeSelectRequest(sql);

        dbrequest.on('row', (columns) => {
            pushCommentToArray(columns);
        });
        dbrequest.on('requestCompleted', () => {
            //console.log("Request completed");
            resolve("success");
        });

        connection.execSql(dbrequest);
    });
    return prom;
}


function makeSelectRequest(sql) {
    let Request = require('tedious').Request;
    const dbrequest = new Request(sql, (err, rowCount) => {
        if (err) {
            console.log("err get: ", err);
        }
        else {
            //console.log("no err get");
            //console.log("Row count : " + rowCount);
        }
    });
    return dbrequest;
}





function getComment(uuid) {
    const prom = new Promise((resolve, reject) => {

        let sql = `exec SelectComment "${uuid}"`;
        let dbrequest = makeSelectRequest(sql);
        let com = {};

        dbrequest.on('row', (columns) => {
            const [uuid, avatar, message, author, createdAt, editedAt] =
                [columns[1].value, columns[2].value, columns[3].value, columns[4].value, columns[5].value, columns[6].value];
            com = { avatar, message, author, createdAt, editedAt };
        });

        dbrequest.on('requestCompleted', () => {
            //console.log("Request completed get uuid");
            resolve(com);
        });

        connection.execSql(dbrequest);
    });
    return prom;
}







function pushCommentToArray(columns) {
    const [avatar, message, author, createdAt, editedAt] =
        [columns[2].value, columns[3].value, columns[4].value, columns[5].value, columns[6].value];
    let com = { avatar, message, author, createdAt, editedAt };

    comments.push(com);
}











function insertNewComment(comment) {
    const prom = new Promise((resolve, reject) => {

        let sql = `exec InsertNewComment "${comment.avatar}", "${comment.message}", "${comment.author}"`;
        let Request = require('tedious').Request;
        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                console.log("err post: ", err);
            }
            else {
                //console.log("no err");
                //console.log("Row count : " + rowCount);
            }
        });


        dbrequest.on('requestCompleted', () => {
            //console.log("Request completed post");
            resolve("success");
        });

        connection.execSql(dbrequest);
    });
    return prom;
}



function removeComment(uuid) {
    const prom = new Promise((resolve, reject) => {

        let sql = `exec DeleteComment "${uuid}"`;
        let Request = require('tedious').Request;
        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                //reject("failed removeComment");
                console.log("err delete: ", err);
            }
            else {
                //console.log("no err");
                //console.log("Row count : " + rowCount);
            }
        });


        dbrequest.on('requestCompleted', () => {
            //console.log("Request completed post");
            resolve("success");
        });

        connection.execSql(dbrequest);
    });
    return prom;
}








//const fs = require('fs');

// const data = fs.readFileSync('./fakedb/comments.json',
//     { encoding: 'utf8' });
// comments = JSON.parse(data);


// fs.readFile('./fakedb/comments.json', (err, data) => {   // Asynchronous file read
//     comments = JSON.parse(data);
//     console.log(comments);        // Won't be shown unless you use the synchronous function
// })

//comment
// {
//     avatar: emoji
//     message: text
//     author: text
//     createdAt: Date  -- Not given by user
//     editedAt: Date   -- Not given by user
//   }









app.listen(PORT, () => {
    console.log("It's alive on port : " + PORT);
});





app.get("/", async (req, res) => {
    console.log("GET Request from /");
    await getAllComments();
    res.status(200);
    res.send(`${JSON.stringify(comments)}`);
});




app.get("/:uuid", async (req, res) => {
    console.log("GET Request from /uuid");
    const uuid = req.params.uuid;
    const result = await getComment(uuid);

    if (Object.keys(result).length === 0 && result.constructor === Object) {
        res.status(400);
        res.send("ID not found");
    } else {
        res.status(200);
        res.send(`${JSON.stringify(result)}`);
    }

});







app.post("/", async (req, res) => {
    console.log("POST Request from /");
    const [avatar, message, author] = [req.body.avatar, req.body.message, req.body.author];

    if (!avatar || !message || !author) {
        res.status(418).send("Nu a mers");
    }
    else {
        let com = { avatar, message, author };
        await insertNewComment(com);
        res.status(200);
        res.send("Comment successfuly added");
    }
});





app.delete("/:uuid", async (req, res) => {
    console.log("DELETE Request from /uuid");
    const uuid = req.params.uuid;

    const result = await removeComment(uuid);
    res.status(200);
    res.send("Deleted from db");

});






app.put("/:id", (req, res) => {
    console.log("GET Request from /id");
    const id = req.params.id;
    if (!isNaN(id) && id < comments.length && id >= 0) {
        const avatar2 = req.body.avatar;
        const message2 = req.body.message;
        const author2 = req.body.author;
        updateComment(id, avatar2, message2, author2);

        res.status(200);
        res.send(`${JSON.stringify(comments[id])}`);
    }
    else {
        res.status(400);
        res.send("Oh no it do be not working");
    }
});





function updateComment(id, avatar2, message2, author2) {
    if (avatar2 && avatar2 != '') {
        comments[id].avatar = avatar2;
    }
    if (message2 && message2 != '') {
        comments[id].message = message2;
    }
    if (author2 && author2 != '') {
        comments[id].author = author2;
    }
    comments[id].editedAt = new Date();
}

