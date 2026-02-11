import mongoose, { Schema, Model } from 'mongoose';
import { IProgram } from '../types';

const programSchema = new Schema<IProgram>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  }
}, {
  timestamps: true,
  collection: 'programs'
});

const Program: Model<IProgram> = mongoose.model<IProgram>('Program', programSchema);

export default Program;
