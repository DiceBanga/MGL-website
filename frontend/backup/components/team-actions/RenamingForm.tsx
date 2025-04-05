import { useState } from 'react';

interface RenamingFormProps {
  team: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

function RenamingForm({ team, onSubmit, onCancel }: RenamingFormProps) {
  const [newName, setNewName] = useState(team.name);
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName || newName.trim() === '') {
      setError('Team name cannot be empty');
      return;
    }
    
    if (newName === team.name) {
      setError('New name must be different from current name');
      return;
    }
    
    onSubmit({
      old_name: team.name,
      new_name: newName,
      action_type: 'TEAM_REBRAND'
    });
  };
  
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-4">Rebrand Team</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2">Current Team Name</label>
          <input 
            type="text" 
            value={team.name} 
            disabled
            className="w-full p-2 border border-gray-300 rounded bg-gray-100"
          />
        </div>
        
        <div className="mb-4">
          <label className="block mb-2">New Team Name</label>
          <input 
            type="text" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}

export default RenamingForm; 