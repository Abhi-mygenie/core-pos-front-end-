// CR-376-FU-B — CategoryPanel: menu-aware counts, hidden 0-count categories, All always shown, Popular scoped/hidden
import { render, screen } from '@testing-library/react';
import CategoryPanel from '../CategoryPanel';

const categories = [
  { categoryId: 'c1', categoryName: 'Starters' },
  { categoryId: 'c2', categoryName: 'Premium Only' },
  { categoryId: 'c3', categoryName: 'Disabled Only' },
];
const activeMenuProducts = [
  { productId: 'p1', categoryId: 'c1', isActive: true, isDisabled: false },
  { productId: 'p2', categoryId: 'c1', isActive: true, isDisabled: false },
  { productId: 'p3', categoryId: 'c3', isActive: true, isDisabled: true },
  { productId: 'p4', categoryId: 'c1', isActive: false, isDisabled: false },
];
const popularProducts = [
  { productId: 'p1', categoryId: 'c1', isActive: true, isDisabled: false },
  { productId: 'p9', categoryId: 'c2', isActive: true, isDisabled: false },
];
const base = { activeCategory: 'all', onCategoryChange: jest.fn(), onBack: jest.fn(), categories, activeMenuProducts };

const rowIds = () =>
  screen.getAllByRole('button').map(b => b.dataset.testid).filter(id => id && id.startsWith('category-') && id !== 'category-back-btn');

test('V1 real category shows count by categoryId (active, non-disabled only)', () => {
  render(<CategoryPanel {...base} />);
  expect(screen.getByTestId('category-c1')).toHaveTextContent('Starters (2)');
});

test('V2 category with 0 active-menu items is hidden', () => {
  render(<CategoryPanel {...base} />);
  expect(screen.queryByTestId('category-c2')).toBeNull();
  expect(screen.queryByTestId('category-c3')).toBeNull();
});

test('V3 All always visible with total visible count', () => {
  render(<CategoryPanel {...base} activeMenuProducts={[]} />);
  expect(screen.getByTestId('category-all')).toHaveTextContent('All (0)');
  expect(rowIds()).toEqual(['category-all']);
});

test('V4 Popular scoped to active menu; absent when setting OFF', () => {
  const { unmount } = render(<CategoryPanel {...base} popularProducts={popularProducts} showPopularCategory />);
  expect(screen.getByTestId('category-popular')).toHaveTextContent('Popular (1)');
  unmount();
  render(<CategoryPanel {...base} popularProducts={popularProducts} showPopularCategory={false} />);
  expect(screen.queryByTestId('category-popular')).toBeNull();
});

test('V5 Popular hidden when intersection is empty', () => {
  render(<CategoryPanel {...base} popularProducts={[popularProducts[1]]} showPopularCategory />);
  expect(screen.queryByTestId('category-popular')).toBeNull();
});

test('V6 row order: Popular → All → real categories', () => {
  render(<CategoryPanel {...base} popularProducts={popularProducts} showPopularCategory />);
  expect(rowIds()).toEqual(['category-popular', 'category-all', 'category-c1']);
});
