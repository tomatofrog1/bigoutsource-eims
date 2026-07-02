import { io } from 'socket.io-client';

const socket = io('http://localhost:5001', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected to socket server');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Connection timed out');
  process.exit(1);
}, 3000);
