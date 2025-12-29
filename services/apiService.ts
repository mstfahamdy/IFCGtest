import { SalesOrder, SharePointPayload, OrderStatus } from "../types";
import { MOCK_SHAREPOINT_URL } from "../constants";

/**
 * Service to handle SharePoint REST API integration.
 * This enables true multi-device synchronization by using a central database.
 */
export const ApiService = {
  /**
   * Helper to get request headers.
   * NOTE: In a production environment, you would include your Authorization Bearer token 
   * or X-RequestDigest for SharePoint authentication here.
   */
  getHeaders(method: string = 'GET') {
    const headers: Record<string, string> = {
      'Accept': 'application/json;odata=nometadata',
      'Content-Type': 'application/json',
    };

    if (method === 'PATCH' || method === 'MERGE') {
      headers['X-HTTP-Method'] = 'MERGE';
      headers['IF-MATCH'] = '*';
    }

    return headers;
  },

  /**
   * Fetches all orders from the SharePoint List.
   */
  async getOrders(): Promise<SalesOrder[]> {
    try {
      const response = await fetch(MOCK_SHAREPOINT_URL, {
        method: 'GET',
        headers: this.getHeaders('GET'),
      });

      if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

      const data = await response.json();
      const results = data.value || data.d?.results || [];

      // Map SharePoint fields back to our SalesOrder type
      return results.map((item: any) => {
        try {
          // Parse the complex data stored as JSON in a single SharePoint field
          const parsedOrder = item.OrderJSON ? JSON.parse(item.OrderJSON) : {};
          return {
            ...parsedOrder,
            id: item.Id.toString(),
            status: item.Status as OrderStatus,
            customerName: item.Title, // SharePoint 'Title' used as Customer Name
            areaLocation: item.CustomerLocation,
            orderDate: item.OrderDate,
          } as SalesOrder;
        } catch (e) {
          console.error("Failed to parse order JSON for item", item.Id);
          return null;
        }
      }).filter(Boolean);
    } catch (error) {
      console.error("SharePoint Fetch Error:", error);
      // Fallback to local storage only if network is completely down for reliability
      const localFallback = localStorage.getItem('ifcg_offline_cache');
      return localFallback ? JSON.parse(localFallback) : [];
    }
  },

  /**
   * Saves or updates an order in SharePoint.
   */
  async saveOrder(order: SalesOrder, isNew: boolean): Promise<SalesOrder> {
    try {
      const url = isNew 
        ? MOCK_SHAREPOINT_URL 
        : `${MOCK_SHAREPOINT_URL}(${order.id})`;

      const method = isNew ? 'POST' : 'POST'; // SharePoint uses POST with X-HTTP-Method: MERGE for updates
      
      // Prepare the payload for SharePoint Columns
      const payload: SharePointPayload = {
        Title: order.customerName,
        OrderDate: order.orderDate,
        CustomerLocation: order.areaLocation,
        Status: order.status || 'Pending Assistant',
        OrderJSON: JSON.stringify(order) // Pack full object into one field for simplicity
      };

      const response = await fetch(url, {
        method,
        headers: this.getHeaders(isNew ? 'POST' : 'PATCH'),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Save failed: ${response.status} ${errText}`);
      }

      // If successful, update local cache for smooth UX
      const current = await this.getOrders();
      localStorage.setItem('ifcg_offline_cache', JSON.stringify(current));

      return order;
    } catch (error) {
      console.error("SharePoint Save Error:", error);
      throw error;
    }
  },

  /**
   * Updates specific order status/history in SharePoint.
   */
  async updateOrderStatus(orderId: string, updates: Partial<SalesOrder>): Promise<void> {
    try {
      // Get the current order first to preserve the rest of the JSON data
      const orders = await this.getOrders();
      const existing = orders.find(o => o.id === orderId);
      
      if (!existing) throw new Error("Order not found for status update");

      const mergedOrder = { ...existing, ...updates };
      await this.saveOrder(mergedOrder, false);
    } catch (error) {
      console.error("Status Update Error:", error);
      throw error;
    }
  }
};