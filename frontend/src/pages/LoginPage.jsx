import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../constants";

// Login Screen Component
const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login - in production, this would call your PHP backend
    setTimeout(() => {
      setIsLoading(false);
      // Store remember me preference if needed
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
        localStorage.setItem("username", username);
      }
      // Navigate to dashboard
      navigate("/dashboard");
    }, 1000);
  };

  const handleForgotPassword = () => {
    // Handle forgot password - could open modal or navigate to reset page
    alert("Forgot password functionality will be implemented");
  };

  const handleRequestDemo = () => {
    // Handle demo request - could open modal or navigate to demo request page
    alert("Request demo functionality will be implemented");
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: COLORS.sectionBg }}
      data-testid="login-screen"
    >
      <div 
        className="w-full max-w-md p-8 rounded-2xl shadow-lg"
        style={{ backgroundColor: COLORS.lightBg }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src={GENIE_LOGO_URL} 
            alt="Genie Logo" 
            className="h-24 w-auto"
            data-testid="login-logo"
          />
        </div>

        {/* Title */}
        <h1 
          className="text-center text-xl font-semibold mb-8"
          style={{ color: COLORS.darkText }}
        >
          Restaurant POS System
        </h1>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Username Field */}
          <div>
            <div 
              className="flex items-center gap-3 px-4 py-3 rounded-lg border focus-within:ring-2 focus-within:ring-opacity-50 transition-all"
              style={{ 
                borderColor: COLORS.borderGray, 
                backgroundColor: COLORS.lightBg,
              }}
            >
              <User className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.grayText }} />
              <input
                type="text"
                placeholder="Username or Email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 outline-none text-sm"
                style={{ color: COLORS.darkText }}
                data-testid="login-username"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div 
              className="flex items-center gap-3 px-4 py-3 rounded-lg border focus-within:ring-2 focus-within:ring-opacity-50 transition-all"
              style={{ 
                borderColor: COLORS.borderGray, 
                backgroundColor: COLORS.lightBg,
              }}
            >
              <Lock className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.grayText }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 outline-none text-sm"
                style={{ color: COLORS.darkText }}
                data-testid="login-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                data-testid="toggle-password"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" style={{ color: COLORS.grayText }} />
                ) : (
                  <Eye className="w-5 h-5" style={{ color: COLORS.grayText }} />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Password Row */}
          <div className="flex items-center justify-between">
            {/* Remember Me Checkbox */}
            <label className="flex items-center gap-2 cursor-pointer" data-testid="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                style={{ accentColor: COLORS.primaryGreen }}
              />
              <span className="text-sm" style={{ color: COLORS.grayText }}>
                Remember me
              </span>
            </label>

            {/* Forgot Password Link */}
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm hover:underline transition-colors"
              style={{ color: COLORS.primaryOrange }}
              data-testid="forgot-password"
            >
              Forgot Password?
            </button>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-70"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="login-button"
          >
            {isLoading ? "Logging in..." : "LOG IN"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ backgroundColor: COLORS.borderGray }} />
          <span className="text-sm" style={{ color: COLORS.grayText }}>OR</span>
          <div className="flex-1 h-px" style={{ backgroundColor: COLORS.borderGray }} />
        </div>

        {/* Request Demo Button */}
        <button
          onClick={handleRequestDemo}
          className="w-full py-3 rounded-lg font-semibold border transition-all hover:bg-gray-50"
          style={{ 
            borderColor: COLORS.borderGray, 
            color: COLORS.darkText 
          }}
          data-testid="request-demo"
        >
          Request for Demo
        </button>

        {/* Footer */}
        <p 
          className="text-center text-xs mt-8"
          style={{ color: COLORS.grayText }}
        >
          © 2026 Restaurant POS. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
