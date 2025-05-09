// utils/sendEmail.js
import nodemailer from "nodemailer";
import dotenv from 'dotenv';

dotenv.config();

// Create a transporter for sending emails
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});

// Generic email sending function
export const sendEmail = async (to, subject, text, html = null) => {
  try {
    const mailOptions = {
      from: `"Quick Response Team" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || undefined
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

// Send broadcast emails
export const sendBroadcastEmail = async (to, subject, text) => {
  return sendEmail(to, subject, text);
};

// Send SOS alert to emergency contacts
export const sendSOSEmergencyAlert = async (to, userName, message, coordinates, timestamp) => {
  const subject = `URGENT: SOS EMERGENCY ALERT - ${userName} NEEDS HELP`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #ff0000; border-radius: 5px;">
      <h2 style="color: #ff0000; text-align: center;">EMERGENCY SOS ALERT</h2>
      <p style="font-size: 16px; margin-bottom: 20px;"><strong>${userName}</strong> has triggered an emergency SOS alert and may need immediate assistance.</p>
      <p style="font-size: 16px;"><strong>Message:</strong> ${message || 'No message provided'}</p>
      <p style="font-size: 16px;"><strong>Location:</strong> <a href="https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}" target="_blank">View on Google Maps</a></p>
      <p style="font-size: 16px;"><strong>Time:</strong> ${new Date(timestamp).toLocaleString()}</p>
      <div style="margin-top: 30px; padding: 15px; background-color: #f8f8f8; border-radius: 5px;">
        <p style="font-size: 14px; margin: 0;">This is an automated emergency alert from the Quick Response Team app. Please contact emergency services if you believe this is a serious situation.</p>
      </div>
    </div>
  `;
  
  const textContent = `
    EMERGENCY SOS ALERT
    
    ${userName} has triggered an emergency SOS alert and may need immediate assistance.
    
    Message: ${message || 'No message provided'}
    Location: https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}
    Time: ${new Date(timestamp).toLocaleString()}
    
    This is an automated emergency alert from the Quick Response Team app. Please contact emergency services if you believe this is a serious situation.
  `;
  
  return sendEmail(to, subject, textContent, htmlContent);
};

// Send SMS via email-to-SMS gateways (major US carriers)
export const sendSMS = async (phoneNumber, message, carrier) => {
  try {
    // Common email-to-SMS gateways for major carriers
    const carriers = {
      'att': `${phoneNumber}@txt.att.net`,
      'tmobile': `${phoneNumber}@tmomail.net`,
      'verizon': `${phoneNumber}@vtext.com`,
      'sprint': `${phoneNumber}@messaging.sprintpcs.com`,
      'boost': `${phoneNumber}@sms.myboostmobile.com`,
      'cricket': `${phoneNumber}@sms.cricketwireless.net`,
      'metro': `${phoneNumber}@mymetropcs.com`,
      'uscellular': `${phoneNumber}@email.uscc.net`,
      'virgin': `${phoneNumber}@vmobl.com`,
    };
    
    // If carrier is known, use specific gateway
    let recipient;
    if (carrier && carriers[carrier.toLowerCase()]) {
      recipient = carriers[carrier.toLowerCase()];
    } else {
      // Try multiple carriers if unsure
      recipient = [
        carriers.att,
        carriers.tmobile, 
        carriers.verizon
      ].join(',');
    }
    
    const mailOptions = {
      from: `"EMERGENCY" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: 'SOS ALERT',
      text: message.substring(0, 160) // SMS typically limited to 160 chars
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log("SMS sent via email gateway:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send SMS via email gateway:", error);
    // Don't throw error for SMS, as it's a best-effort attempt
    return null;
  }
};
