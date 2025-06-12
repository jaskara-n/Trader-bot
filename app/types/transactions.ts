export interface TokenBalances {
  before: Record<string, string>;
  after: Record<string, string>;
}

// Swap transaction (current)
export interface SwapTransaction {
  id: string;
  type: 'swap';
  details: {
    tokens?: string[];
    amounts?: string[];
    balances?: TokenBalances;
    timestamp: number;
    txHash?: string;
    status?: string;
  };
}

// Staking conversation entry (new!)
export interface StakeConversationTransaction {
  id: string;
  type: 'stake';
  details: {
    userInput: string;
    response: string;
    timestamp: number;
  };
}

// Union type (for Mongo schema)
export type Transaction = SwapTransaction | StakeConversationTransaction;
