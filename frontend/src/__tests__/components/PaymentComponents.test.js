/**
 * Test Cases for Payment Components
 * 
 * Location: /app/frontend/src/components/payment/
 * Purpose: Payment panel sub-components
 */

import { render, screen, fireEvent } from '@testing-library/react';
import CustomerSection from '../../components/payment/CustomerSection';
import BillSummary from '../../components/payment/BillSummary';
import PaymentMethodSelector from '../../components/payment/PaymentMethodSelector';
import CashInputSection from '../../components/payment/CashInputSection';

describe('CustomerSection Component', () => {
  
  const mockCustomer = {
    tier: 'Gold',
    loyaltyPoints: 500,
    walletBalance: 200,
    coupons: [{ code: 'TEST' }],
  };

  const mockOnPhoneChange = jest.fn();
  const mockOnNameChange = jest.fn();
  const mockOnFindCustomer = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TC-001: Should render phone input
  test('TC-001: renders phone input', () => {
    render(
      <CustomerSection
        phone=""
        onPhoneChange={mockOnPhoneChange}
        customerName=""
        onNameChange={mockOnNameChange}
        customer={null}
        customerStatus={null}
        onFindCustomer={mockOnFindCustomer}
      />
    );
    
    expect(screen.getByTestId('customer-phone-input')).toBeInTheDocument();
  });

  // TC-002: Should call onPhoneChange when typing
  test('TC-002: calls onPhoneChange when typing', () => {
    render(
      <CustomerSection
        phone=""
        onPhoneChange={mockOnPhoneChange}
        customerName=""
        onNameChange={mockOnNameChange}
        customer={null}
        customerStatus={null}
        onFindCustomer={mockOnFindCustomer}
      />
    );
    
    fireEvent.change(screen.getByTestId('customer-phone-input'), { target: { value: '123' } });
    expect(mockOnPhoneChange).toHaveBeenCalledWith('123');
  });

  // TC-003: Should show "Found" badge when customer found
  test('TC-003: shows Found badge when customerStatus is found', () => {
    render(
      <CustomerSection
        phone="9876543210"
        onPhoneChange={mockOnPhoneChange}
        customerName="John"
        onNameChange={mockOnNameChange}
        customer={mockCustomer}
        customerStatus="found"
        onFindCustomer={mockOnFindCustomer}
      />
    );
    
    expect(screen.getByText('Found')).toBeInTheDocument();
  });

  // TC-004: Should show "New" badge when customer not found
  test('TC-004: shows New badge when customerStatus is new', () => {
    render(
      <CustomerSection
        phone="0000000000"
        onPhoneChange={mockOnPhoneChange}
        customerName=""
        onNameChange={mockOnNameChange}
        customer={null}
        customerStatus="new"
        onFindCustomer={mockOnFindCustomer}
      />
    );
    
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  // TC-005: Should show customer rewards when found
  test('TC-005: shows customer rewards summary', () => {
    render(
      <CustomerSection
        phone="9876543210"
        onPhoneChange={mockOnPhoneChange}
        customerName="John"
        onNameChange={mockOnNameChange}
        customer={mockCustomer}
        customerStatus="found"
        onFindCustomer={mockOnFindCustomer}
      />
    );
    
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByText('500 pts')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
  });

  // TC-006: Should call onFindCustomer when button clicked
  test('TC-006: calls onFindCustomer when search clicked', () => {
    render(
      <CustomerSection
        phone="9876543210"
        onPhoneChange={mockOnPhoneChange}
        customerName=""
        onNameChange={mockOnNameChange}
        customer={null}
        customerStatus={null}
        onFindCustomer={mockOnFindCustomer}
      />
    );
    
    fireEvent.click(screen.getByTestId('find-customer-btn'));
    expect(mockOnFindCustomer).toHaveBeenCalled();
  });

});

describe('BillSummary Component', () => {
  
  const mockCartItems = [
    { name: 'Butter Chicken', qty: 2, price: 300 },
    { name: 'Naan', qty: 4, price: 50 },
  ];

  // TC-007: Should render all cart items
  test('TC-007: renders all cart items', () => {
    render(<BillSummary cartItems={mockCartItems} subtotal={800} tax={40} />);
    
    expect(screen.getByText('Butter Chicken x2')).toBeInTheDocument();
    expect(screen.getByText('Naan x4')).toBeInTheDocument();
  });

  // TC-008: Should show correct prices
  test('TC-008: shows correct item prices', () => {
    render(<BillSummary cartItems={mockCartItems} subtotal={800} tax={40} />);
    
    expect(screen.getByText('₹600')).toBeInTheDocument(); // 300 * 2
    expect(screen.getByText('₹200')).toBeInTheDocument(); // 50 * 4
  });

  // TC-009: Should show subtotal and tax
  test('TC-009: shows subtotal and tax', () => {
    render(<BillSummary cartItems={mockCartItems} subtotal={800} tax={40} />);
    
    expect(screen.getByText('Subtotal')).toBeInTheDocument();
    expect(screen.getByText('₹800')).toBeInTheDocument();
    expect(screen.getByText('Tax (5%)')).toBeInTheDocument();
    expect(screen.getByText('₹40')).toBeInTheDocument();
  });

});

describe('PaymentMethodSelector Component', () => {
  
  const mockSetPaymentMethod = jest.fn();
  const mockSetShowSplit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TC-010: Should render all payment method buttons
  test('TC-010: renders all payment buttons', () => {
    render(
      <PaymentMethodSelector
        paymentMethod="cash"
        setPaymentMethod={mockSetPaymentMethod}
        showSplit={false}
        setShowSplit={mockSetShowSplit}
      />
    );
    
    expect(screen.getByTestId('payment-cash-btn')).toBeInTheDocument();
    expect(screen.getByTestId('payment-card-btn')).toBeInTheDocument();
    expect(screen.getByTestId('payment-upi-btn')).toBeInTheDocument();
  });

  // TC-011: Should call setPaymentMethod when method clicked
  test('TC-011: calls setPaymentMethod when clicked', () => {
    render(
      <PaymentMethodSelector
        paymentMethod="cash"
        setPaymentMethod={mockSetPaymentMethod}
        showSplit={false}
        setShowSplit={mockSetShowSplit}
      />
    );
    
    fireEvent.click(screen.getByTestId('payment-card-btn'));
    expect(mockSetPaymentMethod).toHaveBeenCalledWith('card');
  });

  // TC-012: Should render split button
  test('TC-012: renders split button', () => {
    render(
      <PaymentMethodSelector
        paymentMethod="cash"
        setPaymentMethod={mockSetPaymentMethod}
        showSplit={false}
        setShowSplit={mockSetShowSplit}
      />
    );
    
    expect(screen.getByTestId('split-payment-btn')).toBeInTheDocument();
  });

  // TC-013: Should toggle split when clicked
  test('TC-013: toggles split when clicked', () => {
    render(
      <PaymentMethodSelector
        paymentMethod="cash"
        setPaymentMethod={mockSetPaymentMethod}
        showSplit={false}
        setShowSplit={mockSetShowSplit}
      />
    );
    
    fireEvent.click(screen.getByTestId('split-payment-btn'));
    expect(mockSetShowSplit).toHaveBeenCalled();
  });

});

describe('CashInputSection Component', () => {
  
  const mockSetAmountReceived = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // TC-014: Should render cash input
  test('TC-014: renders cash input', () => {
    render(
      <CashInputSection
        amountReceived=""
        setAmountReceived={mockSetAmountReceived}
        finalTotal={1000}
        change={0}
        quickAmounts={[1000, 1100, 1500]}
      />
    );
    
    expect(screen.getByTestId('cash-amount-input')).toBeInTheDocument();
  });

  // TC-015: Should render quick amount buttons
  test('TC-015: renders quick amount buttons', () => {
    render(
      <CashInputSection
        amountReceived=""
        setAmountReceived={mockSetAmountReceived}
        finalTotal={1000}
        change={0}
        quickAmounts={[1000, 1100, 1500]}
      />
    );
    
    expect(screen.getByText('₹1000')).toBeInTheDocument();
    expect(screen.getByText('₹1100')).toBeInTheDocument();
    expect(screen.getByText('₹1500')).toBeInTheDocument();
  });

  // TC-016: Should call setAmountReceived when quick amount clicked
  test('TC-016: sets amount when quick button clicked', () => {
    render(
      <CashInputSection
        amountReceived=""
        setAmountReceived={mockSetAmountReceived}
        finalTotal={1000}
        change={0}
        quickAmounts={[1000, 1100, 1500]}
      />
    );
    
    fireEvent.click(screen.getByText('₹1100'));
    expect(mockSetAmountReceived).toHaveBeenCalledWith('1100');
  });

  // TC-017: Should show change when amount >= total
  test('TC-017: shows change when amount sufficient', () => {
    render(
      <CashInputSection
        amountReceived="1200"
        setAmountReceived={mockSetAmountReceived}
        finalTotal={1000}
        change={200}
        quickAmounts={[1000, 1100, 1500]}
      />
    );
    
    expect(screen.getByText('Change to Return')).toBeInTheDocument();
    expect(screen.getByText('₹200')).toBeInTheDocument();
  });

  // TC-018: Should NOT show change when amount < total
  test('TC-018: does not show change when amount insufficient', () => {
    render(
      <CashInputSection
        amountReceived="500"
        setAmountReceived={mockSetAmountReceived}
        finalTotal={1000}
        change={0}
        quickAmounts={[1000, 1100, 1500]}
      />
    );
    
    expect(screen.queryByText('Change to Return')).not.toBeInTheDocument();
  });

});
