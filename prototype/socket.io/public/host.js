if (hosting) {

	//Created room
	socket.on("created", hash => {
		hash = hash
		console.log("Hash:", hash)
		location.hash = hash
	})

	var mediaStream

	// Available as a member of Navigator instead of MediaDevices in Chrome 70 and 71.
	if (!navigator.mediaDevices.getDisplayMedia && !navigator.getDisplayMedia) {
		Alert("Unable to receive stream");
	} else {

		//Receive mediastream
		if (navigator.mediaDevices.getDisplayMedia)
			navigator.mediaDevices.getDisplayMedia(displayMediaConfig).then(gotStream)
		else {
			navigator.getDisplayMedia(displayMediaConfig).then(gotStream)
		}

		function gotStream (mediaStream_) {
			mediaStream = mediaStream_
			video.srcObject = mediaStream

			if (!mediaStream.getAudioTracks().length)
				console.warn("No audio track found")
		}

	}

	//Array of connections to clients
	var peerConnections = {}, dataChannels = {}, members = 0

	//New member joins
	socket.on("client", (id) => {
		
		//Create new peer connection
		const pc = new RTCPeerConnection(peerConnectionConfig);
		pc.addStream(mediaStream)

		//Open datachannel
		const dc = pc.createDataChannel("data")
		dataChannels[id] = dc

		//Save connection
		peerConnections[id] = pc

		//Create SDP offer
		pc.createOffer()
		//Set the SDP locally
		.then(sdp => {return pc.setLocalDescription(sdp)})
		//Offer the SDP to peer
		.then(() => {
			console.log("Sending SDP offer to", id)
			socket.emit("sdp-offer", id, pc.localDescription)
		})

		//Send ICE candidate to client
		pc.onicecandidate = event => {
			if (!event.candidate)
				return
			console.log("Sending ICE candidate to", id)
			socket.emit("icecandidate", id, event.candidate)
		}

		//Log connectionstatechange
		pc.onconnectionstatechange =  event => {
			console.log(`New connection state ${id}:`, pc.connectionState)

			switch(pc.connectionState) {
				case "connected": {
					members++

					const msg = {
						type: "member_join",
						id,
						member_count: members
					}
	
					broadcast(msg)

					console.group("Member joined")
					console.log("ID:", id)
					console.log("Total members:", members)
					console.groupEnd()

					break
				}
				case "disconnected":
				case "closed": {
					members--
					delete peerConnections[id]
					delete dataChannels[id]

					const msg = {
						type: "member_leave",
						id,
						member_count: members
					}
	
					broadcast(msg)

					//Logging
					console.group("Member left")
					console.log("ID:", id)
					console.log("Total members:", members)
					console.groupEnd()

					break
				}
			}
		}

		//DataChannel handling
		dc.onopen = () => {
			console.log("Opened datachannel with", id)
		}

		//If the datachannel closes, close peerconnection
		dc.onclose = () => {
			console.log("DataChannel with", id, "closed")

			if (pc.connectionState == "connected")
				pc.close()
		}

		dc.onmessage = msg => receiveMessage(id, msg)

	})

	socket.on("sdp-answer", (id, sdp) => {
		const pc = peerConnections[id]
		if (!pc)
			return console.error("Received SDP-answer from nonexisting peerConnection")
		
		//Set remote description
		pc.setRemoteDescription(sdp)

		console.log("Received SDP-answer from", id)
	})


	//Add ice candidate from client
	socket.on("icecandidate", (id, candidate) => {
		const pc = peerConnections[id]

		console.log("Received ICE candidate from ", id)
		pc.addIceCandidate(
			//Candidate
			new RTCIceCandidate(candidate),
			
			//On success
			() => {
				console.log("Added ICE candidate succesfully")
			},
			
			//On error
			err => {
				console.error("Error adding ICE candidate:", err)
			}
		)
	})

	/* Broadcast message to all peers */
	function broadcast(msg, exclude) {

		//If we didn't define an author before, we are the author
		if (!msg.author)
			msg.author = "host"

		for (id in dataChannels) {
			const dc = dataChannels[id]
			if (dc.readyState == "open" && id != exclude)
				dc.send(JSON.stringify(msg))
		}
	}

	function receiveMessage(author, messageEvent) {
		const msg = JSON.parse(messageEvent.data)

		//Define the author of the message
		msg.author = author

		console.group("Message received from", author)
		console.log(msg)
		console.groupEnd()

		//Broadcast to all other members
		broadcast(msg, author)

		switch (msg.type) {
			case "chat_message": {
				//Add to dom
				addChatMessage(`${msg.author.substr(0,5)}: ${msg.message}`)
				break
			}
		}

	}

	//Send chatmessage
	const chatInput = document.getElementById("chat-input")
	function sendChatMessage() {

		const message = chatInput.value

		const msg = {
			type: "chat_message",
			message
		}

		broadcast(msg)

		//Add to dom
		addChatMessage("Me: " + message)

		console.log("Sending chat message: ", message)

		chatInput.value = ""

	}

}
