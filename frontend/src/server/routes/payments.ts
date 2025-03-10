import { ApiError, Client, Environment } from 'square';
import { v4 as uuidv4 } from 'uuid';

const client = new Client({
  environment: Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const { paymentsApi } = client;

export async function processPayment(req, res) {
  const { sourceId, amount } = req.body;
  const idempotencyKey = uuidv4();

  try {
    const response = await paymentsApi.createPayment({
      idempotencyKey,
      sourceId,
      amountMoney: {
        amount: amount * 100, // Convert dollars to cents
        currency: 'USD',
      },
      locationId: process.env.SQUARE_LOCATION_ID,
    });

    res.json({ success: true, payment: response.result });
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(400).json({ success: false, errors: error.errors });
    } else {
      res.status(500).json({ success: false, error: 'Payment processing failed' });
    }
  }
} 