"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import "./Login.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loginWithEmail, loginWithGoogle } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(""); // Clear error on input change
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await loginWithEmail(formData.email, formData.password);
      // Redirection is handled by the useEffect
    } catch (err) {
      console.error("Login error:", err);
      // Handle Firebase Auth specific error codes
      const errorCode = err.code;
      if (errorCode === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (
        errorCode === "auth/wrong-password" ||
        errorCode === "auth/invalid-credential"
      ) {
        setError("Incorrect email or password.");
      } else if (errorCode === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (errorCode === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      // Redirection is handled by the useEffect
    } catch (err) {
      console.error("Google login error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else {
        setError(err.message || "Google login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-split-card">
        {/* Left Side - Image */}
        <div className="login-image-section">
          <div className="image-overlay">
            <div className="overlay-content">
              <h2>SplitRight Settlement System</h2>
              <p>Settle debts effortlessly and securely.</p>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-form-section">
          <div className="login-content">
            {/* Header */}
            <div className="login-header">
              <h1 className="login-title">Welcome Back</h1>
              <p className="login-subtitle">Sign in to your account</p>
            </div>

            {/* Form Section */}
            <div className="login-form-wrapper">
              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                  <div className="form-field">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      className="form-input"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      className="form-input"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    <div className="forgot-password">
                      <Link href="/login">Forgot password?</Link>
                    </div>
                  </div>
                </div>
                <div className="divider">
                  <span>or</span>
                </div>
                <button
                  type="button"
                  className="google-login-btn"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    width="18"
                    height="18"
                  />
                  Login with Google
                </button>
                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Login"}
                </button>
              </form>

              <div className="signup-text">
                <p>
                  Don't have an account?{" "}
                  <Link href="/login?signup=true" className="signup-link">
                    Sign up
                  </Link>
                </p>
              </div>

              {/* Social Icons */}
              <div className="social-icons">
                <a href="#" className="social-icon">
                  <i className="ri-facebook-fill"></i>
                </a>
                <a href="#" className="social-icon">
                  <i className="ri-twitter-fill"></i>
                </a>
                <a href="#" className="social-icon">
                  <i className="ri-linkedin-fill"></i>
                </a>
                <a href="#" className="social-icon">
                  <i className="ri-instagram-line"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
