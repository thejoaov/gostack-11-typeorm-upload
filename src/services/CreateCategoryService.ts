import { getRepository, Repository } from 'typeorm';

import AppError from '../errors/AppError';
import Category from '../models/Category';

interface Request {
  title: string;
}

class CreateCategoryService {
  private categoriesRepository: Repository<Category>;

  constructor() {
    this.categoriesRepository = getRepository(Category);
  }

  async execute({ title }: Request): Promise<Category> {
    if (title.trim().length === 0) {
      throw new AppError('Title must be informed.', 400);
    }

    let category = await this.categoriesRepository.findOne({
      where: { title },
    });

    if (!category) {
      category = this.categoriesRepository.create({ title });
      await this.categoriesRepository.save(category);
    }
    return category;
  }
}

export default CreateCategoryService;
