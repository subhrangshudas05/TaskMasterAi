import mongoose, { Schema, Document } from 'mongoose';

// 1. The leanest possible TypeScript interface
export interface IMarathon extends Document {
  userEmail: string; // Just the email, nice and easy
  title: string;
  category: string;
  deadline: string;  
  status: 'active' | 'completed' | 'paused';
  steps: {
    day: number;
    title: string;
    detail: string;
    estimatedMinutes: number;
    isCompleted: boolean;
    completedAt: Date | null;
  }[];
}

// 2. The Simplified Mongoose Schema
const MarathonSchema = new Schema<IMarathon>({
  userEmail: { type: String, required: true, index: true }, // Indexed for fast home screen fetching
  title: { type: String, required: true },
  category: { type: String, default: 'Personal' },
  deadline: { type: String, required: true }, // e.g. "1 month 3 weeks"
  status: { type: String, default: 'active' },
  
  // 3. We define the steps right inside the main schema (No separate StepSchema needed)
  steps: [{
    day: { type: Number, required: true },
    title: { type: String, required: true },
    detail: { type: String },
    estimatedMinutes: { type: Number, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  }],
}, { timestamps: true }); // Automatically handles createdAt and updatedAt

// Export the model cleanly
export default mongoose.models.Marathon || mongoose.model<IMarathon>('Marathon', MarathonSchema);