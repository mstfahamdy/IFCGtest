import { SalesOrder } from "../types";
import { MOCK_SHAREPOINT_URL } from "../constants";

/**
 * Service to handle all remote "Cloud" operations.
 * In a production environment, this would call SharePoint, Firebase, or your custom API.
 */
export const ApiService = {
  /**
   * Fetches all orders from the cloud.
   */
  async getOrders(): Promise<SalesOrder[]> {
    try {
      // In a real scenario, this would be: 
      // const response = await fetch(MOCK_SHAREPOINT_URL);
      // const data = await response.json();
      
      // FOR DEMO PURPOSES: We simulate the network call using localStorage as a "Mock Cloud"
      // In a real app, replace the lines below with actual fetch() calls.
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network latency
      const cloudData = localStorage.getItem('ifcg_cloud_db_v1');
      return cloudData ? JSON.parse(cloudData) : [];
    } catch (error) {
      console.error("Cloud Fetch Error:", error);
      throw error;
    }
  },

  /**
   * Saves or updates an order in the cloud.
   */
  async saveOrder(order: SalesOrder, isNew: boolean): Promise<SalesOrder> {
    try {
      // Real implementation would POST/PATCH to your API:
      // const method = isNew ? 'POST' : 'PATCH';
      // await fetch(MOCK_SHAREPOINT_URL + (isNew ? '' : `/${order.id}`), {
      //   method,
      //   body: JSON.stringify(order),
      //   headers: { 'Content-Type': 'application/json' }
      // });

      // SIMULATION: Update the shared "Cloud" store
      const currentOrders = await this.getOrders();
      let updatedOrders: SalesOrder[];
      
      if (isNew) {
        updatedOrders = [order, ...currentOrders];
      } else {
        updatedOrders = currentOrders.map(o => o.id === order.id ? order : o);
      }
      
      localStorage.setItem('ifcg_cloud_db_v1', JSON.stringify(updatedOrders));
      return order;
    } catch (error) {
      console.error("Cloud Save Error:", error);
      throw error;
    }
  },

  /**
   * Updates order status in the cloud.
   */
  async updateOrderStatus(orderId: string, updates: Partial<SalesOrder>): Promise<void> {
    const orders = await this.getOrders();
    const updated = orders.map(o => o.id === orderId ? { ...o, ...updates } : o);
    localStorage.setItem('ifcg_cloud_db_v1', JSON.stringify(updated));
  }
};