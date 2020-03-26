//This file handles the initial connection to the signal server, and some logging
//The rest of the logic is handled in either host.js or client.js

var socket = io.connect(signalServer);

//Make sure we have a room hash and define if we are hosting
var hash, hosting = true; 
if (location.hash) {
	hash = location.hash.substring(1)
	hosting = false
}

console.log("Hash:", hash ? hash : "requesting")

if (hosting)
	console.log("This client is hosting")

//Connect or create room
socket.on("connect", () => {
	console.log("Connected to signaling server")

	//Create room
	if (hosting)
		socket.emit("create")

	//Join room
	else socket.emit("join", hash)
})
