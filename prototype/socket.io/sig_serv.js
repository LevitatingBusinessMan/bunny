/* In the future, we can move further away from the sig_serv by only using it to initally talk to a single host.
The host can then use webRTC datachannels to broadcast to its peers.
This way no socket.io rooms are required,
and socket.io connections can immediately be terminated after a peerconnection has been opened. */

const io = require("socket.io")()
const port = 4343

io.on("connection", client => {

	//Room create
	client.on("create", () => {
		const hash = Math.random().toString(36).substring(7)
		console.log("Created room", hash)
		
		//Join client
		client.join(hash)
		client.room = hash

		//Identify this client as host
		client.host = true
		io.sockets.adapter.rooms[hash].host = client.id

		client.emit("created", hash)
	})

	//Client wants to join room
	client.on("join", hash => {
		//Check if room exists
		if (io.sockets.adapter.rooms[hash]) {
			
			console.log("Client joined", hash)

			//Join client
			client.join(hash)
			client.room = hash

			const members = Object.keys(io.sockets.adapter.rooms[hash].sockets).length
			
			//Get host of room
			host = io.sockets.adapter.rooms[hash].host

			//Tell client
			client.emit("joined", members, host)

			//Tell all other clients
			client.broadcast.to(hash).emit("member_join", client.id, members)
		}
		
		//Room doesnt exist
		else {
			console.log("Client tried joining empty room", hash)
			client.emit("joined", null)
		}
	})

	client.on("disconnect", () => {

		//If client was in a room, tell room
		if (client.room) {

			//Extra check if room exists
			if (io.sockets.adapter.rooms[client.room]) {
				console.log("User left", client.room)
				const members = Object.keys(io.sockets.adapter.rooms[client.room].sockets).length
				io.to(client.room).emit("member_leave", client.id, members)
			}

		}

	})

	//Forward SDP-offer from host to client
	client.on("sdp-offer", (id, sdp) => {
		
		//Only hosts should be able to offer SDP
		if (client.host)
			io.to(id).emit("sdp-offer", client.id, sdp)

	})

	//Forward SDP-answer from client to hsot
	client.on("sdp-answer", (id, sdp) => {
		io.to(id).emit("sdp-answer", client.id, sdp)
	})

	client.on("icecandidate", (id, candidate) => {
		io.to(id).emit("icecandidate", client.id, candidate)
	})

})

io.listen(port)
console.log("Signaling server on", port)
