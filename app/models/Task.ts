import mongoose, { Schema, Document } from 'mongoose';

// 1. Types for strictness
export type EnergyLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNASSIGNED';
export type TaskType = 'REGULAR' | 'MARATHON';

// 2. The lean TypeScript interface
export interface ITask extends Document {
  userEmail: string; // Matching your Marathon schema style
  title: string;
  type: TaskType;
  category: string;
  isCompleted: boolean;
  date: Date;
  
  // Optional: Only for Regular Tasks
  timeSlot?: string;
  
  // Optional: Only for Marathon Tasks
  marathonId?: mongoose.Types.ObjectId | string; 
  marathonName?: string;
  stepId?: mongoose.Types.ObjectId | string; // <--- 2. Add to Interface
  detail?: string;

  // Push notification state
  reminderSent?: boolean;
  reminderAttempts?: number;
  reminderFailed?: boolean;
  
  nudge20Sent?: boolean;
  nudge20Attempts?: number;
  nudge20Failed?: boolean;
  
  nudge45Sent?: boolean;
  nudge45Attempts?: number;
  nudge45Failed?: boolean;
  
  nudge2hSent?: boolean;
  nudge2hAttempts?: number;
  nudge2hFailed?: boolean;
}

// 3. The Simplified Mongoose Schema
const TaskSchema = new Schema<ITask>({
  userEmail: { type: String, required: true, index: true }, // Indexed for fast queries
  title: { type: String, required: true },
  type: { type: String, enum: ['REGULAR', 'MARATHON'], default: 'REGULAR' },
  category: { type: String, default: 'Personal' },
  isCompleted: { type: Boolean, default: false },
  date: { type: Date, required: true, index: true }, // Indexed because you will query "tasks for today" a lot

  // Regular Task specifics
  timeSlot: { type: String },

  // Marathon Task specifics
  marathonId: { type: Schema.Types.Mixed }, // Mixed allows string or ObjectId
  marathonName: { type: String },
  stepId: { type: Schema.Types.Mixed },
  detail: { type: String },

  // Push notification state
  reminderSent: { type: Boolean, default: false, index: true },
  reminderAttempts: { type: Number, default: 0 },
  reminderFailed: { type: Boolean, default: false },

  nudge20Sent: { type: Boolean, default: false, index: true },
  nudge20Attempts: { type: Number, default: 0 },
  nudge20Failed: { type: Boolean, default: false },

  nudge45Sent: { type: Boolean, default: false, index: true },
  nudge45Attempts: { type: Number, default: 0 },
  nudge45Failed: { type: Boolean, default: false },

  nudge2hSent: { type: Boolean, default: false, index: true },
  nudge2hAttempts: { type: Number, default: 0 },
  nudge2hFailed: { type: Boolean, default: false },

}, { timestamps: true });

// Export the model cleanly
export default mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);