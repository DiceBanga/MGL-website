import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  User, 
  Trophy, 
  Calendar, 
  Shield, 
  Edit, 
  Upload,
  X,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { storageService } from '../../services/StorageService';

interface UserProfileProps {
  // Add any props if needed
}

const UserProfile: React.FC<UserProfileProps> = () => {
  const { userId } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Avatar upload state
  const [isUploading, setIsUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchUserProfile();
  }, [userId]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentId = session?.user?.id || null;
      setCurrentUserId(currentId);
      setIsCurrentUser(currentId === userId);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchUserProfile = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams:team_players(
            team_id,
            role,
            teams:teams(name, logo_url)
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle avatar file selection
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (!file) return;
    
    // Clear previous states
    setUploadError(null);
    setUploadSuccess(false);
    
    // Validate file size (max 1MB)
    if (file.size > 1 * 1024 * 1024) {
      setUploadError('Avatar image must be less than 1MB');
      return;
    }
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only PNG and JPG files are allowed');
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setAvatarFile(file);
  };

  // Handle avatar upload
  const handleAvatarUpload = async () => {
    if (!avatarFile || !currentUserId) return;
    
    setIsUploading(true);
    setUploadError(null);
    
    try {
      const uploadResult = await storageService.uploadPlayerAvatar(avatarFile, currentUserId);
      
      if (uploadResult.error) {
        setUploadError(uploadResult.error);
        return;
      }
      
      // Update the user profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          avatar_url: uploadResult.publicUrl,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', currentUserId);
      
      if (updateError) {
        throw updateError;
      }
      
      // Show success message and update local state
      setUploadSuccess(true);
      setProfile((prev: any) => ({...prev, avatar_url: uploadResult.publicUrl}));
      
      // Clear the preview and file after 2 seconds
      setTimeout(() => {
        setAvatarFile(null);
        setAvatarPreview(null);
        setUploadSuccess(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error updating avatar:', error);
      setUploadError('Failed to update profile with new avatar');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle cancel avatar upload
  const handleCancelUpload = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-gray-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white">User Not Found</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Overview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="bg-blue-500/10 p-4 rounded-full">
                      <User className="w-8 h-8 text-blue-500" />
                    </div>
                  )}
                  
                  {/* Edit avatar button for current user */}
                  {isCurrentUser && !avatarPreview && (
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 cursor-pointer hover:bg-blue-600 transition-colors"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".png,.jpg,.jpeg"
                        onChange={handleAvatarSelect}
                        className="hidden"
                        id="avatar-upload"
                        aria-label="Upload profile picture"
                        title="Upload profile picture"
                      />
                      <Edit className="w-3 h-3 text-white" />
                    </label>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{profile.display_name}</h2>
                  <p className="text-gray-400">{profile.title || 'Player'}</p>
                </div>
              </div>
              
              {/* Avatar Upload Preview */}
              {avatarPreview && (
                <div className="mb-6 bg-gray-700/50 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-24 h-24">
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-full h-full object-cover rounded-lg border border-blue-500/30"
                      />
                      <button
                        type="button"
                        onClick={handleCancelUpload}
                        className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-gray-400 hover:text-white"
                        aria-label="Cancel upload"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-white mb-2">Update Profile Picture</h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleAvatarUpload}
                          disabled={isUploading}
                          className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelUpload}
                          disabled={isUploading}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      
                      {uploadError && (
                        <p className="mt-2 text-sm text-red-500 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {uploadError}
                        </p>
                      )}
                      
                      {uploadSuccess && (
                        <p className="mt-2 text-sm text-green-500 flex items-center">
                          <Check className="w-4 h-4 mr-1" />
                          Avatar updated successfully!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Trophy className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-300">Tournaments</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {profile.tournaments_played || 0}
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-300">Joined</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <span className="text-gray-300">Status</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {profile.status || 'Active'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold text-white mb-3">Bio</h3>
                <p className="text-gray-300">
                  {profile.bio || 'This player has not added a bio yet.'}
                </p>
              </div>
            </div>

            {/* User Stats */}
            <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Wins</p>
                  <p className="text-2xl font-bold text-white">{profile.wins || 0}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Losses</p>
                  <p className="text-2xl font-bold text-white">{profile.losses || 0}</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {profile.wins || profile.losses ? 
                      `${Math.round((profile.wins / (profile.wins + profile.losses)) * 100)}%` : 
                      'N/A'}
                  </p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">MVPs</p>
                  <p className="text-2xl font-bold text-white">{profile.mvps || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Teams */}
          <div>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-6">Teams</h2>
              {profile.teams && profile.teams.length > 0 ? (
                <div className="space-y-4">
                  {profile.teams.map((teamData: any) => (
                    <div
                      key={teamData.team_id}
                      className="bg-gray-700/50 rounded-lg p-4"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="bg-blue-500/10 p-2 rounded-full">
                          {teamData.teams?.logo_url ? (
                            <img 
                              src={teamData.teams.logo_url} 
                              alt={teamData.teams.name} 
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <Shield className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-white">{teamData.teams?.name || 'Unknown Team'}</p>
                          <p className="text-sm text-gray-400">
                            {teamData.role.charAt(0).toUpperCase() + teamData.role.slice(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">
                  This player is not a member of any teams.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;