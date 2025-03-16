import React from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'info' | 'success' | 'danger';
  isLoading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning',
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center">
            {type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />}
            {type === 'danger' && <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />}
            {type === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mr-2" />}
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white"
            aria-label="Close"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-300 mb-6">{message}</p>
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-md text-white transition-colors flex items-center ${
                type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : type === 'success'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-green-700 hover:bg-green-600'
              }`}
              disabled={isLoading}
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog; 