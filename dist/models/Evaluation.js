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
const evaluationSchema = new mongoose_1.Schema({
    school_year: {
        type: String,
        required: true
    },
    anonymous_token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    program_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Program',
        required: true
    },
    year_level: {
        type: String,
        enum: ['1st', '2nd', '3rd', '4th'],
        required: true
    },
    status: {
        type: String,
        enum: ['Regular', 'Irregular', 'Transferee'],
        required: true
    },
    course_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    teacher_id: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    // Teacher ratings (6 criteria)
    teacher_diction: { type: Number, required: true, min: 1, max: 5 },
    teacher_grammar: { type: Number, required: true, min: 1, max: 5 },
    teacher_personality: { type: Number, required: true, min: 1, max: 5 },
    teacher_disposition: { type: Number, required: true, min: 1, max: 5 },
    teacher_dynamic: { type: Number, required: true, min: 1, max: 5 },
    teacher_fairness: { type: Number, required: true, min: 1, max: 5 },
    // Learning process ratings (13 criteria)
    learning_motivation: { type: Number, required: true, min: 1, max: 5 },
    learning_critical_thinking: { type: Number, required: true, min: 1, max: 5 },
    learning_organization: { type: Number, required: true, min: 1, max: 5 },
    learning_interest: { type: Number, required: true, min: 1, max: 5 },
    learning_explanation: { type: Number, required: true, min: 1, max: 5 },
    learning_clarity: { type: Number, required: true, min: 1, max: 5 },
    learning_integration: { type: Number, required: true, min: 1, max: 5 },
    learning_mastery: { type: Number, required: true, min: 1, max: 5 },
    learning_methodology: { type: Number, required: true, min: 1, max: 5 },
    learning_values: { type: Number, required: true, min: 1, max: 5 },
    learning_grading: { type: Number, required: true, min: 1, max: 5 },
    learning_synthesis: { type: Number, required: true, min: 1, max: 5 },
    learning_reasonableness: { type: Number, required: true, min: 1, max: 5 },
    // Classroom management ratings (6 criteria)
    classroom_attendance: { type: Number, required: true, min: 1, max: 5 },
    classroom_policies: { type: Number, required: true, min: 1, max: 5 },
    classroom_discipline: { type: Number, required: true, min: 1, max: 5 },
    classroom_authority: { type: Number, required: true, min: 1, max: 5 },
    classroom_prayers: { type: Number, required: true, min: 1, max: 5 },
    classroom_punctuality: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String, default: '' },
    ip_address: { type: String },
    submitted_at: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'evaluations'
});
const Evaluation = mongoose_1.default.model('Evaluation', evaluationSchema);
exports.default = Evaluation;
//# sourceMappingURL=Evaluation.js.map