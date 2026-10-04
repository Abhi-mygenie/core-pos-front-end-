// BUG-451: PAGINATION.DEFAULT_LIMIT = 2000 drives getProducts() defaults; getAllProducts removed
jest.mock('../../axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../../transforms/productTransform', () => ({
  fromAPI: { productListResponse: jest.fn((d) => d) },
}));

import api from '../../axios';
import { API_ENDPOINTS, PAGINATION } from '../../constants';
import * as productService from '../productService';

describe('BUG-451 productService defaults', () => {
  beforeEach(() => api.get.mockResolvedValue({ data: { products: [] } }));

  test('PAGINATION.DEFAULT_LIMIT is 2000', () => {
    expect(PAGINATION.DEFAULT_LIMIT).toBe(2000);
  });

  test('getProducts() without args sends limit 2000 / offset 1 / type all', async () => {
    await productService.getProducts();
    expect(api.get).toHaveBeenCalledWith(API_ENDPOINTS.PRODUCTS, {
      params: { limit: 2000, offset: 1, type: 'all' },
    });
  });

  test('getAllProducts is no longer exported', () => {
    expect(productService.getAllProducts).toBeUndefined();
  });
});
