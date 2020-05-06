import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface TransactionResponse {
  id: string;
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: Promise<Category>;
}

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  private transactions: Transaction[];

  public async find(): Promise<Transaction[]> {
    this.transactions = await super.find({
      relations: ['category'],
    });

    return this.transactions;
  }

  public async getBalance(): Promise<Balance> {
    if (!this.transactions) {
      this.transactions = await this.find();
    }

    return this.transactions.reduce(
      (acc, transaction) => {
        const { type, value } = transaction;

        if (type === 'income') {
          acc.income += value;
          acc.total += value;
        } else if (type === 'outcome') {
          acc.outcome += value;
          acc.total -= value;
        }

        return acc;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
  }
}

export default TransactionsRepository;
