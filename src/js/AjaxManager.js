import Ajax from 'simple-ajax';
import extend from './extend.js';

const BASE_URL = 'http://jsonplaceholder.typicode.com/';

let _defaultOptions = {
    url: '',
    method: 'GET',
    cors: false,
    cache: false,
    data: null,
    dataType: 'JSON',
    contentType: 'content/json',
    requestWith: 'XMLHttpRequest',
    auth: null,
    headers: ''
};

function _makeRequest(action, customOptions) {
    return new Promise(function (success, failure) {
        let options = extend(_defaultOptions, customOptions);
        options.url = BASE_URL + action;

        console.log("Launching request to ", options.url);
        var request = new Ajax(options);
        request.on('success', (e, data) => {
            success({
                event: e,
                data: data
            });
        });
        request.on('error', failure);
        request.send();
    });
}

export default class {
    get(action) {
        return _makeRequest(action, {
            method: 'GET'
        });
    }
    
    post(action) {
        return _makeRequest(action, {
            method: 'POST'
        });
    }
}