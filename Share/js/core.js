	'use strict';

	//try to use google stun servers
	var iceServers = [{
        'urls': [
			'stun:stun3.l.google.com:19305',
			'stun:stun4.l.google.com:19305',
			'stun:stun.l.google.com:19305',
			'stun:stun1.l.google.com:19302',
			'stun:stun2.l.google.com:19305',
			'stun:stun2.l.google.com:19302',
			'stun:stun4.l.google.com:19302',
			'stun:stun.l.google.com:19302',
			'stun:stun1.l.google.com:19305',
			'stun:stun3.l.google.com:19302',
        ]
	}];
	iceServers = {
		iceServers: iceServers,
		iceTransportPolicy: 'all',
		bundlePolicy: 'max-bundle',
		iceCandidatePoolSize: 0
	};
	if (window.chrome) { //if chrome
		iceServers = {
			iceServers: iceServers.iceServers
		};
	}

	const SIGNALING_SERVER = "https://nodesocket.jitbit.com/";

	let _stream;
	const _room = location.hash.replace('#', '');
	const _socket = io(SIGNALING_SERVER)
		.emit("join", _room);
    
	_socket.on('join', function () { initBroadcasting(); }); //listener has joined, start session

	const startButton = document.getElementById('startButton');
	const hangupButton = document.getElementById('hangupButton');
	const copyLinkBtn = document.getElementById('copyLinkBtn');
	startButton.addEventListener('click', start);
	hangupButton.addEventListener('click', hangup);
	copyLinkBtn.addEventListener('click', copyLink);

	const _localVideo = document.getElementById('localVideo');

	let pc1;
	let pc2;
	const offerOptions = {
		offerToReceiveAudio: 0,
		offerToReceiveVideo: 1
	};

	function getName(pc) {
		return (pc === pc1) ? 'pc1' : 'pc2';
	}

	async function start() {
		startButton.style.display= 'none';
		localVideo.style.display = copyLinkBtn.style.display = hangupButton.style.display = '';
		try {
			if(navigator.mediaDevices.getDisplayMedia) {
				_stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            }
            else if(navigator.getDisplayMedia) {
				_stream = await navigator.getDisplayMedia({ video: true });
            }
			console.log('Received local stream');
			_localVideo.srcObject = _stream;

			displayStatus("Waiting for someone to join (give them the current URL)...");
		} catch (e) {
			alert(`getUserMedia() error: ${e.name}`);
		}
	}

	function displayStatus(msg) {
		document.getElementById("statusMsg").style.display = '';
		document.getElementById("statusMsg").innerText = msg;
	}

	async function initBroadcasting() {
		displayStatus("Someone's trying to join");

		hangupButton.disabled = false;
		console.log('Starting call');

		pc1 = new RTCPeerConnection(iceServers);
		console.log('Created local peer connection object pc1');
		pc1.addEventListener('icecandidate', e => onIceCandidate(e, 'pc1'));
		pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));

		_stream.getTracks().forEach(track => pc1.addTrack(track, _stream));
		console.log('Added local stream to pc1');

		try {
			console.log('pc1 createOffer start');
			const offer = await pc1.createOffer(offerOptions);
			await onCreateOfferSuccess(offer);
		} catch (e) {
			console.log(`Failed to create session description: ${e.toString()}`);
		}
	}

	async function onCreateOfferSuccess(desc) {
		console.log('pc1 setLocalDescription start');
		try {
			await pc1.setLocalDescription(desc);
		} catch (e) {
			onSetSessionDescriptionError();
		}

		_socket.emit("readyToBroadcast", desc); //initReceiving(desc);
	}

	_socket.on('readyToBroadcast', function (desc) { initReceiving(desc); })

	async function initReceiving(desc) {
		copyLinkBtn.style.display = startButton.style.display = 'none';
		localVideo.style.display = '';
		pc2 = new RTCPeerConnection(iceServers);
		console.log('Created remote peer connection object pc2');
		pc2.addEventListener('icecandidate', e => onIceCandidate(e, 'pc2'));
		pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e));
		pc2.addEventListener('track', gotRemoteStream);

		console.log('pc2 setRemoteDescription start');
		try {
			await pc2.setRemoteDescription(desc);
		} catch (e) {
			onSetSessionDescriptionError();
		}

		console.log('pc2 createAnswer start');
		try {
			const answer = await pc2.createAnswer();
			await onCreateAnswerSuccess(answer);
		} catch (e) {
			onCreateSessionDescriptionError(e);
		}
	}

	function onSetSessionDescriptionError(error) {
		console.log(`Failed to set session description: ${error.toString()}`);
	}

	function gotRemoteStream(e) {
		_localVideo.controls = _localVideo.autoplay = _localVideo.playsinline = _localVideo.controls = true;
		if (_localVideo.srcObject !== e.streams[e.streams.length-1]) {
			_localVideo.srcObject = e.streams[e.streams.length-1];
			console.log('pc2 received remote stream');
		}
	}

	async function onCreateAnswerSuccess(desc) {
		console.log('pc2 setLocalDescription start');
		try {
			await pc2.setLocalDescription(desc);
			_socket.emit("readyToReceive", desc); //startBroadcasting(desc);
		} catch (e) {
			onSetSessionDescriptionError(e);
		}
	}
	_socket.on('readyToReceive', function (desc) { startBroadcasting(desc); });

	async function startBroadcasting(desc) {
		displayStatus("Broadcasting");
		console.log('pc1 setRemoteDescription start');
		try {
			await pc1.setRemoteDescription(desc);
		} catch (e) {
			onSetSessionDescriptionError(e);
		}
	}

	async function onIceCandidate(event, type) {
		_socket.emit("ice", {
			type: type,
			candidate: JSON.stringify(event.candidate)
		});
	}

	_socket.on('ice', async function (data) {
		if (data.type == 'pc1')
			await pc2.addIceCandidate(JSON.parse(data.candidate));
		else if (data.type == 'pc2')
			await pc1.addIceCandidate(JSON.parse(data.candidate));
	});

	function onIceStateChange(pc, event) {
		if (pc) {
			console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
			console.log('ICE state change event: ', event);
		}
	}

	function hangup() {
		console.log('Ending call');
		if(pc1) pc1.close();
		if(pc2) pc2.close();
		pc1 = null;
		pc2 = null;
		if (_stream) {
			_stream.getTracks().forEach(function (track) {
				track.stop();
			});
		}
		_localVideo.srcObject = null;
		_socket.close();
		displayStatus("Finished");
	}

	function copyLink() {
		ClipboardClass.copyText(document.location.href);
	}

	window.addEventListener("beforeunload", hangup);

	// Clipboard polyfill (stupid safari)
	var ClipboardClass = (function () {
		function copyText(text) {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(text);
				return;
			}

			// Create temp element off-screen to hold text.
			var tempElem = $('<textarea style="position: absolute; top: -8888px; left: -8888px">');
			$("body").append(tempElem);
			tempElem.val(text).select();
			document.execCommand("copy");
			tempElem.remove();
		}
		return {
			copyText: copyText
		};
	})();
