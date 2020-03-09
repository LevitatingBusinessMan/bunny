//This file handles the initial connection to the signal server, and some logging
//The rest of the logic is handled in either host.js or client.js

var socket = io.connect(signalServer);

//Make sure we have a room hash and define if we are hosting
var hash, host, hosting = true; 
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

//Created room
socket.on("created", hash => {
	hash = hash
	console.log("Hash:", hash)
	location.hash = hash
})

//Joined room
socket.on("joined", (members, host_) => {
	host = host_
	if (members) {
		console.group("Joined room")
		console.log("Hash:", hash)
		console.log("Members:", members)
		console.log("Host:", host)
		console.groupEnd()
	}
		
	else {
		console.error("Failed to join", hash)
		location.hash = ""
		location.reload()
	}
})

//Other user joined room
socket.on("member_join", (id, count) => {
	console.group("Member joined")
	console.log("ID:", id)
	console.log("Total members:", count)
	console.groupEnd()
})

//Other user left room
	socket.on("member_leave", (id, count) => {
	console.group("Member left")
	console.log("ID:", id)
	console.log("Total members:", count)
	console.groupEnd()
})
