const preview = document.querySelector('#camera-preview');
const startCamera = document.querySelector('#start-camera');
const startBroadcast = document.querySelector('#start-broadcast');
const stopCamera = document.querySelector('#stop-camera');
const status = document.querySelector('#camera-status');
let mediaStream;
let peerConnection;

function setStatus(message) { status.textContent = message; }

async function openCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
    preview.srcObject = mediaStream;
    startBroadcast.disabled = !window.liveCameraConfig.ingestUrl;
    stopCamera.disabled = false;
    setStatus(window.liveCameraConfig.ingestUrl ? 'Camera ready. Start the approved venue broadcast when the arena is set.' : 'Camera preview ready. The administrator has not configured a broadcast ingest endpoint.');
  } catch (error) { setStatus(`Camera could not be opened: ${error.message}`); }
}

async function startWhipBroadcast() {
  try {
    peerConnection = new RTCPeerConnection();
    mediaStream.getTracks().forEach((track) => peerConnection.addTrack(track, mediaStream));
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    const response = await fetch(window.liveCameraConfig.ingestUrl, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp });
    if (!response.ok) throw new Error(`Broadcast provider returned ${response.status}`);
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: await response.text() });
    startBroadcast.disabled = true;
    setStatus('Venue broadcast is connected. Visitors can watch through the Live page.');
  } catch (error) { setStatus(`Broadcast could not start: ${error.message}`); }
}

function closeCamera() {
  peerConnection?.close();
  peerConnection = null;
  mediaStream?.getTracks().forEach((track) => track.stop());
  mediaStream = null;
  preview.srcObject = null;
  startBroadcast.disabled = true;
  stopCamera.disabled = true;
  setStatus('Camera stopped.');
}

startCamera?.addEventListener('click', openCamera);
startBroadcast?.addEventListener('click', startWhipBroadcast);
stopCamera?.addEventListener('click', closeCamera);
window.addEventListener('beforeunload', closeCamera);
