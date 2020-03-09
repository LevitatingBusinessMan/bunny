const peerConnectionConfig = {
	iceServers: [{
		urls: "stun:stun.l.google.com:19302"
	}]
}

const signalServer = "http://localhost:4343"

const displayMediaConfig = {
	audio: {
		autoGainControl: false,
		echoCancellation: false,
		noiseSuppression: false,
		sampleSize: 16,
		sampleRate: 8000
	},
	video:true
}
