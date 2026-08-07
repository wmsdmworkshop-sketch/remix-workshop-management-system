/**
 * DWIP Enterprise Integration Gateway - v1 Contracts
 * ICrmContract: CRM Customer API Contract Interface v1
 */

import { DwipCustomer } from '../../types';

export interface ICrmContractV1 {
  readonly contractVersion: 'v1';

  getCustomerById(customerId: string): Promise<DwipCustomer | null>;
  getCustomerByPhone(phoneNumber: string): Promise<DwipCustomer | null>;
  syncCustomer(customer: Partial<DwipCustomer>): Promise<DwipCustomer>;
}
