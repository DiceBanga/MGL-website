import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';

interface Item {
  id: string;
  item_name: string;
  item_id: string;
  item_description: string;
  reg_price: number;
  current_price: number;
  metadata: any;
}

interface ItemsManagementProps {
  isOwner?: boolean;
}

const ItemsManagement: React.FC<ItemsManagementProps> = ({ isOwner = false }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState<Partial<Item> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('item_id');

      if (error) throw error;
      setItems(data);
    } catch (err) {
      setError('Failed to fetch items');
      console.error('Error:', err);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setNewItem(null);
  };

  const handleAdd = () => {
    setNewItem({
      item_name: '',
      item_id: '',
      item_description: '',
      reg_price: 0,
      current_price: 0,
      metadata: { type: 'other' }
    });
    setEditingItem(null);
  };

  const handleDelete = async (id: string) => {
    if (!isOwner) return;
    
    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuccess('Item deleted successfully');
      fetchItems();
    } catch (err) {
      setError('Failed to delete item');
      console.error('Error:', err);
    }
  };

  const handleSave = async (item: Partial<Item>, isNew: boolean = false) => {
    try {
      if (isNew) {
        const { error } = await supabase
          .from('items')
          .insert(item);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('items')
          .update(item)
          .eq('id', item.id);

        if (error) throw error;
      }

      setSuccess(isNew ? 'Item created successfully' : 'Item updated successfully');
      setEditingItem(null);
      setNewItem(null);
      fetchItems();
    } catch (err) {
      setError(isNew ? 'Failed to create item' : 'Failed to update item');
      console.error('Error:', err);
    }
  };

  const handleCancel = () => {
    setEditingItem(null);
    setNewItem(null);
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Items Management</h2>
        {(isOwner || !isOwner) && (
          <button
            onClick={handleAdd}
            className="bg-green-700 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Item
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-md mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 text-green-500 px-4 py-2 rounded-md mb-4">
          {success}
        </div>
      )}

      <div className="space-y-4">
        {newItem && (
          <div className="bg-gray-700/50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">New Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Item Name"
                value={newItem.item_name}
                onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
              />
              <input
                type="text"
                placeholder="Item ID (5 digits)"
                value={newItem.item_id}
                onChange={(e) => setNewItem({ ...newItem, item_id: e.target.value })}
                className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
              />
              <input
                type="text"
                placeholder="Description"
                value={newItem.item_description}
                onChange={(e) => setNewItem({ ...newItem, item_description: e.target.value })}
                className="bg-gray-600 border-gray-700 rounded-md text-white p-2 md:col-span-2"
              />
              <input
                type="number"
                placeholder="Regular Price"
                value={newItem.reg_price}
                onChange={(e) => setNewItem({ ...newItem, reg_price: parseFloat(e.target.value) })}
                className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
              />
              <input
                type="number"
                placeholder="Current Price"
                value={newItem.current_price}
                onChange={(e) => setNewItem({ ...newItem, current_price: parseFloat(e.target.value) })}
                className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
              />
            </div>
            <div className="flex justify-end space-x-4 mt-4">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(newItem, true)}
                className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {items.map((item) => (
          <div key={item.id} className="bg-gray-700/50 p-4 rounded-lg">
            {editingItem?.id === item.id ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={editingItem.item_name}
                    onChange={(e) => setEditingItem({ ...editingItem, item_name: e.target.value })}
                    className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
                  />
                  <input
                    type="text"
                    value={editingItem.item_id}
                    onChange={(e) => setEditingItem({ ...editingItem, item_id: e.target.value })}
                    className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
                  />
                  <input
                    type="text"
                    value={editingItem.item_description}
                    onChange={(e) => setEditingItem({ ...editingItem, item_description: e.target.value })}
                    className="bg-gray-600 border-gray-700 rounded-md text-white p-2 md:col-span-2"
                  />
                  <input
                    type="number"
                    value={editingItem.reg_price}
                    onChange={(e) => setEditingItem({ ...editingItem, reg_price: parseFloat(e.target.value) })}
                    className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
                  />
                  <input
                    type="number"
                    value={editingItem.current_price}
                    onChange={(e) => setEditingItem({ ...editingItem, current_price: parseFloat(e.target.value) })}
                    className="bg-gray-600 border-gray-700 rounded-md text-white p-2"
                  />
                </div>
                <div className="flex justify-end space-x-4 mt-4">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSave(editingItem)}
                    className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600"
                  >
                    Save
                  </button>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-white font-medium">{item.item_name}</h3>
                  <p className="text-sm text-gray-400">ID: {item.item_id}</p>
                  <p className="text-sm text-gray-400 mt-2">{item.item_description}</p>
                  <div className="mt-2 space-x-4">
                    <span className="text-sm text-gray-400">
                      Regular Price: ${item.reg_price.toFixed(2)}
                    </span>
                    <span className="text-sm text-green-500">
                      Current Price: ${item.current_price.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="text-blue-500 hover:text-blue-400"
                    title="Edit item"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-500 hover:text-red-400"
                      title="Delete item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemsManagement; 