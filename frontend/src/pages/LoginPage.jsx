import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { COLORS, GENIE_LOGO_URL } from "../constants";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import * as authService from "../api/services/authService";
import { requestFCMToken } from "../config/firebase";

// Login Screen Component
const LoginPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated } = useAuth();
  const hasNavigatedRef = useRef(false);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for remembered email on mount and redirect if already authenticated
  useEffect(() => {
    const rememberedEmail = authService.getRememberedEmail();
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    
    // If already authenticated (e.g., page refresh with valid token), redirect to loading
    if (isAuthenticated && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigate("/loading", { replace: true });
    }
  }, [navigate, isAuthenticated]);

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
      // Get FCM token before login (permission prompt shows here)
      let fcmToken = null;
      try {
        const fcmResult = await requestFCMToken();
        console.log('[Login] FCM result:', fcmResult);
        
        // Handle new response format { error, token }
        if (fcmResult && typeof fcmResult === 'object') {
          fcmToken = fcmResult.token;
          
          // Warn user if notifications are denied
          if (fcmResult.error === 'denied') {
            toast({
              title: "Notifications Disabled",
              description: "You won't receive order alerts. Enable in browser settings (🔒 icon → Notifications → Allow)",
              variant: "destructive",
              duration: 8000,
            });
          }
        } else {
          // Backward compatibility: old format returned token directly
          fcmToken = fcmResult;
        }
      } catch (fcmErr) {
        console.warn('[Login] FCM token request failed, proceeding without it:', fcmErr.message);
      }

      console.log('[Login] Proceeding with FCM token:', fcmToken ? 'YES' : 'NO');
      
      // Call login via AuthContext with FCM token in payload
      await login({ email, password, fcmToken }, rememberMe);
      
      // Navigate to loading screen on success
      navigate("/loading", { replace: true });
      
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
        <div className="text-center mb-8">
          <h1 
            className="text-xl font-semibold"
            style={{ color: COLORS.primaryOrange }}
          >
            Streamlined Hospitality.
          </h1>
          <h2 
            className="text-xl font-semibold"
            style={{ color: COLORS.primaryGreen }}
          >
            Exceptional Experience.
          </h2>
        </div>

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

        {/* Footer */}
        <p 
          className="text-center text-xs mt-8"
          style={{ color: COLORS.grayText }}
        >
          © Mygenie 2025. HOSIGENIE HOSPITALITY SERVICES PRIVATE LIMITED. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
