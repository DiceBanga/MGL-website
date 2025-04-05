import { supabase } from '../lib/supabase';

export interface Item {
  id: string;
  item_id: string;
  item_name: string;
  item_description?: string;
  reg_price: number;
  current_price: number;
  created_at?: string;
  updated_at?: string;
  enabled: boolean;
  metadata?: any;
}

export class ItemService {
  /**
   * Fetch all available items
   */
  async getAllItems(): Promise<Item[]> {
    try {
      console.log('Fetching all items');
      
      const query = supabase
        .from('items')
        .select('*');
      
      console.log('Supabase query:', query);
      
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching items:', error);
        console.error('Error details:', JSON.stringify(error));
        return [];
      }

      console.log('All items data:', data);
      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching items:', error);
      return [];
    }
  }

  /**
   * Fetch a specific item by name
   */
  async getItemByName(itemName: string): Promise<Item | null> {
    try {
      console.log(`Fetching item with name: ${itemName}`);
      
      const query = supabase
        .from('items')
        .select('*')
        .eq('item_name', itemName)
        .eq('enabled', true)
        .maybeSingle();
      
      console.log('Supabase query:', query);
      
      const { data, error } = await query;

      if (error) {
        console.error(`Error fetching item ${itemName}:`, error);
        console.error('Error details:', JSON.stringify(error));
        return null;
      }

      console.log(`Item data for ${itemName}:`, data);
      return data;
    } catch (error) {
      console.error(`Unexpected error fetching item ${itemName}:`, error);
      return null;
    }
  }

  /**
   * Fetch item price by name
   */
  async getItemPrice(itemName: string): Promise<number | null> {
    const item = await this.getItemByName(itemName);
    return item ? item.current_price : null;
  }

  /**
   * Utility method to get item ID by name
   */
  async getItemId(itemName: string): Promise<string | null> {
    const item = await this.getItemByName(itemName);
    return item ? item.id : null;
  }
} 