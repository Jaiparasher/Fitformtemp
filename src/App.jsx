import React, { useEffect, useRef, useState } from 'react';

function App() {
  const videoRef = useRef(null);
  const receivedFrameCanvasRef = useRef(null);
  const [websocket, setWebsocket] = useState(null);
  let frameTimer;

  useEffect(() => {
    // Connect to the WebSocket
    const ws = new WebSocket('ws://3.7.79.22:3001');
    setWebsocket(ws);

    ws.onopen = (event) => {
      console.log('Connected to the server');
    };

    // Function to display received frames
    function displayReceivedFrame(frameData) {
      const blob = new Blob([frameData], { type: 'image/jpeg' });
      const objectURL = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = function () {
        const canvas = receivedFrameCanvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectURL);
      };

      img.src = objectURL;
    }

    ws.onmessage = (event) => {
      displayReceivedFrame(event.data); // Display received frames
    };

    // Clean up the WebSocket connection when the component unmounts
    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    // Access the user's camera
    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        videoRef.current.addEventListener('play', () => {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;

          function sendFrame() {
            if (videoRef.current.paused || videoRef.current.ended) {
              return;
            }

            context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
              blob.arrayBuffer().then((buffer) => {
                if (websocket) {
                  websocket.send(new Uint8Array(buffer));
                }
              });
            }, 'image/jpeg', 1.0);

            // Set a timer to call sendFrame again after a delay
            frameTimer = setTimeout(sendFrame, 1000/15); // Send a frame every 500 milliseconds (2 frames per second)
          }

          sendFrame();
        });
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    initializeCamera();

    // Clean up the frameTimer when the component unmounts
    return () => {
      clearTimeout(frameTimer);
    };
  }, [websocket]);

  return (
    <div>
      <h1>Push-up Counter</h1>
      <video ref={videoRef} autoPlay hidden/>
      <canvas id="receivedFrame" ref={receivedFrameCanvasRef}></canvas>
    </div>
  );
}

export default App;