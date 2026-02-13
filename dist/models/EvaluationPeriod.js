"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const evaluationPeriodSchema = new mongoose_1.Schema({
    academic_year: {
        type: String,
        required: true,
        trim: true
    },
    semester: {
        type: String,
        required: true,
        enum: ['1st Semester', '2nd Semester', 'Summer'],
        trim: true
    },
    is_active: {
        type: Boolean,
        default: false,
        index: true
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'evaluation_periods'
});
// Index for faster queries on active periods
evaluationPeriodSchema.index({ academic_year: 1, semester: 1 });
evaluationPeriodSchema.index({ is_active: 1 });
// Ensure only one active period at a time
evaluationPeriodSchema.pre('save', async function (next) {
    if (this.is_active && this.isModified('is_active')) {
        // Deactivate all other periods
        await mongoose_1.default.model('EvaluationPeriod').updateMany({ _id: { $ne: this._id } }, { $set: { is_active: false } });
    }
    next();
});
const EvaluationPeriod = mongoose_1.default.model('EvaluationPeriod', evaluationPeriodSchema);
exports.default = EvaluationPeriod;
//# sourceMappingURL=EvaluationPeriod.js.map