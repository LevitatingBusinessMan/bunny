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
	const peerConnections = {}

	//New member joins
	socket.on("member_join", (id, count) => {
		
		//Create new peer connection
		const pc = new RTCPeerConnection(peerConnectionConfig);
		pc.addStream(mediaStream)

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

}
