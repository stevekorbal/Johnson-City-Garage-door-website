import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

let resendClient: Resend | null = null;
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_RESEND_API_KEY") {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Lead Form Contact Endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, phone, email, city, serviceNeeded, message, sourcePage } = req.body || {};

      if (!name || !phone || !city || !serviceNeeded) {
        return res.status(400).json({
          error: "Missing required fields: Name, Phone, City, and Service Needed are required."
        });
      }

      console.log(`[Lead Form Submitted] Name: ${name}, Phone: ${phone}, Email: ${email || 'N/A'}, City: ${city}, Service: ${serviceNeeded}, Source: ${sourcePage || 'Website'}`);

      const resend = getResendClient();
      let emailSent = false;
      let emailId = null;

      if (resend) {
        const recipient = process.env.LEAD_NOTIFICATION_EMAIL || "contact@garagedoorrepairjohnsoncity.com";
        const emailFrom = process.env.RESEND_FROM_EMAIL || "Tri-Cities Garage Door Repair <onboarding@resend.dev>";

        const emailResponse = await resend.emails.send({
          from: emailFrom,
          to: [recipient],
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
                    <td style="padding: 8px 0; color: #334155; line-height: 1.5;">${message ? message.replace(/\n/g, '<br/>') : 'No additional details provided'}</td>
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
        });

        if (emailResponse.error) {
          console.error('[Resend Error]', emailResponse.error);
        } else {
          console.log('[Resend Success] Notification email sent ID:', emailResponse.data?.id);
          emailSent = true;
          emailId = emailResponse.data?.id;
        }
      } else {
        console.warn('[Resend] RESEND_API_KEY environment variable is not set. Lead submission logged locally.');
      }

      return res.json({
        success: true,
        message: "Lead submitted successfully",
        emailSent,
        id: emailId
      });
    } catch (err: any) {
      console.error('[Contact API Error]', err);
      return res.status(500).json({ error: err.message || "Failed to process contact submission" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
