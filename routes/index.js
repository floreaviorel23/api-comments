const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const session = require('express-session');

const comment = require('../models/comment')
const app = require('../app');

let toSendGlobal = {};

router.use(express.json());
router.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));


router.get("/", async (req, res) => {
    console.log("GET Request from /");
    try {
        await comment.getAllComments();

        // Copy the content of toSendGlobal (without reference)
        let toSendLocal = JSON.parse(JSON.stringify(app.toSendGlobal));

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


router.get("/comment:uuid", async (req, res) => {
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

router.post("/add-new-comment", urlencodedParser, async (req, res) => {
    console.log("POST Request from /");
    if (!req.session.userName) {
        console.log("No user logged in");
    }
    else {
        const author = req.session.userName;
        let [avatar, messageReceived] = [req.body.avatar, req.body.message];
        let message = app.escapeRegExp(messageReceived);

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
                    await comment.insertNewComment(com);
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

router.delete("/:uuid", async (req, res) => {
    console.log("DELETE Request from /uuid");
    const uuid = req.params.uuid;
    let author;

    if (req.session.userName) {
        try {
            author = await comment.findAuthorsName(uuid);  // Find comment's author
        }
        catch (err) {
            console.log("err delete/:uuid", err);
        }

        // Check if comment's author is the user logged in
        if (req.session.userName == author) {
            try {
                const result = await comment.removeComment(uuid);
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


router.put("/:uuid", async (req, res) => {
    console.log("PUT Request from /uuid");
    const uuid = req.params.uuid;
    let author;

    if (req.session.userName) {
        try {
            author = await comment.findAuthorsName(uuid);    // Find comment's author
        }
        catch (err) {
            console.log(err);
        }

        if (req.session.userName == author) {  // Check if comment's author is the user logged in
            let messageReceived = req.body.message;
            let message = app.escapeRegExp(messageReceived);

            if ((message == '') || (!message)) {
                res.status(400);
                res.send("Request missing something");
            }
            else {
                try {
                    await comment.updateComment(uuid, message);
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

module.exports = router;