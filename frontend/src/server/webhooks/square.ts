import { verifySquareSignature } from '../utils/square-utils';
import { supabase } from '../../lib/supabase';

export async function handleSquareWebhook(req, res) {
  try {
    // Verify webhook signature
    const signature = req.headers['x-square-signature'];
    if (!verifySquareSignature(signature, req.body)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle different event types
    switch (event.type) {
      case 'payment.updated':
        await handlePaymentUpdate(event.data.object);
        break;
      case 'refund.updated':
        await handleRefundUpdate(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handlePaymentUpdate(payment) {
  const { error } = await supabase
    .from('payments')
    .update({
      status: payment.status,
      updated_at: new Date().toISOString(),
      metadata: { squarePayment: payment }
    })
    .eq('payment_id', payment.id);

  if (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
}

async function handleRefundUpdate(refund) {
  const { error } = await supabase
    .from('refunds')
    .update({
      status: refund.status,
      updated_at: new Date().toISOString(),
      metadata: { squareRefund: refund }
    })
    .eq('refund_id', refund.id);

  if (error) {
    console.error('Error updating refund:', error);
    throw error;
  }
}