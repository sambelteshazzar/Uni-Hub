async function sendSms (to, message) {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

  if (provider === 'africastalking') {
    return _sendViaAfricasTalking(to, message);
  }

  if (provider === 'twilio') {
    return _sendViaTwilio(to, message);
  }

  if (provider === 'vonage') {
    return _sendViaVonage(to, message);
  }

  console.warn('SMS not configured — OTP will be logged to console. Set SMS_PROVIDER (africastalking|twilio|vonage) and corresponding credentials in .env');
  console.info(`[SMS] To: ${to} | Message: ${message}`);
  return { success: true, fallback: true, message: 'SMS logged to console (no provider configured)' };
}

async function _sendViaAfricasTalking (to, message) {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;
  const senderId = process.env.AT_SENDER_ID || '';

  if (!apiKey || !username) {
    console.warn('Africa\'s Talking credentials missing (AT_API_KEY, AT_USERNAME). Falling back to console.');
    console.info(`[SMS] To: ${to} | Message: ${message}`);
    return { success: true, fallback: true };
  }

  try {
    const body = new URLSearchParams({
      username,
      to,
      message,
      ...(senderId ? { from: senderId } : {}),
    });

    const response = await fetch('https://api.africastalking.com/v1/messaging', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        apiKey,
        Accept: 'application/json',
      },
      body: body.toString(),
    });

    const data = await response.json();

    if (data.SMSMessageData && data.SMSMessageData.Recipients) {
      const recipients = data.SMSMessageData.Recipients;
      const failed = recipients.filter(r => r.statusCode !== 101);
      if (failed.length > 0) {
        console.error('Africa\'s Talking SMS failed for some recipients:', failed);
        return { success: false, error: failed.map(r => r.status).join('; ') };
      }
      return { success: true };
    }

    return { success: false, error: 'Unexpected response from Africa\'s Talking' };
  } catch (error) {
    console.error('Africa\'s Talking SMS error:', error.message);
    return { success: false, error: error.message };
  }
}

async function _sendViaTwilio (to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio credentials missing (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER). Falling back to console.');
    console.info(`[SMS] To: ${to} | Message: ${message}`);
    return { success: true, fallback: true };
  }

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message }).toString(),
    });

    const data = await response.json();

    if (data.status === 'queued' || data.status === 'sent') {
      return { success: true };
    }

    console.error('Twilio SMS error:', data.message || data.error_code);
    return { success: false, error: data.message || 'Twilio send failed' };
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    return { success: false, error: error.message };
  }
}

async function _sendViaVonage (to, message) {
  const apiKey = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;
  const from = process.env.VONAGE_FROM || 'UniHub';

  if (!apiKey || !apiSecret) {
    console.warn('Vonage credentials missing (VONAGE_API_KEY, VONAGE_API_SECRET). Falling back to console.');
    console.info(`[SMS] To: ${to} | Message: ${message}`);
    return { success: true, fallback: true };
  }

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      to,
      from,
      text: message,
    });

    const response = await fetch(`https://rest.nexmo.com/sms/json?${params.toString()}`);
    const data = await response.json();

    if (data.messages && data.messages[0]) {
      const msg = data.messages[0];
      if (msg.status === '0') {
        return { success: true };
      }
      console.error('Vonage SMS error:', msg['error-text']);
      return { success: false, error: msg['error-text'] };
    }

    return { success: false, error: 'Unexpected Vonage response' };
  } catch (error) {
    console.error('Vonage SMS error:', error.message);
    return { success: false, error: error.message };
  }
}

async function sendOtpSms (to, code) {
  const message = `Your Uni-Hub verification code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`;
  return sendSms(to, message);
}

module.exports = { sendSms, sendOtpSms };
