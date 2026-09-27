import mongoose, { Schema, model, models } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    image: { type: String },
    notificationPermission: {
      type: String,
      enum: ['default', 'granted', 'denied'],
      default: 'default'
    }
  },
  { timestamps: true }
);

const User = models.User || model('User', userSchema);

export default User;