export interface TokenBalances {
  before: Record<string, string>;
  after: Record<string, string>;
}

export interface Transaction {
  id: string;
  type: 'swap' | 'stake';
  details: {
    tokens?: string[];
    amounts?: string[];
    balances?: TokenBalances;
    timestamp: number;
    txHash?: string;
  };
}
