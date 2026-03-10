import React, { useState, useEffect } from 'react';
import { Loader, User, Mail, Briefcase, Shield, Calendar, FileSignature } from 'lucide-react';
import axios from 'axios';
import TeacherNavbar from '../../components/TeacherNavbar';
import SignatureUpload from '../../components/SignatureUpload';

interface TeacherProfile {
  _id: string;
  full_name: string;
  employee_id: string;
  username: string;
  email: string;
  department: string;
  status: string;
  signature_filename: string | null;
  signature_uploaded_at: string | null;
  last_login: string;
}

const TeacherProfile: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<TeacherProfile | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/teacher/profile', {
        withCredentials: true,
      });

      if (response.data.success) {
        setProfile(response.data.profile);
      } else {
        setError(response.data.message || 'Failed to load profile');
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUploadSuccess = (signature: { filename: string; uploaded_at: string }) => {
    if (profile) {
      setProfile({
        ...profile,
        signature_filename: signature.filename,
        signature_uploaded_at: signature.uploaded_at,
      });
    }
  };

  const handleDeleteSuccess = () => {
    if (profile) {
      setProfile({
        ...profile,
        signature_filename: null,
        signature_uploaded_at: null,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Loader className="mx-auto text-green-600 mb-4 animate-spin" size={48} />
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TeacherNavbar />
        <div className="container mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <p className="font-semibold">Error</p>
            <p>{error || 'Failed to load profile'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeacherNavbar />

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and e-signature</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <User size={24} className="text-green-600" />
                Account Information
              </h2>

              <div className="space-y-5">
                {/* Full Name */}
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                  <User size={20} className="text-gray-400 mt-1" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                    <p className="text-gray-800 font-medium">{profile.full_name}</p>
                  </div>
                </div>

                {/* Employee ID */}
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                  <Briefcase size={20} className="text-gray-400 mt-1" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600">Employee ID</label>
                    <p className="text-gray-800 font-medium">{profile.employee_id}</p>
                  </div>
                </div>

                {/* Username */}
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                  <Shield size={20} className="text-gray-400 mt-1" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600">Username</label>
                    <p className="text-gray-800 font-medium">{profile.username}</p>
                  </div>
                </div>

                {/* Email */}
                {profile.email && (
                  <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                    <Mail size={20} className="text-gray-400 mt-1" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-800 font-medium">{profile.email}</p>
                    </div>
                  </div>
                )}

                {/* Department */}
                {profile.department && (
                  <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                    <Briefcase size={20} className="text-gray-400 mt-1" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-600">Department</label>
                      <p className="text-gray-800 font-medium">{profile.department}</p>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="flex items-start gap-3 pb-4 border-b border-gray-200">
                  <Shield size={20} className="text-gray-400 mt-1" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600">Status</label>
                    <p className="text-gray-800 font-medium">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm ${
                          profile.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Last Login */}
                {profile.last_login && (
                  <div className="flex items-start gap-3">
                    <Calendar size={20} className="text-gray-400 mt-1" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-600">Last Login</label>
                      <p className="text-gray-800 font-medium">
                        {new Date(profile.last_login).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  <strong>Note:</strong> To update your profile information, please contact the system administrator.
                </p>
              </div>
            </div>
          </div>

          {/* E-Signature Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <FileSignature size={24} className="text-green-600" />
                E-Signature
              </h2>

              <SignatureUpload
                currentSignature={
                  profile.signature_filename && profile.signature_uploaded_at
                    ? {
                        filename: profile.signature_filename,
                        uploaded_at: profile.signature_uploaded_at,
                      }
                    : null
                }
                onUploadSuccess={handleUploadSuccess}
                onDeleteSuccess={handleDeleteSuccess}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherProfile;
