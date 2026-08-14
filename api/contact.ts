export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use POST.',
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON body in request.',
        });
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a valid JSON object.',
      });
    }

    // Honeypot spam check - if hidden bot field is filled, reject
    const honeypot = body.website_hp || body.hp_field || body.bot_field || '';
    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Spam submission detected.',
      });
    }

    // Extract & sanitize form fields
    const sanitize = (str: unknown, maxLen = 500): string => {
      if (typeof str !== 'string') return '';
      return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLen);
    };

    const name = sanitize(body.name, 200);
    const phone = sanitize(body.phone, 50);
    const email = sanitize(body.email, 200);
    const city = sanitize(body.city, 200);
    const service = sanitize(body.service || body.serviceNeeded, 200);
    const message = sanitize(body.message, 2000);

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Your Full Name is required.',
      });
    }

    if (!phone || phone.length < 7) {
      return res.status(400).json({
        success: false,
        error: 'A valid Phone Number is required.',
      });
    }

    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'City / Location is required.',
      });
    }

    if (!service) {
      return res.status(400).json({
        success: false,
        error: 'Service Needed is required.',
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    // Target Google Apps Script Web App URL
    const webhookUrl =
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
      'https://script.google.com/macros/s/AKfycbz0v3r0fYvggUx5qGUFUgqIyRopT687iE_wZqYqCvtAWNTEKtA0ovub2yp60GiQTMh0/exec';

    // Required Fixed Structure for Google Sheets
    const sheetsPayload = {
      sheet: 'Johnson City',
      website: 'garagedoorrepairjohnsoncity.com',
      name,
      phone,
      email: email || '',
      city,
      service,
      message: message || '',
    };

    // Forward to Google Apps Script with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const gasResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sheetsPayload),
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!gasResponse.ok) {
      console.error(
        `[Google Sheets Webhook Error] Status: ${gasResponse.status} ${gasResponse.statusText}`
      );
      return res.status(502).json({
        success: false,
        error: "Sorry, we couldn't send your request. Please call us directly.",
      });
    }

    // Safe response verification
    const responseText = await gasResponse.text();
    let responseJson: any = null;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      // Non-JSON response text from Google Apps Script
      responseJson = null;
    }

    if (
      gasResponse.status === 200 &&
      (responseJson === null || responseJson.success === true || !responseJson.error)
    ) {
      return res.status(200).json({
        success: true,
        message: "Thank you. Your request has been received. We'll be in touch shortly.",
      });
    }

    console.error('[Google Sheets Response Error]', responseJson || responseText);
    return res.status(502).json({
      success: false,
      error: "Sorry, we couldn't send your request. Please call us directly.",
    });
  } catch (err: any) {
    console.error('[API /api/contact Exception]:', err);
    return res.status(500).json({
      success: false,
      error: "Sorry, we couldn't send your request. Please call us directly.",
    });
  }
}
