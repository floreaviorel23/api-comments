const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path');
const urlencodedParser = bodyParser.urlencoded({ extended: false })
require('dotenv').config();

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

let comments = [];  // Array of comments from database
let toSendGlobal = {};    // Object to send in index.pug (contains all comments)

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
    server: process.env.LOCAL_IP_ADDRESS, // or "localhost"
    options: {
        database: process.env.DATABASE_NAME,
        encrypt: false,
        trustServerCertificate: true,
        rowCollectionOnDone: true
    },
    authentication: {
        type: "default",
        options: {
            userName: process.env.DATABASE_ADMIN,
            password: process.env.DATABASE_PASSWORD
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
    console.log(`It's alive on  : ${process.env.LOCAL_IP_ADDRESS}:${PORT}`);
});


app.get("/", async (req, res) => {
    console.log("GET Request from /");
    try {
        await getAllComments();

        // Copy the content of toSendGlobal (without reference)
        let toSendLocal = JSON.parse(JSON.stringify(toSendGlobal));

        if (req.session.userName) {
            toSendLocal.userName = req.session.userName;
        }
        res.status(200);
        res.render('index', toSendLocal);
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

app.get("/logout", (req, res) => {
    if (req.session.userName) {
        req.session.userName = null;
        res.status(200);
        res.redirect('/');
    }
    else {
        res.status(400).send("Ur already logged out");
    }
});


app.get("/:uuid", async (req, res) => {
    //console.log("GET Request from /uuid");
    const uuid = req.params.uuid;

    try {
        const result = await getComment(uuid);
        //Checks if result is an empty javascript object
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
    if (!req.session.userName) {
        console.log("No user logged in");
    }
    else {
        const author = req.session.userName;
        const [avatar, message] = [req.body.avatar, req.body.message];

        const avatarOptions = ["😍", "🤔", "😎", "🥱", "🥶", "👀", "🐍", "🍕", "🐒", "🐫"];

        if (!avatarOptions.includes(avatar)) {
            res.status(400).send("Cant do that chief D:");
        }
        else {
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
                    res.status(500);
                    res.send("POST Request failed");
                }
            }
        }
    }
});

app.post("/login", urlencodedParser, async (req, res) => {
    console.log("POST request from /login");
    const [username, pswd] = [req.body.username, req.body.pswd];
    if (username && pswd) {
        try {
            //Tests if there is an user in database that has the username and pswd
            const user = await getUser(username, pswd);
            req.session.userName = user[0][2].value; //only 1 row (hence user[0])

            res.status(200);
            res.redirect('/');
        }
        catch (err) {
            console.log(err);
            res.status(500).send('Not working D:');
        }
    }
    else {
        res.status(400).send('Gib username and pswd');
    }
});

app.post('/register', urlencodedParser, async (req, res) => {
    console.log("POST request from /register");
    const [username, email, pswd] = [req.body.username, req.body.email, req.body.pswd];

    if (username && pswd && email) {
        try {
            //If registerNewUser fails (because of database constraints), it will catch an error
            await registerNewUser(username, email, pswd);
            res.status(200);
            res.redirect('/login');
        }
        catch (err) {
            res.status(400);
            res.send("Username or email already exists");
        }
    }
    else {
        res.status(400).send("Gib username and email and pswd");
    }
});


app.delete("/:uuid", async (req, res) => {
    console.log("DELETE Request from /uuid");
    const uuid = req.params.uuid;
    let author;

    if (req.session.userName) {
        try {
            author = await findAuthorsName(uuid);  // Find comment's author
        }
        catch (err) {
            console.log("err delete/:uuid", err);
        }

        // Check if comment's author is the user logged in
        if (req.session.userName == author) {
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
        }
        else {
            console.log("Cant delete : " + uuid);
        }
    }
    else {
        console.log("Cant delete : " + uuid);
    }

});


app.put("/:uuid", async (req, res) => {
    console.log("PUT Request from /uuid");
    const uuid = req.params.uuid;
    let author;

    if (req.session.userName) {
        try {
            author = await findAuthorsName(uuid);    // Find comment's author
        }
        catch (err) {
            console.log(err);
        }

        if (req.session.userName == author) {  // Check if comment's author is the user logged in
            message = req.body.message;

            if ((message == '') || (!message)) {
                res.status(400);
                res.send("Request missing something");
            }
            else {
                try {
                    const result = await updateComment(uuid, message);
                    res.status(200);
                    res.send('Updated with success');
                }
                catch (err) {
                    console.log(err);
                    res.status(500).send("PUT Request failed")
                }
            }
        }
    }
    else {
        console.log("Cant edit : ", uuid);
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
            toSendGlobal.comments = comments;
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
            //console.log("err GET");
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
                //console.log("err insertNewComment : ", err);
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
function updateComment(uuid, message) {
    const prom = new Promise((resolve, reject) => {

        if (!message || message == '')
            message = 'NULL'

        let sql = `exec UpdateComment "${uuid}", "${message}"`;

        let Request = require('tedious').Request;
        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                reject("failed updateComment");
                //console.log("err update: ", err);
            }
        });

        dbrequest.on('requestCompleted', () => {
            //console.log("Request completed updateComment");
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

// - - - - - Checks if the user (username & password) exists in the database - - - - - - -
function getUser(username, password) {
    const prom = new Promise((resolve, reject) => {

        let sql = `exec SelectUser "${username}", "${password}"`;

        let Request = require('tedious').Request;
        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                console.log("err getUser", err);
            }
        });

        dbrequest.on('requestCompleted', () => {
        });

        dbrequest.on('doneInProc', function (rowCount, more, rows) {
            if (rows.length != 1) {
                reject("Failed getUser. rowCount !=1 ");
            }
            else {
                resolve(rows);
            }
        });
        connection.execSql(dbrequest);
    });
    return prom;
}

// - - - - - - - - - - Finds the comment's author (his username) - - - - - - - - - - - 
function findAuthorsName(uuid) {
    const prom = new Promise((resolve, reject) => {
        let sql = `SELECT author FROM comments WHERE uuid = '${uuid}'`;
        let author;

        let Request = require('tedious').Request;
        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err && rowCount != 1) {
                console.log("err findAuthorsName", err);
            }
        });

        dbrequest.on('row', (columns) => {
            author = columns[0].value;
        });

        dbrequest.on('requestCompleted', () => {
            resolve(author);
        });

        dbrequest.on('error', (err) => {
            reject(err);
        });

        connection.execSql(dbrequest);
    });
    return prom;
}

// - - - - - - - - - - Add a new user to database - - - - - - - - - - - 
function registerNewUser(username, email, pswd) {
    const prom = new Promise((resolve, reject) => {

        let sql = `exec AddNewUser "${username}", "${email}", "${pswd}"`;

        let Request = require('tedious').Request;
        const dbrequest = new Request(sql, (err, rowCount) => {
            if (err) {
                reject("fail");
            }
        });

        dbrequest.on('requestCompleted', () => {
            resolve("success");
        });

        dbrequest.on('error', (err) => {
            reject(err);
        });

        connection.execSql(dbrequest);
    });
    return prom;
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