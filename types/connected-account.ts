export interface ConnectedAccountSummary {
  id: string;
  platform: 'twitter' | 'linkedin';
  handle: string;
  tokenInvalid: boolean;
  createdAt: string; // ISO 8601
}

export interface ConnectedAccountsResponse {
  accounts: ConnectedAccountSummary[];
}
