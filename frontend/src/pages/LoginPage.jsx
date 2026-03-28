import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../constants";
import { useToast } from "../hooks/use-toast";
import * as authService from "../api/services/authService";

// Login Screen Component
const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for remembered email on mount
  useEffect(() => {
    const rememberedEmail = authService.getRememberedEmail();
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    
    // If already authenticated, redirect to loading
    if (authService.isAuthenticated()) {
      navigate("/loading");
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Validation Error",
        description: "Please enter email and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Call login API
      await authService.login({ email, password }, rememberMe);
      
      // Navigate to loading screen on success
      navigate("/loading");
      
    } catch (error) {
      // Show error toast with API message
      toast({
        title: "Login Failed",
        description: error.readableMessage || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast({
      title: "Coming Soon",
      description: "Forgot password functionality will be available soon.",
    });
  };

  const handleRequestDemo = () => {
    toast({
      title: "Coming Soon", 
      description: "Demo request functionality will be available soon.",
    });
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
          {/* Email Field */}
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
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 outline-none text-sm bg-transparent"
                style={{ color: COLORS.darkText }}
                data-testid="login-email"
                required
                autoComplete="email"
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
                className="flex-1 outline-none text-sm bg-transparent"
                style={{ color: COLORS.darkText }}
                data-testid="login-password"
                required
                autoComplete="current-password"
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
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ backgroundColor: COLORS.primaryGreen }}
            data-testid="login-button"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Logging in...
              </span>
            ) : (
              "LOG IN"
            )}
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
          © 2026 MyGenie Restaurant POS. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
