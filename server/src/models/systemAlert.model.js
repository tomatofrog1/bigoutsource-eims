import mongoose from 'mongoose';

const systemAlertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['MISSING_DEPARTMENT', 'GENERAL'],
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const SystemAlert = mongoose.model('SystemAlert', systemAlertSchema);

export default SystemAlert;
