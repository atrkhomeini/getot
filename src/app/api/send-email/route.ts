import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data } = body

    // Validate environment variables
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.error('SMTP credentials not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    let mailOptions

    if (type === 'exercise_request') {
      const { userName, requestText, requestDate } = data
      
      mailOptions = {
        from: `"Getot Gym App" <${process.env.SMTP_EMAIL}>`,
        to: process.env.OWNER_EMAIL || process.env.SMTP_EMAIL,
        subject: `New Exercise Request from ${userName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FF6B6B, #4ECDC4); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .header h1 { color: white; margin: 0; font-size: 24px; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .request-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #FF6B6B; margin: 20px 0; }
              .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; }
              .label { font-weight: bold; color: #666; }
              .value { color: #333; }
              .button { display: inline-block; padding: 12px 24px; background: #FF6B6B; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
              .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏋️ New Exercise Request</h1>
              </div>
              <div class="content">
                <p>A user has submitted a new exercise request:</p>
                
                <div class="request-box">
                  <div class="info-row">
                    <span class="label">User:</span>
                    <span class="value">${userName}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Date:</span>
                    <span class="value">${requestDate}</span>
                  </div>
                  <div class="info-row" style="flex-direction: column; align-items: flex-start;">
                    <span class="label" style="margin-bottom: 8px;">Request:</span>
                    <span class="value" style="white-space: pre-wrap;">${requestText}</span>
                  </div>
                </div>
                
                <p style="margin-top: 20px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" class="button">
                    View in Admin Dashboard
                  </a>
                </p>
                
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                  Log in to your admin dashboard to review and resolve this request.
                </p>
              </div>
              <div class="footer">
                <p>This email was sent from Getot Gym App</p>
                <p>${process.env.NEXT_PUBLIC_APP_URL}</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
New Exercise Request

User: ${userName}
Date: ${requestDate}

Request:
 ${requestText}

---
View in Admin Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/admin

Sent from Getot Gym App
        `,
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      )
    }

    // Send email
    const info = await transporter.sendMail(mailOptions)
    
    console.log('Email sent successfully:', info.messageId)

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId 
    })
  } catch (error: any) {
    console.error('Error sending email:', {
      message: error.message,
      code: error.code,
      command: error.command,
    })
    
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    )
  }
}