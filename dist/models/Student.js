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
const studentSchema = new mongoose_1.Schema({
    student_number: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    full_name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        trim: true
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
    section: {
        type: String
    },
    status: {
        type: String,
        enum: ['Regular', 'Irregular', 'Transferee'],
        default: 'Regular'
    }
}, {
    timestamps: true,
    collection: 'students'
});
const Student = mongoose_1.default.model('Student', studentSchema);
exports.default = Student;
//# sourceMappingURL=Student.js.map