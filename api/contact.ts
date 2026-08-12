import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Reject non-POST requests with HTTP 405 Method Not Allowed
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Only POST requests are supported.'
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
          error: 'Invalid JSON request payload.'
        });
      }
    }

    const { name, phone, email, city, serviceNeeded, message, sourcePage } = body || {};

    // Validate required fields
    if (!name || !phone || !city || !serviceNeeded) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: Name, Phone, City, and Service Needed are required.'
      });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('[Resend Error] RESEND_API_KEY is missing.');
      return res.status(500).json({
        success: false,
        error: 'Email service is not configured. Please call us directly.'
      });
    }

    const resend = new Resend(apiKey);
    const toEmail = process.env.LEAD_NOTIFICATION_EMAIL || 'contact@garagedoorrepairjohnsoncity.com';
    const fromEmail = 'Website Leads <contact@garagedoorrepairjohnsoncity.com>';

    const emailPayload: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      replyTo?: string;
    } = {
      from: fromEmail,
      to: [toEmail],
      subject: `🚨 New Lead: ${serviceNeeded} in ${city} - ${name}`,
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #1e3a8a; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 800;">🚨 New Lead Request Submitted</h2>
            <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 13px;">Source: ${sourcePage || 'Tri-Cities Garage Door Repair Website'}</p>
          </div>

          <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; width: 130px; color: #64748b;">Customer Name:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Phone Number:</td>
                <td style="padding: 8px 0; font-weight: 800; color: #1e3a8a;"><a href="tel:${phone}" style="color: #1e3a8a; text-decoration: none;">${phone}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Email Address:</td>
                <td style="padding: 8px 0; color: #0f172a;">${email ? `<a href="mailto:${email}" style="color: #2563eb;">${email}</a>` : 'Not provided'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Location / City:</td>
                <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${city}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b;">Service Requested:</td>
                <td style="padding: 8px 0; font-weight: 800; color: #d97706;">${serviceNeeded}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #64748b; vertical-align: top;">Issue Details:</td>
                <td style="padding: 8px 0; color: #334155; line-height: 1.5;">${message ? String(message).replace(/\n/g, '<br/>') : 'No additional details provided'}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="tel:${phone}" style="background-color: #d97706; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 900; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              📞 Call Lead (${phone})
            </a>
          </div>
        </div>
      `
    };

    if (email && typeof email === 'string' && email.trim() !== '') {
      emailPayload.replyTo = email.trim();
    }

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('[Resend Error]', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to send lead email notification.'
      });
    }

    return res.status(200).json({
      success: true,
      message: "Thank you. Your request has been received. We'll be in touch shortly.",
      id: data?.id
    });
  } catch (err: any) {
    console.error('[Contact API Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'An unexpected server error occurred.'
    });
  }
}
