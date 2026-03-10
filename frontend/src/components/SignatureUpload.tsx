import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Check, Loader, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface SignatureUploadProps {
  currentSignature?: {
    filename: string;
    uploaded_at: string;
  } | null;
  onUploadSuccess: (signature: { filename: string; uploaded_at: string }) => void;
  onDeleteSuccess: () => void;
}

const SignatureUpload: React.FC<SignatureUploadProps> = ({
  currentSignature,
  onUploadSuccess,
  onDeleteSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only PNG and JPEG images are allowed.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 2MB.';
    }
    return null;
  };

  const handleFileChange = (selectedFile: File) => {
    setError('');
    setSuccess('');

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('signature', file);

      const response = await axios.post('/api/teacher/profile/signature', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true,
      });

      if (response.data.success) {
        setSuccess('Signature uploaded successfully!');
        setFile(null);
        setPreview(null);
        onUploadSuccess(response.data.signature);
      } else {
        setError(response.data.message || 'Upload failed.');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to upload signature.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your signature? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.delete('/api/teacher/profile/signature', {
        withCredentials: true,
      });

      if (response.data.success) {
        setSuccess('Signature deleted successfully.');
        onDeleteSuccess();
      } else {
        setError(response.data.message || 'Delete failed.');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to delete signature.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleClearPreview = () => {
    setFile(null);
    setPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Error/Success Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          <AlertCircle size={18} />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          <Check size={18} />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Current Signature Display */}
      {currentSignature && !file && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Signature</h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Uploaded on: {new Date(currentSignature.uploaded_at).toLocaleDateString()}
              </p>
              <img
                src={`/api/uploads/signatures/${currentSignature.filename}`}
                alt="Current signature"
                className="mt-2 max-w-xs border border-gray-300 rounded bg-white p-2"
                style={{ maxHeight: '100px' }}
              />
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {deleting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Deleting...
                </>
              ) : (
                <>
                  <X size={16} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          {currentSignature ? 'Replace Signature' : 'Upload Signature'}
        </h4>

        {/* Drag & Drop Zone */}
        {!preview && (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-600 mb-2">
              Drag and drop your signature image here, or
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Browse Files
            </button>
            <p className="text-xs text-gray-500 mt-3">
              PNG or JPEG, max 2MB, recommended size: 400x150px
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handleInputChange}
              className="hidden"
            />
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Preview</p>
                <p className="text-xs text-gray-500">{file?.name}</p>
              </div>
              <button
                onClick={handleClearPreview}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <img
              src={preview}
              alt="Signature preview"
              className="max-w-full border border-gray-200 rounded bg-gray-50 p-2"
              style={{ maxHeight: '150px' }}
            />
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Signature
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> Your signature will be used to sign evaluation reports. Make sure
          it's clear and professional. You can replace it anytime.
        </p>
      </div>
    </div>
  );
};

export default SignatureUpload;
