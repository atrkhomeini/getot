import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  console.log('=== SEND EMAIL API CALLED ===')

  try {
    const body = await request.json()
    const { type, data } = body
    console.log('Request body:', { type, data })

    // Check environment variables
    console.log('Checking env vars...')
    console.log('SMTP_EMAIL:', process.env.SMTP_EMAIL ? 'SET' : 'NOT SET')
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'SET' : 'NOT SET')
    console.log('OWNER_EMAIL:', process.env.OWNER_EMAIL || 'NOT SET')

    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.error('❌ SMTP credentials not configured')
      return NextResponse.json(
        { error: 'Email service not configured. Check SMTP_EMAIL and SMTP_PASSWORD env vars.' },
        { status: 500 }
      )
    }

    // Create transporter
    console.log('Creating transporter...')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    // Verify connection
    console.log('Verifying SMTP connection...')
    try {
      await transporter.verify()
      console.log('✅ SMTP connection verified')
    } catch (verifyError: any) {
      console.error('❌ SMTP verification failed:', verifyError)
      return NextResponse.json(
        { error: 'Failed to connect to email server. Check your App Password.' },
        { status: 500 }
      )
    }

    if (type === 'exercise_request') {
      const { userName, requestText, requestDate } = data
      
      console.log('Preparing email for exercise request...')
      
      const mailOptions = {
        from: `"Getot Gym App" <${process.env.SMTP_EMAIL}>`,
        to: process.env.OWNER_EMAIL || process.env.SMTP_EMAIL,
        subject: `🏋️ New Exercise Request from ${userName}`,
        html: `
          <h2>New Exercise Request</h2>
          <p><strong>User:</strong> ${userName}</p>
          <p><strong>Date:</strong> ${requestDate}</p>
          <p><strong>Request:</strong></p>
          <p>${requestText}</p>
        `,
        text: `
New Exercise Request
User: ${userName}
Date: ${requestDate}
Request: ${requestText}
        `,
      }

      console.log('Sending email...')
      const info = await transporter.sendMail(mailOptions)
      console.log('✅ Email sent successfully:', info.messageId)

      return NextResponse.json({ 
        success: true, 
        messageId: info.messageId 
      })
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })

  } catch (error: any) {
    console.error('=== EMAIL ERROR ===')
    console.error('Error:', error)
    console.error('Message:', error?.message)
    console.error('Code:', error?.code)
    
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error?.message || 'Unknown error',
        code: error?.code
      },
      { status: 500 }
    )
  }
}