import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, participantName, loginCode, contestLocation, contestDate } = await request.json();

    // Create transporter - using Gmail SMTP by default
    // For production, use environment variables for credentials
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_APP_PASSWORD, // Use App Password for Gmail
      },
    });

    // If no email credentials are set, return a helpful message
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('Email credentials not configured. Email not sent.');
      return NextResponse.json({ 
        success: false, 
        message: 'Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.',
        loginCode // Return the code so it can be displayed to the admin
      });
    }

    // Default email template if html is not provided
    const emailHtml = html || `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; border: 3px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #3b82f6; font-family: monospace; }
            .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📸 Vacation Photo Contest</h1>
            </div>
            <div class="content">
              <h2>Hello ${participantName}!</h2>
              <p>You've been added to a photo contest!</p>
              <p><strong>Contest:</strong> ${contestLocation}</p>
              <p><strong>Date:</strong> ${contestDate}</p>
              <p>Your login code is:</p>
              <div class="code-box">
                <div class="code">${loginCode}</div>
              </div>
              <p>Use this code to log in and start submitting your photos!</p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" class="button">Log In Now</a>
              </p>
              <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
                If you have any questions, please contact the contest organizer.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Vacation Photo Contest app.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: `"Vacation Photo Contest" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject || `Your Photo Contest Login Code - ${contestLocation}`,
      html: emailHtml,
    });

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
}

