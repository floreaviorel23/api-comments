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




function getAllComments() {
    const prom = new Promise((resolve, reject) => {
        comments = [];
        let connection = new Connection(config);

        connection.connect((err) => {
            if (err) {
                console.log('Error: ', err)
            }
            else {
                console.log("Connected to db : " + config.options.database);
                let sql = 'SELECT * FROM comments';
                let dbrequest = makeRequest(sql);

                dbrequest.on('row', (columns) => {
                    pushCommentToArray(columns);
                });

                dbrequest.on('requestCompleted', () => {
                    //console.log(comments);
                    console.log("Request completed");
                    connection.close();
                    resolve("success");
                });

                connection.execSql(dbrequest);
            }
        });
    });
    return prom;
}






function makeRequest(sql) {
    let Request = require('tedious').Request;
    const dbrequest = new Request(sql, (err, rowCount) => {
        if (err) {
            console.log("err : ", err);
        }
        else {
            console.log("no err");
            console.log("Row count : " + rowCount);
        }
    });
    return dbrequest;
}



function pushCommentToArray(columns) {
    let avatar = columns[1].value;
    let message = columns[2].value;
    let author = columns[3].value;
    let createdAt = columns[4].value;
    let editedAt = columns[5].value;

    let com = {};
    com.avatar = avatar;
    com.message = message;
    com.author = author;
    com.createdAt = createdAt;
    com.editedAt = editedAt;

    comments.push(com);
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




app.get("/:id", (req, res) => {
    console.log("GET Request from /id");
    const id = req.params.id;
    if (!isNaN(id) && id < comments.length && id >= 0) {
        res.status(200);
        res.send(`${JSON.stringify(comments[id])}`);
    }
    else {
        res.status(400);
        res.send("PP, I mean id is too big D:");
    }
});







app.post("/", (req, res) => {
    console.log("POST Request from /");
    const avatar = req.body.avatar;
    console.log("avatar is : " + avatar);
    const message = req.body.message;
    const author = req.body.author;
    if (!avatar || !message || !author) {
        res.status(418).send("Nu a mers");
    }
    else {
        let com = createComment(avatar, message, author);
        comments.push(com);
        res.status(200);
        res.send("Comment successfuly added");
    }
});





app.delete("/:id", (req, res) => {
    console.log("DELETE Request from /id");
    const id = req.params.id;
    if (!isNaN(id) && id < comments.length && id >= 0) {
        res.status(200);
        res.send(`${JSON.stringify(comments[id])}`);
        comments.splice(id, 1);         //removed from comments array (database)

    }
    else {
        res.status(400);
        res.send("Oh no it do be not working");
    }
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






function createComment(avatar, message, author) {
    let com = {};
    com.avatar = avatar;
    com.message = message;
    com.author = author;
    com.createdAt = new Date();
    com.editedAt = new Date();
    return com;
}


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

