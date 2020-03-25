if (!hosting) {

	//Define globally
	var mediaStream

	//Single connection to HOST
	var pc = new RTCPeerConnection(peerConnectionConfig)

	//Data channel for chat
	var chat

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
		socket.emit("icecandidate", host, event.candidate)
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
		if (pc.connectionState == "connected" && !hosting) {
			const streams = pc.getRemoteStreams()
			console.log("Gathered streams:", streams)
			mediaStream = streams[0]
			video.srcObject = mediaStream
			video.play()
		}
	}

	pc.ondatachannel = event => {
		console.log("Received DataChannel")
		chat = event.channel
		
		//Chat events
		chat.onopen = () => addChatMessage("Opened datachannel", true)
		
		/* The messageData send from client -> host is the raw message
		the messageData send form host -> client is JSON data (to include the og author) */
		
		chat.onmessage = messageEvent => {
			msgData = JSON.parse(messageEvent.data)
			addChatMessage(`${msgData.author.substr(0,4)}: ${msgData.msg}`)
		}
		chat.onerror = console.err
	}

	//Send chatmessage
	const chatInput = document.getElementById("chat-input")
	function sendChatMessage() {
		const msg = chatInput.value;
		
		//Add to dom
		addChatMessage("Me: " + msg)
		
		chat.send(msg)
		chatInput.value = ""
		console.log("Sending chat message: ", msg)
	}

}
