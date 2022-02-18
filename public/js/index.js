
function deleteComment(uuid) {
    const xhttp = new XMLHttpRequest();
    xhttp.onload = function () {
        const commentDiv = document.getElementById(uuid);
        commentDiv.remove();
    }
    xhttp.open("DELETE", `http://192.168.0.102:3000/${uuid}`);
    xhttp.send();
}


let commentOldHTML;

function editComment(uuid, message) {
    const commentDiv = document.getElementById(uuid);
    commentOldHTML = commentDiv.innerHTML;

    commentDiv.innerHTML = `<div class="container mb-5">
    <div class="row">
        <div class="col-lg-1 empty-space"></div>
        <div class="content col-lg-10 border border-2 border-dark rounded px-4 py-3">
                <div class="mb-3">
                    <label for="floatingTextarea">Edit your comment</label>
                    <div class="form-floating"></div>
                    <textarea class="form-control" id="new-comment" name="message">${message}</textarea>
                </div>
                <button class="btn btn-primary" onClick="editCurrentComment('${uuid}', 'new-comment')"; return false; type="" name="submit" value="submit">Edit</button>
        </div>
        <div class="col-lg-1 empty-space"></div>
    </div>
</div>`;
}


function editCurrentComment(uuid, newComment) {
    const newCommentText = document.getElementById(newComment).value;
    const edited = {
        avatar: "",
        message: newCommentText,
        author: ""
    };
    const jsedited = JSON.stringify(edited);

    const xhttp = new XMLHttpRequest();
    xhttp.onload = function () {
        const commentDiv = document.getElementById(uuid);
        commentDiv.innerHTML = commentOldHTML;

        const divMessage = document.getElementById(`message-${uuid}`);
        divMessage.innerHTML = newCommentText;

        const divEditDate = document.getElementById(`edit-date-${uuid}`);
        let dateNow = createDate();
        divEditDate.innerHTML = '<strong>(edited)</strong>';
        divEditDate.setAttribute("title", `last edit : ${dateNow}`);
    }
    xhttp.open("PUT", `http://192.168.0.102:3000/${uuid}`);
    xhttp.setRequestHeader("Content-Type", "application/json");
    xhttp.send(jsedited);
}



function createDate() {
    let myDate = new Date();
    myDate = myDate.toLocaleString("en-gb");
    return myDate;
}