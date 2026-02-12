import mongoose, { Schema, Model } from 'mongoose';
import { IProgram } from '../types';

const programSchema = new Schema<IProgram>({
  name: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true,
    unique: true
  },
  code: {
    type: Schema.Types.Mixed, // Encrypted field
    required: true,
    unique: true
  }
}, {
  timestamps: true,
  collection: 'programs'
});

const Program: Model<IProgram> = mongoose.model<IProgram>('Program', programSchema);

export default Program;
