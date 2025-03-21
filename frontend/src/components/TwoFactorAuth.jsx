import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const TwoFactorAuth = ({ email, onVerified }) => {
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  

  // Enable Google 2FA
  const enableTwoFactorAuth = async () => {
    try {
      const response = await axios.post("http://localhost:5000/api/auth/enable-2fa", { email });
      setQrCodeUrl(response.data.qrCodeUrl);
      toast.success("2FA enabled! Scan the QR code with Google Authenticator");
    } catch (error) {
      toast.error("Failed to enable 2FA");
    }
  };
  // Verify OTP for Google Authenticator
  const verifyGoogleOtp = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/verify-2fa", { email, token: otp });
      toast.success("OTP verified!");
      onVerified();
    } catch (error) {
      toast.error("Invalid OTP");
    }
  };



  


  // Send OTP
  const sendOtp = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/send-otp", { email, phone: null });
      toast.success("OTP sent to your email or phone");
      setIsOtpSent(true);
    } catch (error) {
      toast.error("Failed to send OTP");
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/verify-otp", { email, otp });
      toast.success("OTP verified!");
      onVerified(); // Call parent function after verification
    } catch (error) {
      toast.error("Invalid OTP");
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      {!isOtpSent ? (
        <button onClick={sendOtp} className="bg-blue-500 text-white p-2 rounded">Send OTP</button>
      ) : (
        <div>
           <img src={qrCodeUrl} alt="QR Code" />
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <button onClick={verifyOtp} className="mt-2 bg-green-500 text-white p-2 rounded">Verify OTP</button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorAuth;
