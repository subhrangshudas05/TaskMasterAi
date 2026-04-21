import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Global caching for Next.js serverless environment
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function connectToDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: "taskmaster",
      maxPoolSize: 10,             // Don't open more than 10 sockets at once
      serverSelectionTimeoutMS: 5000, // If Atlas is down, fail in 5s (not 10s)
      socketTimeoutMS: 45000,      // Tell Mongoose to close idle sockets gracefully before Atlas kills them
      family: 4,                   // Prefer IPv4 over IPv6
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB Connected');
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}