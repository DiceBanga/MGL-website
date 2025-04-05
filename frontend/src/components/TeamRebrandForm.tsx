import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { storageService } from '../services/StorageService';
import { PaymentService } from '../services/PaymentService';
import { ItemService, Item } from '../services/ItemService';
import { PaymentDetails } from '../types/payment';

interface TeamRebrandFormProps {
  teamId: string;
  userId: string;
  currentName: string;
  onCancel: () => void;
  onSuccess: (response: any) => void;
}

// Create instances of services
const itemService = new ItemService();
const paymentService = new PaymentService();

const TeamRebrandForm: React.FC<TeamRebrandFormProps> = ({
  teamId,
  userId,
  currentName,
  onCancel,
  onSuccess
}) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newTeamName, setNewTeamName] = useState(currentName);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rebrandItemId, setRebrandItemId] = useState<string | null>(null);
  const [rebrandItemCode, setRebrandItemCode] = useState<string | null>(null);
  const [rebrandPrice, setRebrandPrice] = useState<number>(20); // Default price
  const [errors, setErrors] = useState<{
    teamName?: string;
    logo?: string;
    terms?: string;
    system?: string;
  }>({});

  // Fetch item ID and price on component mount
  useEffect(() => {
    const fetchItemData = async () => {
      try {
        console.log('Attempting to fetch Team Rebrand item data...');
        
        // Try exact match first
        let item = await itemService.getItemByName('Team Rebrand');
        
        // If that fails, try getting all items and find manually
        if (!item) {
          console.log('Exact match failed, trying to fetch all items');
          const allItems = await itemService.getAllItems();
          console.log('All items:', allItems);
          
          item = allItems.find(i => 
            i.item_name.toLowerCase() === 'team rebrand' || 
            i.item_id === '1006'
          ) || null;
        }
        
        if (item) {
          setRebrandItemId(item.id);
          setRebrandItemCode(item.item_id);
          setRebrandPrice(item.current_price);
          console.log(`Team Rebrand item found: ID=${item.id}, Code=${item.item_id}, Price=${item.current_price}`);
        } else {
          console.error('Team Rebrand item not found in the database - using hardcoded values');
          
          // Fallback to hardcoded values
          setRebrandItemId('2f151e9f-7b81-4104-a842-32c9ead204ad');
          setRebrandItemCode('1006');
          setRebrandPrice(20);
          
          setErrors(prev => ({ 
            ...prev, 
            system: 'Using fallback pricing. Contact support if issues persist.' 
          }));
        }
      } catch (error) {
        console.error('Error fetching item data:', error);
        
        // Fallback to hardcoded values
        setRebrandItemId('2f151e9f-7b81-4104-a842-32c9ead204ad');
        setRebrandItemCode('1006');
        setRebrandPrice(20);
        
        setErrors(prev => ({ 
          ...prev, 
          system: 'Could not load pricing. Using fallback values.' 
        }));
      }
    };

    fetchItemData();
  }, []);

  // Handle team name input change
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewTeamName(e.target.value);
    // Clear error when user starts typing
    if (errors.teamName) {
      setErrors({ ...errors, teamName: undefined });
    }
  };

  // Handle logo file selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (!file) return;
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, logo: 'Logo image must be less than 2MB' });
      return;
    }
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setErrors({ ...errors, logo: 'Only PNG, JPG, and SVG files are allowed' });
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setLogoFile(file);
    setErrors({ ...errors, logo: undefined });
  };

  // Handle terms checkbox change
  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermsAccepted(e.target.checked);
    if (errors.terms) {
      setErrors({ ...errors, terms: undefined });
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: {
      teamName?: string;
      logo?: string;
      terms?: string;
      system?: string;
    } = {};
    
    if (!newTeamName || newTeamName.trim().length < 3) {
      newErrors.teamName = 'Team name must be at least 3 characters';
    }
    
    if (newTeamName.trim().length > 30) {
      newErrors.teamName = 'Team name must be less than 30 characters';
    }
    
    if (!termsAccepted) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    if (!rebrandItemId || !rebrandItemCode) {
      newErrors.system = 'System error: Missing item information';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload logo if provided
      let logoUrl = null;
      if (logoFile) {
        const uploadResult = await storageService.uploadTeamLogo(logoFile, teamId);
        
        if (uploadResult.error) {
          throw new Error(`Logo upload failed: ${uploadResult.error}`);
        }
        
        logoUrl = uploadResult.publicUrl;
      }
      
      // Generate a unique request ID
      const requestId = crypto.randomUUID();
      
      // Create rebrand request
      const requestData = {
        request_id: requestId,
        request_type: 'team_rebrand',
        team_id: teamId,
        requested_by: userId,
        requires_payment: true,
        old_name: currentName,
        new_name: newTeamName.trim(),
        metadata: logoUrl ? { logo_url: logoUrl } : undefined,
        item_id: rebrandItemCode || '1006', // Fallback to the known code if null
        payment_data: {
          amount: rebrandPrice,
          metadata: {
            request_id: requestId,
            request_type: 'team_rebrand',
            team_id: teamId,
            old_name: currentName,
            new_name: newTeamName.trim(),
            logo_url: logoUrl,
            item_id: rebrandItemCode || '1006' // Fallback to the known code if null
          }
        }
      };
      
      console.log('Submitting team rebrand request:', requestData);
      
      // Create payment details for Square integration
      const paymentDetails: PaymentDetails = {
        id: requestId,
        type: 'team_rebrand',
        name: `Team Rebrand: ${currentName} to ${newTeamName.trim()}`,
        amount: rebrandPrice,
        description: `Team rebrand from ${currentName} to ${newTeamName.trim()}`,
        teamId: teamId,
        captainId: userId,
        request_id: requestId,
        item_id: rebrandItemCode || '1006', // Fallback to the known code if null
        referenceId: requestId,
        metadata: {
          logo_url: logoUrl,
          old_name: currentName,
          new_name: newTeamName.trim()
        }
      };
      
      // Initialize payment form
      const paymentService = new PaymentService();
      
      // First create the rebrand request to get it in the system
      const response = await paymentService.createPendingTeamRebrand(requestData);
      console.log('Rebrand request created:', response);
      
      // Now redirect to payment page or handle payment separately
      if (response.payment_url) {
        // If there's a direct payment URL, go there
        navigate(response.payment_url);
        return;
      } else if (response.success) {
        // Otherwise show success and redirect to payment page
        // This could be a redirect to a Square payment page or your own payment form
        navigate(`/payment/${requestId}?type=team_rebrand&amount=${rebrandPrice}`);
        return;
      }
      
      // Otherwise call success directly (for testing/demo purposes)
      onSuccess(response);
    } catch (error) {
      console.error('Error submitting rebrand request:', error);
      setErrors({ ...errors, teamName: (error as Error).message });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle cancel logo upload
  const handleCancelLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-white mb-2">Team Rebrand</h2>
      <p className="text-gray-300 mb-6">Update your team's identity with a new name and logo</p>
      
      {/* System Error Messages */}
      {errors.system && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="flex items-center text-red-500 font-medium">
            <AlertCircle className="w-5 h-5 mr-2" />
            {errors.system}
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Name Input */}
        <div>
          <label htmlFor="team-name" className="block text-sm font-medium text-gray-200 mb-1">
            New Team Name
          </label>
          <input
            id="team-name"
            type="text"
            value={newTeamName}
            onChange={handleNameChange}
            placeholder="Enter New Team Name"
            className={`w-full px-4 py-3 bg-gray-700/50 border ${
              errors.teamName ? 'border-red-500' : 'border-amber-500/30'
            } focus:border-amber-500 focus:ring focus:ring-amber-500/20 rounded-lg text-white placeholder-gray-400 transition-colors duration-200`}
          />
          {errors.teamName && (
            <p className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.teamName}
            </p>
          )}
        </div>
        
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-1">
            Team Logo
          </label>
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <div className={`border-2 border-dashed rounded-lg ${
                errors.logo ? 'border-red-500 bg-red-500/10' : 'border-amber-500/30 bg-gray-700/30 hover:bg-gray-700/50'
              } transition-colors duration-200 cursor-pointer p-4`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg"
                  onChange={handleLogoSelect}
                  className="hidden"
                  id="logo-upload"
                />
                <label 
                  htmlFor="logo-upload" 
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-amber-500 mb-2" />
                  <p className="text-center text-sm font-medium text-white mb-1">
                    Upload New Logo
                  </p>
                  <p className="text-center text-xs text-gray-400">
                    PNG, JPG, or SVG (max 2MB)
                  </p>
                </label>
              </div>
              {errors.logo && (
                <p className="mt-1 text-sm text-red-500 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.logo}
                </p>
              )}
            </div>
            
            {/* Logo Preview */}
            {logoPreview && (
              <div className="w-32 h-32 relative flex-shrink-0">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-contain rounded-lg border border-amber-500/30"
                />
                <button
                  type="button"
                  onClick={handleCancelLogo}
                  className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 text-gray-400 hover:text-white"
                  aria-label="Remove logo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Pricing Information */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <CreditCard className="w-5 h-5 text-amber-500 mr-2" />
            <h3 className="text-lg font-medium text-white">${rebrandPrice || 20} - Team Rebrand Package</h3>
          </div>
          <ul className="text-sm text-gray-300 space-y-1 ml-7">
            <li className="flex items-start">
              <Check className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Team name change</span>
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Team logo update</span>
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>All tournament & league listings updated</span>
            </li>
            <li className="flex items-start">
              <Check className="w-4 h-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>Social media announcement of rebrand</span>
            </li>
          </ul>
        </div>
        
        {/* Terms and Conditions */}
        <div>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={handleTermsChange}
                className="w-4 h-4 bg-gray-700 border-amber-500/50 rounded focus:ring-amber-500 text-amber-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="font-medium text-gray-300">
                I agree to the <a href="/terms" target="_blank" className="text-amber-500 hover:text-amber-400">Terms & Conditions</a> and <a href="/privacy" target="_blank" className="text-amber-500 hover:text-amber-400">Privacy Policy</a>
              </label>
            </div>
          </div>
          {errors.terms && (
            <p className="mt-1 text-sm text-red-500 flex items-center">
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.terms}
            </p>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex justify-center items-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Continue to Payment'
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamRebrandForm; 