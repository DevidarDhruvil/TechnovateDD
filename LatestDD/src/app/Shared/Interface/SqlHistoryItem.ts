export interface SqlHistoryItem{
    id?: number; // Optional, depending on backend response
  sqlQuery: string;
  queryName: string;
  queryTitle: string;
  userId: number;
  createdAt?: string; // Optional, depending on backend response
}