const io = require("socket.io")()
const port = 4343

io.on("connection", client => {

	//Room create
	client.on("create", () => {

		//Hashes act like nicknames for the host
		const hash = Math.random().toString(36).substring(7)
		console.log("Created room", hash)
		
		//Join room with hashname
		client.join(hash)
		client.hash = hash

		client.emit("created", hash)
	})


	client.on("join", hash => {

		if (io.sockets.adapter.rooms[hash]) {
			client.emit("joined", true)

			io.to(hash).emit("client", client.id)
		}
		
		//Host doesnt exist
		else client.emit("joined", false)
	
	})

	client.on("disconnect", () => {
		if (client.hash)
			console.log("Host", client.hash, "disconnected")
	})


	//Forward SDP-offer from host to client
	client.on("sdp-offer", (id, sdp) => {
		
		io.to(id).emit("sdp-offer", client.id, sdp)

	})

	//Forward SDP-answer from client to hsot
	client.on("sdp-answer", (id, sdp) => {

		io.to(id).emit("sdp-answer", client.id, sdp)

	})

	//Forward ICE candidate
	client.on("icecandidate", (id, candidate) => {

		io.to(id).emit("icecandidate", client.id, candidate)

	})

})

io.listen(port)
console.log("Signaling server on", port)
