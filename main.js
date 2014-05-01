var http = require('http'),
    fs = require('fs');
var state = "none";
var stateData = "none";
var request = require('request');
 
var app = http.createServer(function (request, response) {
    fs.readFile("client.html", 'utf-8', function (error, data) {
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.write(data);
        response.end();
    });
}).listen(1337);
 
var io = require('socket.io').listen(app);
 
io.sockets.on('connection', function(socket) {
    socket.on('message_to_server', function(data) {
		var incomingMessage = data["message"];

		var serverResponse = process(incomingMessage);
		
		sendServerResponse(serverResponse);

    });
});

function sendServerResponse(serverResponse){
	io.sockets.emit("message_to_client",{ message: serverResponse });
}

function authenticateInstapaper(instaURL, theUserName, thePassword, urlToAdd) {
	request.post(
	    instaURL,
	    { form: { username: theUserName, password: thePassword, url: urlToAdd} },
	    function (error, response, body) {
	        if (!error && response.statusCode == 201) {
	            console.log(body);
				sendServerResponse("successfully added to instapaper");
				//add the URL to instapaper
				
	        } else {
				console.log(body);
				sendServerResponse("there was a problem adding to instapaper.");
	}
	    }
	);
}

function getURL(incomingMessage){
	var urlStart = incomingMessage.indexOf('http');
	var urlEnd = incomingMessage.indexOf(' ',urlStart);
	return incomingMessage.substring(urlStart, urlEnd);
}

function process(incomingMessage){

	var outgoingMessage = "I could not process your response. Please type -h for help.";
	if (incomingMessage == "ping"){
		outgoingMessage = "pong";
	} else if (incomingMessage.indexOf("-h")>-1) {
	  	outgoingMessage = "Some help info...";
	} else if (incomingMessage.indexOf("http")>-1) {
		
		outgoingMessage = "it looks like you want to add a URL to instapaper. Is that correct?";
		state = "waiting-for-instapaper-response";
		stateData = getURL(incomingMessage);
		sendServerResponse("attempting to add " + stateData + " to instapaper...");
		
	} else if (state == "waiting-for-instapaper-response"){
		if (incomingMessage == "Y") {
			outgoingMessage = "You said yes to adding instapaper url!";
			var urlToAdd = stateData;
			authenticateInstapaper('https://www.instapaper.com/api/add', 'matthartman+instapaper@gmail.com', 'mfhmfh', urlToAdd);
			state = "none";
		} else {
			outgoingMessage = "You said No to adding instapaper url!";
		}
	}
	return outgoingMessage;
}

