import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

const prisma = new PrismaClient();
const JWT_SECRET = 'bigoutsource-eims-super-secret-key-2024';

async function test() {
  const user = await prisma.userProfile.findFirst({ where: { status: 'active' } });
  if (!user) {
    console.log('No active users found');
    process.exit(1);
  }
  
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  console.log(`Testing socket for ${user.email}...`);

  const socket = io('http://localhost:5001', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected! Emitting presence:request_sync...');
    socket.emit('presence:request_sync');
  });

  socket.on('presence:sync', (data) => {
    console.log('SUCCESS! presence:sync received:', data);
    process.exit(0);
  });

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });

  setTimeout(() => {
    console.error('Timeout waiting for presence:sync');
    process.exit(1);
  }, 3000);
}

test();
