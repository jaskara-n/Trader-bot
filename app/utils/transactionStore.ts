import fs from 'fs';
import path from 'path';
import { Transaction } from "@/app/types/transactions";

const DATA_DIR = path.join(process.cwd(), 'data');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
  }
}

// Record new transaction
export function recordTransaction(tx: Transaction): void {
  ensureDataDir();
  
  const transactions = getTransactions();
  transactions.push(tx);
  
  fs.writeFileSync(
    TRANSACTIONS_FILE,
    JSON.stringify(transactions, null, 2)
  );
}

// Retrieve all transactions
export function getTransactions(): Transaction[] {
  ensureDataDir();
  
  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(TRANSACTIONS_FILE, 'utf8');
    return JSON.parse(data) as Transaction[];
  } catch (e) {
    console.error('Error reading transactions file', e);
    return [];
  }
}