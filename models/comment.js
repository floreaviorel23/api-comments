const app = require('../app');
let comments = [];

// - - - - - - - - - - Select all comments from db - - - - - - - - -
function getAllComments() {
    const prom = new Promise((resolve, reject) => {
        const connection = app.connection;
        comments = [];
        let sql = 'exec SelectAllComments';
        let dbrequest = makeSelectRequest(sql);

        dbrequest.on('row', (columns) => {
            pushCommentToArray(columns);
        });

        dbrequest.on('requestCompleted', () => {
            app.toSendGlobal.comments = comments;
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

        const connection = app.connection;
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

// - - - - - - - - - - Insert comment into db - - - - - - - - -
function insertNewComment(comment) {
    const prom = new Promise((resolve, reject) => {

        const connection = app.connection;
        let Request = require('tedious').Request;
        let TYPES = require('tedious').TYPES;

        const dbrequest = new Request('InsertNewComment', (err, rowCount) => {
            if (err) {
                reject(err);
                //console.log("err insertNewComment : ", err);
            }
        });
        dbrequest.addParameter('avatar', TYPES.NVarChar, comment.avatar);
        dbrequest.addParameter('message', TYPES.NVarChar, comment.message);
        dbrequest.addParameter('author', TYPES.NVarChar, comment.author);

        dbrequest.on('requestCompleted', () => {
            resolve("success");
        });

        connection.callProcedure(dbrequest);
    });
    return prom;
}

// - - - - - - - - - - Finds the comment's author (his username) - - - - - - - - - - - 
function findAuthorsName(uuid) {
    const prom = new Promise((resolve, reject) => {

        const connection = app.connection;
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

// - - - - - - - - - - Delete comment from db - - - - - - - - -
function removeComment(uuid) {
    const prom = new Promise((resolve, reject) => {

        const connection = app.connection;
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

        const connection = app.connection;
        if (!message || message == '')
            message = 'NULL'

        const TYPES = require('tedious').TYPES;
        let Request = require('tedious').Request;

        const dbrequest = new Request('UpdateComment', (err, rowCount) => {
            if (err) {
                reject("failed updateComment");
                //console.log("err update: ", err);
            }
        });

        dbrequest.addParameter('uuid', TYPES.UniqueIdentifier, uuid);
        dbrequest.addParameter('message', TYPES.NVarChar, message);

        dbrequest.on('requestCompleted', () => {
            //console.log("Request completed updateComment");
            resolve("success");
        });

        connection.callProcedure(dbrequest);
    });
    return prom;
}

module.exports.getAllComments = getAllComments;
module.exports.insertNewComment = insertNewComment;
module.exports.findAuthorsName = findAuthorsName;
module.exports.removeComment = removeComment;
module.exports.updateComment = updateComment;