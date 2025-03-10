import { verifyCashAppSignature } from '../utils/cashapp-utils';
import { supabase } from '../../lib/supabase';

export async function handleCashAppWebhook(req, res) {
  try {
    // Verify webhook signature
    const signature = req.headers['x-cashapp-signature'];
    if (!verifyCashAppSignature(signature, req.body)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;

    // Handle different event types
    switch (event.type) {
      case 'payment.completed':
        await handlePaymentCompleted(event.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.data);
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

async function handlePaymentCompleted(payment) {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
      payment_id: payment.id,
      metadata: { cashappPayment: payment }
    })
    .eq('id', payment.metadata.paymentId);

  if (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
}

async function handlePaymentFailed(payment) {
  const { error } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      updated_at: new Date().toISOString(),
      error: payment.failure_reason,
      metadata: { cashappPayment: payment }
    })
    .eq('id', payment.metadata.paymentId);

  if (error) {
    console.error('Error updating payment:', error);
    throw error;
  }
}