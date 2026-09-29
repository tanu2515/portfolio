import mongoose from 'mongoose';

export async function connectDB() {
  let uri = process.env.MONGO_URI;
  if (!uri || uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('sgmobiles');
    console.log('Using in-memory MongoDB (data resets on restart)');
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
