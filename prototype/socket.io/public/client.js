if (!hosting) {

	//Define globally
	var mediaStream

	//Single connection to HOST
	var pc = new RTCPeerConnection(peerConnectionConfig)

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
		console.log("Sending ICE candidate to host")
		socket.emit("icecandidate", host, event.candidate)
	}

	//Add ice candidate from host
	socket.on("icecandidate", (id, candidate) => {
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

}
