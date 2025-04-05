import { supabase } from '../lib/supabase';

/**
 * Service for managing file uploads and storage operations using Supabase Storage
 */
export class StorageService {
  /**
   * Upload a team logo to the team-logos bucket
   * @param file - The file to upload
   * @param teamId - The team ID to associate with the logo
   * @returns An object containing the public URL or an error message
   */
  async uploadTeamLogo(file: File, teamId: string): Promise<{ publicUrl?: string; error?: string }> {
    try {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        return { error: 'Logo image must be less than 2MB' };
      }
      
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!validTypes.includes(file.type)) {
        return { error: 'Only PNG, JPG, and SVG files are allowed' };
      }

      // Create a folder structure based on team ID
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const filePath = `${teamId}/${fileName}`;
      
      // Upload the file
      const { data, error } = await supabase.storage
        .from('team-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
        
      if (error) {
        console.error('Upload error:', error);
        // Check for specific errors
        if (error.message?.includes('size')) {
          return { error: 'File exceeds the 2MB size limit' };
        }
        if (error.message?.includes('permission')) {
          return { error: 'You do not have permission to upload logos for this team' };
        }
        return { error: error.message || 'Failed to upload logo' };
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-logos')
        .getPublicUrl(filePath);
        
      return { publicUrl };
    } catch (err) {
      console.error('Error uploading file:', err);
      return { error: 'An unexpected error occurred while uploading the logo' };
    }
  }

  /**
   * Upload a player avatar to the player-avatars bucket
   * @param file - The file to upload
   * @param userId - The user ID to associate with the avatar
   * @returns An object containing the public URL or an error message
   */
  async uploadPlayerAvatar(file: File, userId: string): Promise<{ publicUrl?: string; error?: string }> {
    try {
      // Validate file size (max 1MB for avatars)
      if (file.size > 1 * 1024 * 1024) {
        return { error: 'Avatar image must be less than 1MB' };
      }
      
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        return { error: 'Only PNG and JPG files are allowed for avatars' };
      }

      // Create a folder structure based on user ID
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      const filePath = `${userId}/${fileName}`;
      
      // Upload the file
      const { data, error } = await supabase.storage
        .from('player-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
        
      if (error) {
        console.error('Upload error:', error);
        return { error: error.message || 'Failed to upload avatar' };
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('player-avatars')
        .getPublicUrl(filePath);
        
      return { publicUrl };
    } catch (err) {
      console.error('Error uploading avatar:', err);
      return { error: 'An unexpected error occurred while uploading the avatar' };
    }
  }

  /**
   * Delete a file from a specific bucket
   * @param bucketName - The name of the bucket (e.g., 'team-logos')
   * @param filePath - The path to the file within the bucket
   * @returns An object indicating success or an error message
   */
  async deleteFile(bucketName: string, filePath: string): Promise<{ success?: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
        
      if (error) {
        return { error: error.message || 'Failed to delete file' };
      }
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting file:', err);
      return { error: 'An unexpected error occurred while deleting the file' };
    }
  }

  /**
   * Get a list of files for a specific entity (team or user)
   * @param bucketName - The name of the bucket to search in
   * @param folder - The folder to search in (usually the team ID or user ID)
   * @returns An array of file information objects or an error message
   */
  async listFiles(bucketName: string, folder: string): Promise<{ files?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folder, {
          sortBy: { column: 'created_at', order: 'desc' }
        });
        
      if (error) {
        return { error: error.message || 'Failed to list files' };
      }
      
      // Add public URLs to each file
      const filesWithUrls = data.map(file => {
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(`${folder}/${file.name}`);
          
        return {
          ...file,
          publicUrl
        };
      });
      
      return { files: filesWithUrls };
    } catch (err) {
      console.error('Error listing files:', err);
      return { error: 'An unexpected error occurred while listing files' };
    }
  }

  /**
   * Create a signed URL for temporary access to a private file
   * @param bucketName - The name of the bucket
   * @param filePath - The path to the file
   * @param expiresIn - Seconds until the signed URL expires (default: 60)
   * @returns A signed URL or an error message
   */
  async createSignedUrl(bucketName: string, filePath: string, expiresIn: number = 60): Promise<{ signedUrl?: string; error?: string }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, expiresIn);
        
      if (error) {
        return { error: error.message || 'Failed to create signed URL' };
      }
      
      return { signedUrl: data.signedUrl };
    } catch (err) {
      console.error('Error creating signed URL:', err);
      return { error: 'An unexpected error occurred while creating signed URL' };
    }
  }
}

// Create a singleton instance for use throughout the application
export const storageService = new StorageService(); 