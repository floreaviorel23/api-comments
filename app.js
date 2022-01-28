const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());

const comments = [];
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

app.get("/", (req, res) => {
    console.log("GET Request from /");
    res.status(200);
    res.send("You're in root");
});

app.post("/", (req, res) => {
    console.log("POST Request from /");
    const { avatar } = req.body;

    console.log(avatar);

    if (!avatar) {
        res.status(418).send("Nu a mers");
    }
    else {
        let com;
        com.avatar = myAvatar;
        // com.message = message;
        // com.author = author;
        // com.createdAt = new Date();
        // com.editedAt = new Date();
        comments.push(com);

        res.status(200);
        res.send("Comment successfuly added");
    }
});