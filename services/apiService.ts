import { SalesOrder, SharePointPayload, OrderStatus } from "../types";
import { SHAREPOINT_API_URL } from "../constants";

/**
 * Service to handle SharePoint REST API integration.
 * Includes automatic Security Token (Form Digest) management to resolve 403 errors.
 */
export const ApiService = {
  // Cache for the List Item Entity Type Full Name (e.g. "SP.Data.OrdersListItem")
  _listItemEntityTypeFullName: null as string | null,

  /**
   * Fetches the X-RequestDigest security token from SharePoint.
   * Required for all POST/PATCH/MERGE operations.
   */
  async getFormDigest(): Promise<string> {
    try {
      // We extract the site URL from the API URL
      const siteUrl = SHAREPOINT_API_URL.split('/_api')[0];
      const response = await fetch(`${siteUrl}/_api/contextinfo`, {
        method: 'POST',
        headers: { 'Accept': 'application/json;odata=verbose' }
      });
      const data = await response.json();
      return data.d.GetContextWebInformation.FormDigestValue;
    } catch (error) {
      console.error("Failed to fetch Form Digest:", error);
      throw new Error("Security Token Fetch Failed. Ensure you are logged into SharePoint.");
    }
  },

  /**
   * Discovers the exact Entity Type Full Name for the SharePoint list.
   * This is required for the '__metadata' field in the payload.
   */
  async getListItemEntityType(): Promise<string> {
    if (this._listItemEntityTypeFullName) return this._listItemEntityTypeFullName;

    try {
      // Get list metadata (the part before /items)
      const listUrl = SHAREPOINT_API_URL.split('/items')[0];
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json;odata=verbose' }
      });
      const data = await response.json();
      this._listItemEntityTypeFullName = data.d.ListItemEntityTypeFullName;
      return this._listItemEntityTypeFullName!;
    } catch (error) {
      console.warn("Failed to discover list type, falling back to default.");
      return 'SP.Data.OrdersListItem';
    }
  },

  /**
   * Helper to get request headers.
   */
  async getHeaders(method: string = 'GET', digest?: string) {
    const headers: Record<string, string> = {
      'Accept': 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose',
    };

    if (digest) {
      headers['X-RequestDigest'] = digest;
    }

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
      const headers = await this.getHeaders('GET');
      const response = await fetch(SHAREPOINT_API_URL, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        if (response.status === 403) throw new Error("Access Denied (403): Please check your list permissions.");
        throw new Error(`SharePoint Error ${response.status}`);
      }

      const data = await response.json();
      const results = data.d?.results || data.value || [];

      const orders = results.map((item: any) => {
        try {
          const parsedOrder = item.OrderJSON ? JSON.parse(item.OrderJSON) : {};
          return {
            ...parsedOrder,
            id: item.Id.toString(),
            status: item.Status || 'Pending Assistant',
            customerName: item.Title || parsedOrder.customerName,
            areaLocation: item.CustomerLocation || parsedOrder.areaLocation,
            orderDate: item.OrderDate || parsedOrder.orderDate,
          } as SalesOrder;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      localStorage.setItem('ifcg_cloud_cache', JSON.stringify(orders));
      return orders;
    } catch (error: any) {
      console.warn("API Fetch Failed:", error.message);
      const cache = localStorage.getItem('ifcg_cloud_cache');
      return cache ? JSON.parse(cache) : [];
    }
  },

  /**
   * Saves or updates an order in SharePoint.
   */
  async saveOrder(order: SalesOrder, isNew: boolean): Promise<SalesOrder> {
    try {
      // 1. Get Security Token
      const digest = await this.getFormDigest();
      
      // 2. Get Correct Metadata Type Name
      const entityType = await this.getListItemEntityType();

      const url = isNew 
        ? SHAREPOINT_API_URL 
        : `${SHAREPOINT_API_URL}(${order.id})`;

      const payload: any = {
        '__metadata': { 'type': entityType },
        Title: order.customerName,
        OrderDate: order.orderDate,
        CustomerLocation: order.areaLocation,
        Status: order.status || 'Pending Assistant',
        OrderJSON: JSON.stringify(order)
      };

      const headers = await this.getHeaders(isNew ? 'POST' : 'PATCH', digest);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 403) {
           throw new Error("Access Denied (403): Ensure you have EDIT permissions and that columns 'OrderJSON', 'CustomerLocation', 'OrderDate', and 'Status' exist exactly with those names.");
        }
        throw new Error(`SharePoint Reject: ${response.status} - ${errorText}`);
      }

      return order;
    } catch (error: any) {
      console.error("Save failed:", error.message);
      throw error;
    }
  },

  /**
   * Updates specific order status/history in SharePoint.
   */
  async updateOrderStatus(orderId: string, updates: Partial<SalesOrder>): Promise<void> {
    try {
      const orders = await this.getOrders();
      const existing = orders.find(o => o.id === orderId);
      if (existing) {
        const merged = { ...existing, ...updates };
        await this.saveOrder(merged, false);
      }
    } catch (error) {
      console.error("Status Update Failed:", error);
      throw error;
    }
  }
};