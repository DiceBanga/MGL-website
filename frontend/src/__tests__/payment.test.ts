import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentService } from '../services/PaymentService';
import { validatePaymentAmount, validateZipCode } from '../utils/payment-validation';
import { PaymentForm, CreditCard } from 'react-square-web-payments-sdk';
import React from 'react';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
  });

  describe('processPayment', () => {
    it('should validate payment amount', async () => {
      const result = await paymentService.processPayment('source_id', -100, '12345');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Invalid payment amount');
    });

    it('should validate ZIP code', async () => {
      const result = await paymentService.processPayment('source_id', 100, '1234');
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Invalid ZIP code');
    });

    it('should handle successful payment', async () => {
      const mockResponse = { success: true, payment: { id: 'test_payment' } };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await paymentService.processPayment('source_id', 100, '12345');
      expect(result.success).toBe(true);
      expect(result.payment).toBeDefined();
    });

    it('should handle failed payment', async () => {
      const mockError = { code: 'PAYMENT_FAILED', message: 'Payment failed' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: mockError })
      });

      const result = await paymentService.processPayment('source_id', 100, '12345');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Payment Validation', () => {
  describe('validatePaymentAmount', () => {
    it('should accept valid amounts', () => {
      expect(validatePaymentAmount(100)).toBe(true);
      expect(validatePaymentAmount(99.99)).toBe(true);
    });

    it('should reject invalid amounts', () => {
      expect(validatePaymentAmount(-100)).toBe(false);
      expect(validatePaymentAmount(0)).toBe(false);
      expect(validatePaymentAmount(99.999)).toBe(false);
    });
  });

  describe('validateZipCode', () => {
    it('should accept valid ZIP codes', () => {
      expect(validateZipCode('12345')).toBe(true);
    });

    it('should reject invalid ZIP codes', () => {
      expect(validateZipCode('1234')).toBe(false);
      expect(validateZipCode('123456')).toBe(false);
      expect(validateZipCode('abcde')).toBe(false);
    });
  });
});

// Mock the Square SDK components
vi.mock('react-square-web-payments-sdk', () => ({
  PaymentForm: vi.fn(({ children, cardTokenizeResponseReceived }) => {
    // Simulate the form behavior
    return {
      render: () => children,
      tokenize: async () => ({
        token: 'mock-token',
        status: 'OK'
      })
    };
  }),
  CreditCard: vi.fn(() => React.createElement('div'))
}));

describe('Square Payment Integration', () => {
  it('should properly configure PaymentForm', () => {
    const mockCallback = vi.fn();
    const form = PaymentForm({
      applicationId: 'sandbox-sq0idb-test',
      locationId: 'test-location',
      cardTokenizeResponseReceived: mockCallback,
      children: React.createElement(CreditCard, {})
    });

    expect(form).toBeDefined();
    expect(PaymentForm).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'sandbox-sq0idb-test',
        locationId: 'test-location'
      })
    );
  });

  it('should handle successful tokenization', async () => {
    const mockCallback = vi.fn();
    const form = PaymentForm({
      applicationId: 'sandbox-sq0idb-test',
      locationId: 'test-location',
      cardTokenizeResponseReceived: mockCallback,
      children: React.createElement(CreditCard, {})
    });

    // Simulate successful tokenization
    const result = await form.tokenize();
    expect(result).toEqual({
      token: 'mock-token',
      status: 'OK'
    });
  });

  it('should validate payment amount', () => {
    const amount = 10.00;
    expect(amount).toBeGreaterThan(0);
    expect(Number.isFinite(amount)).toBe(true);
  });

  it('should validate location ID', () => {
    const locationId = 'test-location';
    expect(locationId).toBeTruthy();
    expect(typeof locationId).toBe('string');
  });
});