"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import "./Signup.css";

function SignupForm() {
  const router = useRouter();
  const { user, signupWithEmail, loginWithGoogle } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
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
      await signupWithEmail(formData.email, formData.password, formData.name);
      // Redirection is handled by the useEffect
    } catch (err) {
      console.error("Signup error:", err);
      // Handle Firebase Auth specific error codes
      const errorCode = err.code;
      if (errorCode === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (errorCode === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else if (errorCode === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError(err.message || "Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      // Redirection is handled by the useEffect
    } catch (err) {
      console.error("Google signup error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Google sign-in was cancelled.");
      } else {
        setError(err.message || "Google signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-split-card">
        {/* Left Side - Image */}
        <div className="signup-image-section">
          <div className="image-overlay">
            <div className="overlay-content">
              <h2>SplitRight Settlement System</h2>
              <p>Join us and settle debts effortlessly.</p>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="signup-form-section">
          <div className="signup-content">
            {/* Header */}
            <div className="signup-header">
              <h1 className="signup-title">Create an Account</h1>
              <p className="signup-subtitle">Sign up to get started</p>
            </div>

            {/* Form Section */}
            <div className="signup-form-wrapper">
              {error && <div className="error-msg">{error}</div>}

              <form onSubmit={handleSubmit} className="signup-form">
                <div className="input-group">
                  <div className="form-field">
                    <label htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      className="form-input"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                  </div>

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
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      minLength="6"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="signup-submit-btn"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Sign Up"}
                </button>
                
                <div className="divider">
                  <span>or</span>
                </div>
                
                <button
                  type="button"
                  className="google-signup-btn"
                  onClick={handleGoogleSignup}
                  disabled={loading}
                >
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                    width="18"
                    height="18"
                  />
                  Sign up with Google
                </button>
              </form>

              <div className="login-text">
                <p>
                  Already have an account?{" "}
                  <Link href="/login" className="login-link">
                    Log in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
