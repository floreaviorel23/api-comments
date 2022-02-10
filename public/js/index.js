
function deleteComment(uuid) {
    const commentDiv = document.getElementById(uuid);
    commentDiv.remove();
    
    const xhttp = new XMLHttpRequest();
    xhttp.onload = function () {
    }
    xhttp.open("DELETE", `http://192.168.0.102:3000/${uuid}`);
    xhttp.send();
}

function editComment(uuid){
    const commentDiv = document.getElementById(uuid);
    commentDiv.style.display = 'none';




}
