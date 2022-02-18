const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = 3000;
const path = require('path');
const e = require('express');
const urlencodedParser = bodyParser.urlencoded({ extended: false })

app.use(express.json());
app.use(session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: false
}));

let comments = [];  // Array of comments from database
let toSend = {};    // Object to send in index.pug

// - - - - - - - - - - View Engine Setup- - - - - - - - -
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// - - - - - - - - - - Set public path - - - - - - - - -
app.use(express.static(path.join(__dirname, 'public')));
//app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))
//app.use('/css', express.static(path.join(__dirname, 'public/css')))

// - - - - - - - - - - Database config - - - - - - - - -
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

// - - - - - - - - - - Database connection - - - - - - - - -
function dbConnection() {
    connection.connect((err) => {
        if (err) {
            console.log('Error dbConnection : ', err)
        }
        else {
            console.log("Connected to db : " + config.options.database);
        }
    });
}
dbConnection();


// - - - - - - - - - - Express routes - - - - - - - - -

app.listen(PORT, () => {
    console.log("It's alive on 192.168.0.102:" + PORT);
});


app.get("/", async (req, res) => {
    console.log("GET Request from /");
    try {
        await getAllComments();
        res.status(200);
        res.render('index', toSend);
    }
    catch (err) {
        console.log(err);
        res.status(500);
        res.send("Get request failed");
    }
});


app.get("/login", (req, res) => {
    res.status(200);
    res.render('login');
});

app.get("/register", (req, res) => {
    res.status(200);
    res.render('register');
});


app.get("/:uuid", async (req, res) => {
    console.log("GET Request from /uuid");
    const uuid = req.params.uuid;

    try {
        const result = await getComment(uuid);
        if (Object.keys(result).length === 0 && result.constructor === Object) {
            res.status(400);
            res.send("ID not found");
        } else {
            res.status(200);
            res.send(`${JSON.stringify(result)}`);
        }
    }
    catch (err) {
        console.log(err);
        res.status(500);
        res.send("GET request failed");
    }
});


app.post("/add-new-comment", urlencodedParser, async (req, res) => {
    console.log("POST Request from /");
    const [avatar, message, author] = [req.body.avatar, req.body.message, req.body.author];

    if (!avatar || !message || !author) {
        res.status(418).send("Request missing something");
    }
    else {
        let com = { avatar, message, author };
        try {
            await insertNewComment(com);
            res.status(200);
            setTimeout(() => { }, 1000);
            res.redirect('/');
        }
        catch (err) {
            console.log("error db : " + err);
            res.status(500).send("POST Request failed");
        }
    }
});


app.post("/login", urlencodedParser, async (req, res) => {
    const [username, pswd] = [req.body.username, req.body.pswd];
    res.status(200).send(`Username : ${username}, Password : ${pswd}`);
});



app.delete("/:uuid", async (req, res) => {
    console.log("DELETE Request from /uuid");
    const uuid = req.params.uuid;

    try {
        const result = await removeComment(uuid);
        res.status(200);
        res.send("Deleted from db");
    }
    catch (errorMessage) {
        console.log(errorMessage);
        res.status(418);
        res.send("Nu a mers");
    }
});


app.put("/:uuid", async (req, res) => {
    console.log("GET Request from /id");
    const uuid = req.params.uuid;
    [avatar, message, author] = [req.body.avatar, req.body.message, req.body.author];

    if ((avatar == '' && message == '' && author == '') || (!avatar && !message && !author)) {
        res.status(400);
        res.send("Request missing something");
    }
    else {
        try {
            const result = await updateComment(uuid, avatar, message, author);
            res.status(200);
            res.send('Updated with success');
        }
        catch (err) {
            console.log(err);
            res.status(500).send("PUT Request failed")
        }
    }
});


// - - - - - - - - - - Select all comments from db - - - - - - - - -
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
            toSend.comments = comments;
            //console.log(toSend);
            resolve("success");
        });

        dbrequest.on('error', (err) => {
            reject(err);
        });
        connection.execSql(dbrequest);
    });
    return prom;
}

