// CR-527 / BB-09 — diner name/mobile on credit rows
import { customerDetailFromAPI } from '../creditTransform';

describe('CR-527 — diner fields on credit rows', () => {
  it('maps diner_name/diner_mobile → dinerName/dinerMobile', () => {
    const data = {
      'customer-transaction-list': [
        {
          id: 1,
          order_id: 5,
          restaurant_order_id: '021540',
          credit_order_amount: '420',
          current_balance: '420',
          diner_name: 'Abhishek',
          diner_mobile: '9990001111',
        },
      ],
    };
    const { credits } = customerDetailFromAPI(data);
    expect(credits[0].dinerName).toBe('Abhishek');
    expect(credits[0].dinerMobile).toBe('9990001111');
  });

  it('defaults diner fields to null when the backend omits them (historical rows)', () => {
    const data = {
      'customer-transaction-list': [
        { id: 2, order_id: 6, credit_order_amount: '100' },
      ],
    };
    const { credits } = customerDetailFromAPI(data);
    expect(credits[0].dinerName).toBeNull();
    expect(credits[0].dinerMobile).toBeNull();
  });
});
