if (!hosting) {

	//Joined room
	socket.on("joined", success => {
		if (success) {
			console.log("Hash", hash, "exists")
		}
		else {
			console.error("Failed to join", hash)
			location.hash = ""
			location.reload()
		}
	})

	//Define globally
	var mediaStream

	//Single connection to HOST
	var pc = new RTCPeerConnection(peerConnectionConfig)

	//Data channel
	var dc

	//Receive SDP offer, create RTCPeerConnection and answer
	socket.on("sdp-offer", (id, sdp) => {
		console.log("Received SDP offer from host")
		
		//Set SDP
		pc.setRemoteDescription(sdp)
		.then(() => {
			//Create answer
			pc.createAnswer()
			.then(sdpAnswer => {
				pc.setLocalDescription(sdpAnswer)
				socket.emit("sdp-answer", id, sdpAnswer)
				console.log("Replying with SDP answer")
			})
		})

	})

	pc.onicecandidate = event => {
		if (!event.candidate)
			return
		console.log("Sending ICE candidate to host")
		socket.emit("icecandidate", hash, event.candidate)
	}

	//Add ice candidate from host
	socket.on("icecandidate", (id, candidate) => {
		
		//Only trust candidates from the host
		if (id != host)
			return
		
		console.log("Received ICE candidate from host")

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

	pc.onconnectionstatechange =  event => {
		console.log("New connection state:", pc.connectionState)
		
		//Go gather stream
		if (pc.connectionState == "connected") {

			/* Disconnect the socket, we will communicate via host directly */
			socket.disconnect()

			const streams = pc.getRemoteStreams()
			console.log("Gathered streams:", streams)
			mediaStream = streams[0]
			video.srcObject = mediaStream
			video.play()
		}
	}

	pc.ondatachannel = event => {
		console.log("Received DataChannel")
		dc = event.channel

		dc.onopen = console.log("DataChannel opened")
		dc.onerror = err => console.err("DataChannel error:", err)	

		dc.onmessage = receiveMessage

	}

	function receiveMessage(messageEvent) {
		const msg = JSON.parse(messageEvent.data)

		console.group("Message received from", msg.author)
		console.log(msg)
		console.groupEnd()

		switch (msg.type) {
			case "member_join":
				console.group("Member joined")
				console.log("ID:", msg.id)
				console.log("Total members:", msg.member_count)
				console.groupEnd()
				break
			case "member_leave":
				console.group("Member left")
				console.log("ID:", msg.id)
				console.log("Total members:", msg.member_count)
				console.groupEnd()
				break
			case "chat_message":
				console.log(msg)
				//Add to dom
				addChatMessage(`${msg.author.substr(0,5)}: ${msg.message}`)
				break
		}

	}

	//TODO create function that wraps dc.send that logs, but also adds IDs to message to confirm their arrival

	//Send chatmessage
	const chatInput = document.getElementById("chat-input")
	function sendChatMessage() {

		const message = chatInput.value

		const msg = {
			type: "chat_message",
			message
		}

		dc.send(JSON.stringify(msg))

		//Add to dom
		addChatMessage("Me: " + message)

		console.log("Sending chat message: ", message)

		chatInput.value = ""
	}

}