function makeSelectRequest(sql) {
    let Request = require('tedious').Request;
    const dbrequest = new Request(sql, (err, rowCount) => {
        if (err) {
            console.log("err GET");
        }
    });
    return dbrequest;
}

// - - - - - - - - - - Select a single comment from db - - - - - - - - -
function getComment(uuid) {
    const prom = new Promise((resolve, reject) => {

        let sql = `exec SelectComment "${uuid}"`;
        let dbrequest = makeSelectRequest(sql);
        let com = {};

        dbrequest.on('row', (columns) => {
            const [uuid, avatar, message, author, createdAt, editedAt] =
                [columns[1].value, columns[2].value, columns[3].value, columns[4].value, columns[5].value, columns[6].value];
            com = { uuid, avatar, message, author, createdAt, editedAt };
        });

        dbrequest.on('requestCompleted', () => {
            //console.log("Request completed get uuid");
            resolve(com);
        });

        connection.execSql(dbrequest);
    });
    return prom;
}

// - - - - - - - - - - Push to array the values obtained from select - - - - - - - - -
function pushCommentToArray(columns) {
    const [uuid, avatar, message, author] =
        [columns[1].value, columns[2].value, columns[3].value, columns[4].value];

    let createdAt = columns[5].value;
    createdAt = sqlToJsDate(createdAt);

    let editedAt = columns[6].value;
    editedAt = sqlToJsDate(editedAt);

    let com = { uuid, avatar, message, author, createdAt, editedAt };
    comments.push(com);
}

// - - - - - - - - - - Insert comment into db - - - - - - - - -
function insertNewComment(comment) {
    const prom = new Promise((resolve, reject) => {

        let Request = require('tedious').Request;
        let sql = `exec InsertNewComment "${comment.avatar}", '${comment.message}', '${comment.author}'`;

        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                reject(err);
                //console.log("err POST : ", err);
            }
        });
        
        dbrequest.on('requestCompleted', () => {
            resolve("success");
        });

        connection.execSql(dbrequest);
    });
    return prom;
}


// - - - - - - - - - - Delete comment from db - - - - - - - - -
function removeComment(uuid) {
    const prom = new Promise((resolve, reject) => {

        let Request = require('tedious').Request;
        let sql = `exec DeleteComment "${uuid}"`;

        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                reject("failed removeComment");
                //console.log("err delete: ", err);
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

// - - - - - - - - - - Update comment from db - - - - - - - - -
function updateComment(uuid, avatar, message, author) {
    const prom = new Promise((resolve, reject) => {

        let Request = require('tedious').Request;
        if (!avatar || avatar == '')
            avatar = 'NULL'
        else
            avatar = `"${avatar}"`;

        if (!message || message == '')
            message = 'NULL'
        else
            message = `"${message}"`;

        if (!author || author == '')
            author = 'NULL'
        else
            author = `"${author}"`;

        let sql = `exec UpdateComment "${uuid}", ${avatar}, ${message}, ${author}`;

        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                reject("failed updateComment");
                //console.log("err delete: ", err);
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

// - - - - - - - - - - Transform sql date object into JS date - - - - - - - - -
function sqlToJsDate(sqlDate) {
    sqlDate = sqlDate.toISOString().replace('Z', '').replace('T', '');

    let date = sqlDate.substring(0, 10);
    let arr = date.split('-');
    arr = arr.reverse();
    date = arr.join("/");

    let time = sqlDate.substring(10, 18);
    sqlDate = date + ', ' + time;

    return sqlDate;
}


// - - - - - - - - - - Using a text file instead of a database - - - - - - - - -
/*
const fs = require('fs');

const data = fs.readFileSync('./fakedb/comments.json',
    { encoding: 'utf8' });
comments = JSON.parse(data);

fs.readFile('./fakedb/comments.json', (err, data) => {   // Asynchronous file read
    comments = JSON.parse(data);
    console.log(comments);        // Won't be shown unless you use the synchronous function
})
*/