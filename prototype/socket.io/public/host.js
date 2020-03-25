if (hosting) {

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
	var peerConnections = {}, chatDataChannels = {}

	//New member joins
	socket.on("member_join", (id, count) => {
		
		//Create new peer connection
		const pc = new RTCPeerConnection(peerConnectionConfig);
		pc.addStream(mediaStream)

		//Open datachannel for chat messages
		const chat = pc.createDataChannel("chat")
		chatDataChannels[id] = chat

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
		
		//Handle chat events
		chat.onopen = () => addChatMessage("Opened datachannel with " + id, true)
		chat.onmessage = messageEvent => {
			//Add to DOM
			addChatMessage(`${id.substr(0,4)}: ${messageEvent.data}`)

			//Send to all other clients
			forwardChetMesage(id, messageEvent.data)
		}
		chat.onerror = console.err

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

	/* The messageData send from client -> host is the raw message
	the messageData send form host -> client is JSON data (to include the og author) */

	//Send chatmessage
	const chatInput = document.getElementById("chat-input")
	function sendChatMessage() {

		//Add to dom
		addChatMessage("Me: " + chatInput.value)

		const msgData = {
			author: "Host",
			msg: chatInput.value
		}

		for (id in chatDataChannels) {
			chatDataChannels[id].send(JSON.stringify(msgData))
		}
		chatInput.value = ""

	}

	function forwardChetMesage(id, msg) {
		const msgData = {
			author: id,
			msg : msg
		}

		for (id_ in chatDataChannels) {
			if (id == id_)
				continue
			chatDataChannels[id_].send(JSON.stringify(msgData))
		}
	}

}
