var http = require('http'),
    fs = require('fs');
var state = "none";
var stateData = "none";
var request = require('request');
var redis = require('node-redis')
var client = redis.createClient("6379", "127.0.0.1", "");

var newCommand = "";
 
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

		process(incomingMessage);

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
	
	var outgoingMessage = "";
	var mostRecentMessage = incomingMessage;
	client.set("mostrecentmessage", mostRecentMessage);
	
	
	if (incomingMessage == "ping"){
		outgoingMessage = "pong";
		sendServerResponse(outgoingMessage);
	} else if (incomingMessage.indexOf("-h")>-1) {
	  	outgoingMessage = "Some help info...";
		sendServerResponse(outgoingMessage);
	} else if (incomingMessage.indexOf("http")>-1) {
		
		outgoingMessage = "it looks like you want to add a URL to instapaper. Is that correct?";
		sendServerResponse(outgoingMessage);
		state = "waiting-for-instapaper-response";
		stateData = getURL(incomingMessage);
		sendServerResponse("attempting to add " + stateData + " to instapaper...");
		
	} else if (state == "waiting-for-instapaper-response"){
		if (incomingMessage == "Y") {
			outgoingMessage = "You said yes to adding instapaper url!";
			sendServerResponse(outgoingMessage);
			var urlToAdd = stateData;
			authenticateInstapaper('https://www.instapaper.com/api/add', 'matthartman+instapaper@gmail.com', 'mfhmfh', urlToAdd);
			state = "none";
		} else {
			outgoingMessage = "You said No to adding instapaper url!";
			sendServerResponse(outgoingMessage);
		}
	} else if (incomingMessage == "add a command"){
		state = "adding command";
		outgoingMessage = "okay, type an example of what the question or command might be";
		sendServerResponse(outgoingMessage);
		sendServerResponse("current state is: " + state);
	} else if (state == "adding command"){
		sendServerResponse("debugging 1");
		sendServerResponse("current state is: " + state);
		sendServerResponse("incomingMessage is: " + incomingMessage);
		if (incomingMessage.indexOf("RESPONSE") > -1) {
			sendServerResponse("debugging 2");
			sendServerResponse("registering a response");
			outgoingMessage = "registered new response: " + incomingMessage;
			sendServerResponse(outgoingMessage);
			//register the response
			state = "none";
			sendServerResponse("set state to: " + state);
			outgoingMessage = "completed registering the new command.";
			sendServerResponse(outgoingMessage);
		} else if (incomingMessage.indexOf("CHOICE")>-1){
			sendServerResponse("debugging 3");
			outgoingMessage = "registering a new choice: " + incomingMessage.substring(incomingMessage.indexOf("RESPONSE"), incomingMessage.length());
			sendServerResponse(outgoingMessage);
			//register the choice
			state = "setting choices";
			sendServerResponse("set state to: " + state);
			outgoingMessage = "finished registering this choice. you can say RESPONSE to create a final response to this choice, or CHOICE to have more choices follow.";
			sendServerResponse(outgoingMessage);
		} else {
			sendServerResponse("debugging 4");
			outgoingMessage = "registered new command: " + incomingMessage;
			sendServerResponse(outgoingMessage);
			//register the command in the database
			newCommand = "adding a command";
			outgoingMessage = "you can now add responses or choices. type RESPONSE and then the repsonse or type CHOICE to create an option for the user to select";
			sendServerResponse(outgoingMessage);			
		}
	} else {
		outgoingMessage = "did not recognize your command. please press -h for help";
		sendServerResponse(outgoingMessage);
	}
	return;
}

