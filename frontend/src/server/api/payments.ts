import { Router } from 'express';
import { Client, Environment } from 'square';
import { v4 as uuidv4 } from 'uuid';
import { paymentMetadataMiddleware } from '../middleware/paymentMetadata';

const router = Router();

// Apply payment metadata middleware
router.use(paymentMetadataMiddleware);

const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: Environment.Sandbox
});

router.post('/process', async (req, res) => {
  const { sourceId, amount, idempotencyKey = uuidv4(), paymentRecordId } = req.body;

  try {
    const { result } = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey,
      amountMoney: {
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'USD'
      },
      locationId: process.env.SQUARE_LOCATION_ID
    });

    // Verify payment was successful
    if (!result.payment || result.payment.status !== 'COMPLETED') {
      throw new Error(`Payment failed with status: ${result.payment?.status}`);
    }

    res.json({
      success: true,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        receiptUrl: result.payment.receiptUrl,
        amount: result.payment.amountMoney?.amount,
        currency: result.payment.amountMoney?.currency
      }
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed'
    });
  }
});

router.get('/verify/:paymentId', async (req, res) => {
  const { paymentId } = req.params;

  try {
    const { result } = await squareClient.paymentsApi.getPayment(paymentId);

    if (!result.payment) {
      throw new Error('Payment not found');
    }

    res.json({
      success: true,
      status: result.payment.status,
      payment: {
        id: result.payment.id,
        status: result.payment.status,
        receiptUrl: result.payment.receiptUrl,
        amount: result.payment.amountMoney?.amount,
        currency: result.payment.amountMoney?.currency
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed'
    });
  }
});

export default router;