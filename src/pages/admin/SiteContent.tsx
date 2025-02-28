import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, Edit, Trash2, Plus, Image, Link as LinkIcon, Check, X, AlertTriangle, Home, User2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContentItem {
  id: string;
  title: string;
  type: 'headline' | 'feature' | 'announcement';
  content: string;
  image_url?: string;
  link_url?: string;
  active: boolean;
  created_at: string;
}

function AdminSiteContent() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([
    {
      id: '1',
      title: 'Season 6 Championship Series Announced',
      type: 'headline',
      content: 'The road to glory begins March 1st. Register your team now!',
      image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2940',
      active: true,
      created_at: '2024-02-21T00:00:00Z'
    },
    {
      id: '2',
      title: 'Top Players of the Week',
      type: 'headline',
      content: 'Check out who dominated the virtual courts this week',
      image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=2940',
      active: true,
      created_at: '2024-02-20T00:00:00Z'
    },
    {
      id: '3',
      title: 'New Tournament Format Revealed',
      type: 'headline',
      content: 'Experience competitive NBA 2K like never before',
      image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=2940',
      active: true,
      created_at: '2024-02-19T00:00:00Z'
    }
  ]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<ContentItem | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'headline',
    content: '',
    image_url: '',
    link_url: '',
    active: true
  });

  const handleEditClick = (item: ContentItem) => {
    setCurrentItem(item);
    setFormData({
      title: item.title,
      type: item.type,
      content: item.content,
      image_url: item.image_url || '',
      link_url: item.link_url || '',
      active: item.active
    });
    setShowEditModal(true);
  };

  const handleCreateClick = () => {
    setCurrentItem(null);
    setFormData({
      title: '',
      type: 'headline',
      content: '',
      image_url: '',
      link_url: '',
      active: true
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (item: ContentItem) => {
    setCurrentItem(item);
    setShowDeleteModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentItem) {
      // Update existing item
      const updatedItems = contentItems.map(item => 
        item.id === currentItem.id 
          ? { ...item, ...formData }
          : item
      );
      setContentItems(updatedItems);
    } else {
      // Create new item
      const newItem: ContentItem = {
        id: Date.now().toString(),
        ...formData,
        created_at: new Date().toISOString()
      };
      setContentItems([newItem, ...contentItems]);
    }
    
    setShowEditModal(false);
  };

  const handleDeleteConfirm = () => {
    if (!currentItem) return;
    
    const updatedItems = contentItems.filter(item => item.id !== currentItem.id);
    setContentItems(updatedItems);
    setShowDeleteModal(false);
  };

  const toggleActive = (id: string) => {
    const updatedItems = contentItems.map(item => 
      item.id === id 
        ? { ...item, active: !item.active }
        : item
    );
    setContentItems(updatedItems);
  };

  return (
    <div className="bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-3xl font-bold text-white">Site Content Management</h1>
            <Link to="/admin" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Admin Panel
            </Link>
            <Link to="/dashboard" className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center">
              <User2 className="w-5 h-5 mr-2" />
              Dashboard
            </Link>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={handleCreateClick}
              className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Content
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Headlines Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Headlines</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {contentItems
                    .filter(item => item.type === 'headline')
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{item.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{item.content}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.image_url ? (
                            <div className="h-10 w-16 rounded overflow-hidden">
                              <img 
                                src={item.image_url} 
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActive(item.id)}
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="text-green-500 hover:text-green-400 mr-3"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Features Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Featured Content</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Image
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {contentItems
                    .filter(item => item.type === 'feature')
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{item.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{item.content}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.image_url ? (
                            <div className="h-10 w-16 rounded overflow-hidden">
                              <img 
                                src={item.image_url} 
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No image</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActive(item.id)}
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="text-green-500 hover:text-green-400 mr-3"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements Section */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Announcements</h2>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {contentItems
                    .filter(item => item.type === 'announcement')
                    .map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">{item.title}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-300">{item.content}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleActive(item.id)}
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              item.active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="text-green-500 hover:text-green-400 mr-3"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(item)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Content Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-white">
                {currentItem ? 'Edit Content' : 'Add Content'}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                  >
                    <option value="headline">Headline</option>
                    <option value="feature">Feature</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full bg-gray-700 border-gray-600 rounded-md px-3 py-2 text-white"
                    rows={3}
                    required
                  />
                </div>
                {formData.type !== 'announcement' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Image URL
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={formData.image_url}
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                        className="w-full bg-gray-700 border-gray-600 rounded-l-md px-3 py-2 text-white"
                        placeholder="https://example.com/image.jpg"
                      />
                      <div className="bg-gray-600 rounded-r-md px-3 py-2">
                        <Image className="w-5 h-5 text-gray-300" />
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Link URL (optional)
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={formData.link_url}
                      onChange={(e) => setFormData({...formData, link_url: e.target.value})}
                      className="w-full bg-gray-700 border-gray-600 rounded-l-md px-3 py-2 text-white"
                      placeholder="https://example.com/page"
                    />
                    <div className="bg-gray-600 rounded-r-md px-3 py-2">
                      <LinkIcon className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({...formData, active: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="active" className="ml-2 block text-sm text-gray-300">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {currentItem ? 'Save Changes' : 'Add Content'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Content Modal */}
      {showDeleteModal && currentItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Delete Content</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to delete "{currentItem.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSiteContent;