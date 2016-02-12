import AjaxManager from './AjaxManager.js';

function makeAjaxRequest(action, resultHandler) {
    manager
        .get(action)
        .then(result => {
            var resultArea = document.getElementById('result');
            resultArea.innerHTML = '';
            resultHandler(result, resultArea);
        }, failure => console.error(failure));
}
var manager = new AjaxManager();

var postsButton = document.getElementById('posts');
postsButton.addEventListener('click', () => {
    makeAjaxRequest('posts', (result, resultArea) => {
        var data = result.data;
        for (var i = 0; i < data.length; i++) {
            resultArea.innerHTML += "<p>User id: " + data[i].userId + "</p>";
            resultArea.innerHTML += "<p>Title: " + data[i].title + "</p>";
            resultArea.innerHTML += "<p>Comment: " + data[i].body + "</p>";
            resultArea.innerHTML += "<br />";
            
            if(i > 10){
                break; // Let's not go overboard
            }
        }
    });
}, false);

var commentsButton = document.getElementById('comments');
commentsButton.addEventListener('click', () => {
    makeAjaxRequest('comments', (result, resultArea) => {
        var data = result.data;
        for (var i = 0; i < data.length; i++) {
            resultArea.innerHTML += "<p>Username: " + data[i].name + "</p>";
            resultArea.innerHTML += "<p>Email: " + data[i].email + "</p>";
            resultArea.innerHTML += "<p>Comment: " + data[i].body + "</p>";
            resultArea.innerHTML += "<br />";
            
            if(i > 10){
                break; 
            }
        }
    });
}, false);