import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.userProfile.findFirst();
  if (!user) {
    console.log('No users found');
    return;
  }
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'bigoutsource-eims-super-secret-key-2024');
  console.log('Testing connection with token for', user.email);

  const socket = io('http://localhost:5001', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Successfully connected!');
    socket.emit('presence:request_sync');
  });

  socket.on('presence:sync', (data) => {
    console.log('Received presence:sync!', data);
    process.exit(0);
  });

  socket.on('connect_error', (err) => {
    console.error('Connection error:', err.message);
    process.exit(1);
  });
}
test();
