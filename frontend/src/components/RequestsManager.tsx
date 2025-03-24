import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Search, 
  Filter, 
  RefreshCw,
  CheckSquare,
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

type RequestsManagerProps = {
  isOwner?: boolean;
};

// Define the structure of a request
interface Request {
  id: string;
  team_id: string;
  request_type: 'roster_change' | 'online_id_change' | 'team_rebrand' | 'team_transfer';
  requested_by: string;
  tournament_id: string | null;
  league_id: string | null;
  player_id: string | null;
  old_value: string | null;
  new_value: string | null;
  item_id: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processing' | 'failed';
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  payment_reference: string | null;
  processed_at: string | null;
  teams?: {
    name: string;
  };
  players?: {
    display_name: string;
  };
}

const RequestsManager: React.FC<RequestsManagerProps> = ({ isOwner = false }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [processingRequests, setProcessingRequests] = useState<string[]>([]);

  // Request type map for readability
  const requestTypeMap: Record<string, string> = {
    'roster_change': 'Roster Change',
    'online_id_change': 'Online ID Change',
    'team_rebrand': 'Team Rebrand',
    'team_transfer': 'Team Transfer'
  };

  // Status colors and icons
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    'pending': { color: 'bg-yellow-500/10 text-yellow-500', icon: <Clock className="w-4 h-4" /> },
    'approved': { color: 'bg-blue-500/10 text-blue-500', icon: <CheckCircle className="w-4 h-4" /> },
    'rejected': { color: 'bg-red-500/10 text-red-500', icon: <XCircle className="w-4 h-4" /> },
    'completed': { color: 'bg-green-500/10 text-green-500', icon: <CheckCircle className="w-4 h-4" /> },
    'processing': { color: 'bg-purple-500/10 text-purple-500', icon: <Loader2 className="w-4 h-4 animate-spin" /> },
    'failed': { color: 'bg-red-500/10 text-red-500', icon: <AlertCircle className="w-4 h-4" /> }
  };

  // Fetch requests from the database
  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('team_change_requests')
        .select(`
          *,
          teams (name),
          players (display_name)
        `)
        .order('created_at', { ascending: false });
      
      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setRequests(data || []);
      applyFilters(data || [], typeFilter, statusFilter, searchQuery);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to load requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to the requests
  const applyFilters = (data: Request[], type: string, status: string, search: string) => {
    let filtered = [...data];

    // Apply type filter
    if (type !== 'all') {
      filtered = filtered.filter(req => req.request_type === type);
    }

    // Apply status filter
    if (status !== 'all') {
      filtered = filtered.filter(req => req.status === status);
    }

    // Apply search query
    if (search.trim() !== '') {
      const query = search.toLowerCase();
      filtered = filtered.filter(req => 
        req.id.toLowerCase().includes(query) ||
        (req.teams?.name && req.teams.name.toLowerCase().includes(query)) ||
        (req.players?.display_name && req.players.display_name.toLowerCase().includes(query))
      );
    }

    setFilteredRequests(filtered);
  };

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(requests, typeFilter, statusFilter, query);
  };

  // Handle filter changes
  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setTypeFilter(type);
    applyFilters(requests, type, statusFilter, searchQuery);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value;
    setStatusFilter(status);
    applyFilters(requests, typeFilter, status, searchQuery);
  };

  // Handle request selection
  const handleSelectRequest = (id: string) => {
    if (selectedRequests.includes(id)) {
      setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
    } else {
      setSelectedRequests([...selectedRequests, id]);
    }
  };

  // Handle select all requests
  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([]);
    } else {
      setSelectedRequests(filteredRequests.map(req => req.id));
    }
  };

  // Process a single request
  const processRequest = async (requestId: string) => {
    try {
      setProcessingRequests(prev => [...prev, requestId]);
      
      // For team transfers, call the approve_transfer endpoint
      const requestToProcess = requests.find(req => req.id === requestId);
      
      if (requestToProcess?.request_type === 'team_transfer') {
        // Call the backend approve_transfer endpoint
        const response = await fetch('/api/requests/approve_transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ request_id: requestId }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to process request');
        }
      } else {
        // For other request types, just update the status to approved
        const { error } = await supabase
          .from('team_change_requests')
          .update({ status: 'approved', updated_at: new Date().toISOString() })
          .eq('id', requestId);
        
        if (error) throw error;
      }
      
      // Refresh the requests
      await fetchRequests();
    } catch (err: any) {
      console.error('Error processing request:', err);
      setError(`Failed to process request: ${err.message}`);
    } finally {
      setProcessingRequests(prev => prev.filter(id => id !== requestId));
    }
  };

  // Process multiple requests
  const processSelectedRequests = async () => {
    // Process each selected request one by one
    for (const requestId of selectedRequests) {
      await processRequest(requestId);
    }
    setSelectedRequests([]);
  };

  // Load requests when the component mounts
  useEffect(() => {
    fetchRequests();
  }, []);

  // Get the request description
  const getRequestDescription = (request: Request) => {
    switch (request.request_type) {
      case 'team_transfer':
        return `Transfer team ownership from old captain (${request.old_value}) to new captain (${request.new_value})`;
      case 'team_rebrand':
        return `Change team name from "${request.old_value}" to "${request.new_value}"`;
      case 'online_id_change':
        return `Change online ID from "${request.old_value}" to "${request.new_value}"`;
      case 'roster_change':
        return `Change player role to "${request.new_value}"`;
      default:
        return `${requestTypeMap[request.request_type] || request.request_type} request`;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Requests Management</h2>
        
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full pl-10 p-2.5"
              placeholder="Search by ID, team name..."
              value={searchQuery}
              onChange={handleSearch}
              aria-label="Search requests"
              title="Search requests"
            />
          </div>
          
          {/* Type Filter */}
          <div className="relative">
            <select
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
              value={typeFilter}
              onChange={handleTypeFilterChange}
              aria-label="Filter by request type"
              title="Filter by request type"
            >
              <option value="all">All Types</option>
              <option value="team_transfer">Team Transfer</option>
              <option value="team_rebrand">Team Rebrand</option>
              <option value="online_id_change">Online ID Change</option>
              <option value="roster_change">Roster Change</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div className="relative">
            <select
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5"
              value={statusFilter}
              onChange={handleStatusFilterChange}
              aria-label="Filter by status"
              title="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={fetchRequests}
            className="bg-gray-700 text-white p-2.5 rounded-lg hover:bg-gray-600"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Bulk Actions */}
      {selectedRequests.length > 0 && (
        <div className="bg-gray-700 p-3 rounded-lg mb-4 flex items-center justify-between">
          <p className="text-white">{selectedRequests.length} request(s) selected</p>
          <div className="flex gap-2">
            <button
              onClick={processSelectedRequests}
              disabled={processingRequests.length > 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processingRequests.length > 0 ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Approve Selected
            </button>
            <button
              onClick={() => setSelectedRequests([])}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-600/20 border border-red-600 text-red-500 p-4 rounded-lg mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-300">
          <thead className="text-xs uppercase bg-gray-700 text-gray-300">
            <tr>
              <th className="px-4 py-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded bg-gray-600 border-gray-600"
                    checked={selectedRequests.length === filteredRequests.length && filteredRequests.length > 0}
                    onChange={handleSelectAll}
                    aria-label="Select all requests"
                    title="Select all requests"
                  />
                </div>
              </th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="w-6 h-6 text-green-500 animate-spin mr-2" />
                    <span>Loading requests...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No requests found matching your criteria
                </td>
              </tr>
            ) : (
              filteredRequests.map(request => (
                <tr 
                  key={request.id} 
                  className="border-b border-gray-700 hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded bg-gray-600 border-gray-600"
                        checked={selectedRequests.includes(request.id)}
                        onChange={() => handleSelectRequest(request.id)}
                        disabled={request.status !== 'pending'}
                        aria-label={`Select request ${request.id}`}
                        title={`Select request ${request.id}`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{request.id.substring(0, 8)}...</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-700 rounded-full text-xs">
                      {requestTypeMap[request.request_type] || request.request_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">{request.teams?.name || '-'}</td>
                  <td className="px-4 py-3">{getRequestDescription(request)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${statusConfig[request.status]?.color || 'bg-gray-500/10 text-gray-500'}`}>
                      {statusConfig[request.status]?.icon}
                      <span className="ml-1 capitalize">{request.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    {request.status === 'pending' && (
                      <button
                        onClick={() => processRequest(request.id)}
                        disabled={processingRequests.includes(request.id)}
                        className="bg-green-600/20 text-green-500 p-2 rounded-lg hover:bg-green-600/30 mr-2 disabled:opacity-50"
                        title="Approve"
                      >
                        {processingRequests.includes(request.id) ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RequestsManager; 