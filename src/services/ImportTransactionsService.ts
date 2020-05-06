import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getRepository, In, getCustomRepository } from 'typeorm';
import uploadConfig from '../config/upload';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import Category from '../models/Category';

interface Request {
  importFilename: string;
}

interface TrasactionImport {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ importFilename }: Request): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const csvFilePath = path.join(uploadConfig.directory, importFilename);

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csvParse({
      // from_line: 2,
      columns: true,
      ltrim: true,
      rtrim: true,
      cast: true,
    });

    const dataImport: TrasactionImport[] = [];

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', line => {
      const { title, category, type, value } = line;

      if (!title || !type || !value) return;

      dataImport.push({
        title,
        category,
        type,
        value,
      });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categories = dataImport
      .map(({ category }) => category)
      .filter((value, index, self) => self.indexOf(value) === index);

    const existentsCategories = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const existentsCategoriesTitle = existentsCategories.map(
      (category: Category) => category.title,
    );

    const addCategories = categories.filter(
      category => !existentsCategoriesTitle.includes(category),
    );

    let newCategories: Category[] = [];
    if (addCategories.length > 0) {
      newCategories = categoriesRepository.create(
        addCategories.map(title => ({ title })),
      );

      await categoriesRepository.save(newCategories);
    }

    const finalCategories = [...existentsCategories, ...newCategories];

    const createdTransactions = transactionsRepository.create(
      dataImport.map(transanction => ({
        title: transanction.title,
        type: transanction.type,
        value: transanction.value,
        category: finalCategories.find(
          category => category.title === transanction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    fs.promises.unlink(csvFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
