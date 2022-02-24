
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


function showAddCommentForm() {
    const addCommentForm = document.querySelector(".add-comment-form");

    addCommentForm.innerHTML = `
    <div class="col-lg-4 empty-space"></div>
    <div class="content col-lg-4 border border-3 border-dark rounded px-4 py-3">
      <div>
        <h3>Add new comment</h3>
        <hr/>
      </div>
      <form action="/add-new-comment" method="POST">
        <div class="mb-3">
          <label class="form-label" for="inputAvatar">Avatar</label>
          <select class="form-select" name="avatar">
          <option value="" disabled="disabled" selected="selected">Select your avatar</option>
          <option value="😍">😍</option>
          <option value="🤔">🤔</option>
          <option value="😎">😎</option>
          <option value="🥱">🥱</option>
          <option value="🥶">🥶</option>
          <option value="👀">👀</option>
          <option value="🐍">🐍</option>
          <option value="🍕">🍕</option>
          <option value="🐒">🐒</option>
          <option value="🐫">🐫</option>
      </select>
        </div>
        <div class="mb-3">
          <label for="floatingTextarea">Comment</label>
          <div class="form-floating"></div>
          <textarea class="form-control" name="message" placeholder="Leave a comment here"></textarea>
        </div>
        <button class="btn btn-primary" type="submit" name="submit" value="submit">Submit</button>
      </form>
    </div>
    <div class="col-lg-4 empty-space"></div>`;

}