export interface Transaction {
  id: string;
  wallet: string;
  type: 'swap' | 'stake';
  details: {
    tokens?: string[];
    amounts?: string[];
    balances?: {
      before: Record<string, string>;
      after: Record<string, string>;
    };
    timestamp: number;
    txHash?: string;
  };
}