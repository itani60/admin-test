(function initAdminAWSAuthService() {
  const BASE_URL = 'https://hub.comparehubprices.co.za/admin/admin';
  const ENDPOINTS = {
    REGISTER: `${BASE_URL}/account/register`,
    VERIFY_EMAIL: `${BASE_URL}/account/verify-email`,
    LOGIN: `${BASE_URL}/account/login`,
    USER_INFO: `${BASE_URL}/account/get-user-permissions`, // Updated to fetch permissions + user info
    LOGOUT: `${BASE_URL}/account/logout`,
    FORGOT_PASSWORD: `${BASE_URL}/account/forgot-password`,
    RESET_PASSWORD: `${BASE_URL}/account/reset-password`,
    PRESENCE: 'https://hub.comparehubprices.co.za/admin/admin/users/activity-status' // Absolute URL to ensure correctness
  };

  class AdminAWSAuthService {
    constructor() {
      this._profile = null;
      this._permissions = null; // Store granular permissions
      this._listeners = [];
      this._startPeriodicCheck();
    }

    /**
     * Start periodic session validation & presence heartbeat
     * @private
     */
    _startPeriodicCheck() {
      // Check session status every 60 seconds
      setInterval(async () => {
        // Only check if we have a local profile (active session)
        if (this._profile) {
          // Send heartbeat to update online status
          await this.updatePresence();
          // getUserInfo handles 401/Expiry internally by calling clear() and logout handler
          await this.getUserInfo();
        }
      }, 60000);
    }

    /**
     * Update user presence (heartbeat)
     * @returns {Promise<void>}
     */
    async updatePresence() {
      try {
        await fetch(ENDPOINTS.PRESENCE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        }).catch(() => { }); // Ignore errors implies offline or network issue
      } catch (e) {
        // Silent fail
      }
    }

    /**
     * Register a new admin account
     * @param {string} email - Admin email address
     * @param {string} password - Admin password (min 8 characters)
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async register(email, password) {
      try {
        const res = await fetch(ENDPOINTS.REGISTER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success) {
          return {
            success: false,
            error: data?.error || 'REGISTRATION_FAILED',
            message: data?.message || `Registration failed (HTTP ${res.status})`
          };
        }

        return {
          success: true,
          message: data.message || 'Registration successful. Please check your email for verification code.'
        };
      } catch (error) {
        console.error('Admin registration error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Network error. Please check your connection.'
        };
      }
    }

    /**
     * Resend OTP code for registration
     * @param {string} email - Admin email address
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async resendRegistrationOTP(email) {
      try {
        const res = await fetch(ENDPOINTS.REGISTER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, action: 'resend' })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success) {
          return {
            success: false,
            error: data?.error || 'RESEND_FAILED',
            message: data?.message || 'Failed to resend verification code'
          };
        }

        return {
          success: true,
          message: data.message || 'Verification code has been resent to your email.'
        };
      } catch (error) {
        console.error('Resend registration OTP error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Network error. Please check your connection.'
        };
      }
    }

    /**
     * Verify email with OTP code
     * @param {string} email - Admin email address
     * @param {string} code - 6-digit verification code
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async verifyEmail(email, code) {
      try {
        const res = await fetch(ENDPOINTS.VERIFY_EMAIL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, code })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success) {
          return {
            success: false,
            error: data?.error || 'VERIFICATION_FAILED',
            message: data?.message || 'Email verification failed'
          };
        }

        return {
          success: true,
          message: data.message || 'Email verified successfully'
        };
      } catch (error) {
        console.error('Email verification error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Network error. Please check your connection.'
        };
      }
    }

    /**
     * Login with email and password
     * @param {string} email - Admin email address
     * @param {string} password - Admin password
     * @returns {Promise<{success: boolean, user?: object, message?: string, error?: string}>}
     */
    async login(email, password) {
      try {
        const res = await fetch(ENDPOINTS.LOGIN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success) {
          return {
            success: false,
            error: data?.error || 'LOGIN_FAILED',
            message: data?.message || `Login failed (HTTP ${res.status})`
          };
        }

        if (data.user) {
          this._profile = data.user;
          this._notifyListeners('login', data.user);
        }

        return {
          success: true,
          user: data.user || null,
          message: data.message || 'Login successful'
        };
      } catch (error) {
        console.error('Admin login error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Network error. Please check your connection.'
        };
      }
    }

    /**
     * Get current admin user info from session
     * @returns {Promise<{success: boolean, user?: object, error?: string, message?: string}>}
     */
    async getUserInfo() {
      try {
        const res = await fetch(ENDPOINTS.USER_INFO, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        const data = await res.json().catch(() => ({}));

        // Handle 401 Unauthorized (Session Expired/Invalid) including EXPIRED_ACCESS context
        if (res.status === 401 || data?.error === 'NO_SESSION' || data?.error === 'INVALID_SESSION' || data?.error === 'EXPIRED_ACCESS') {
          console.warn('Session expired or invalid, clearing local state');
          this.clear(); // Clear local profile
          this._notifyListeners('logout', null); // Notify app

          return {
            success: false,
            status: 401,
            error: data?.error || 'SESSION_EXPIRED',
            message: data?.message || 'Session expired',
            user: null
          };
        }

        if (!res.ok || data?.success === false) {
          return {
            success: false,
            error: data?.error || 'FETCH_ERROR',
            message: data?.message || `Get user info failed (HTTP ${res.status})`,
            user: null
          };
        }

        if (data.user) {
          this._profile = data.user;
          this._permissions = data.permissions || null; // Capture permissions
        }

        return {
          success: true,
          user: data.user || null
        };
      } catch (error) {
        console.error('Get admin user info error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Failed to fetch user info',
          user: null
        };
      }
    }

    /**
     * Logout admin user
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async logout() {
      try {
        const res = await fetch(ENDPOINTS.LOGOUT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include'
        });

        const data = await res.json().catch(() => ({}));

        // Always clear profile and notify listeners, even if request failed
        this.clear();
        this._notifyListeners('logout', null);

        if (!res.ok || !data?.success) {
          // Still return success since we cleared the local state
          // The server-side session deletion may have failed, but client is logged out
          return {
            success: true,
            message: data?.message || 'Logged out locally',
            warning: data?.error || 'Server logout may have failed'
          };
        }

        return {
          success: true,
          message: data.message || 'Logged out successfully'
        };
      } catch (error) {
        console.error('Admin logout error:', error);

        // Always clear profile and notify listeners, even on network error
        this.clear();
        this._notifyListeners('logout', null);

        // Return success since we cleared local state
        return {
          success: true,
          message: 'Logged out locally',
          warning: 'Network error occurred, but local session cleared'
        };
      }
    }

    /**
     * Request password reset code
     * @param {string} email - Admin email address
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async forgotPassword(email) {
      try {
        const res = await fetch(ENDPOINTS.FORGOT_PASSWORD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success) {
          return {
            success: false,
            error: data?.error || 'FORGOT_PASSWORD_FAILED',
            message: data?.message || 'Failed to send password reset code'
          };
        }

        return {
          success: true,
          message: data.message || 'If this email is registered as an admin, you will receive a password reset code.'
        };
      } catch (error) {
        console.error('Forgot password error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Network error. Please check your connection.'
        };
      }
    }

    /**
     * Resend password reset code
     * @param {string} email - Admin email address
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async resendPasswordResetCode(email) {
      try {
        const res = await fetch(ENDPOINTS.FORGOT_PASSWORD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, action: 'resend' })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success) {
          return {
            success: false,
            error: data?.error || 'RESEND_FAILED',
            message: data?.message || 'Failed to resend password reset code'
          };
        }

        return {
          success: true,
          message: data.message || 'If this email is registered as an admin, you will receive a password reset code.'
        };
      } catch (error) {
        console.error('Resend password reset code error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Network error. Please check your connection.'
        };
      }
    }

    /**
     * Reset password with verification code
     * @param {string} email - Admin email address
     * @param {string} code - 6-digit verification code
     * @param {string} newPassword - New password (min 8 characters)
     * @returns {Promise<{success: boolean, message?: string, error?: string}>}
     */
    async resetPassword(email, code, newPassword) {
      try {
        const res = await fetch(ENDPOINTS.RESET_PASSWORD, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, code, newPassword })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.success) {
          return {
            success: false,
            error: data?.error || 'RESET_PASSWORD_FAILED',
            message: data?.message || 'Password reset failed'
          };
        }

        return {
          success: true,
          message: data.message || 'Password reset successfully. You can now log in with your new password.'
        };
      } catch (error) {
        console.error('Reset password error:', error);
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message || 'Network error. Please check your connection.'
        };
      }
    }

    /**
     * Check if admin is authenticated
     * @returns {Promise<boolean>}
     */
    async isAuthenticated() {
      try {
        const result = await this.getUserInfo();
        return result.success === true && result.user !== null;
      } catch (error) {
        return false;
      }
    }

    /**
     * Get cached profile (if available)
     * @returns {object|null}
     */
    getProfile() {
      return this._profile;
    }

    /**
     * Clear local profile data
     */
    clear() {
      this._profile = null;
      this._permissions = null;
    }

    /**
     * Check if user has specific permission
     * @param {string} permissionName
     * @returns {boolean}
     */
    hasPermission(permissionName) {
      if (!this._permissions) return false;
      return this._permissions[permissionName] === true;
    }

    /**
     * Get all permissions
     * @returns {object|null}
     */
    getGlobalPermissions() {
      return this._permissions;
    }

    /**
     * Add event listener for auth events
     * @param {string} event - Event name ('login', 'logout')
     * @param {Function} callback - Callback function
     */
    on(event, callback) {
      if (typeof callback === 'function') {
        this._listeners.push({ event, callback });
      }
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     */
    off(event, callback) {
      this._listeners = this._listeners.filter(
        listener => !(listener.event === event && listener.callback === callback)
      );
    }

    /**
     * Notify listeners of auth events
     * @private
     */
    _notifyListeners(event, data) {
      this._listeners.forEach(listener => {
        if (listener.event === event) {
          try {
            listener.callback(data);
          } catch (error) {
            console.error('Error in auth event listener:', error);
          }
        }
      });
    }

    /**
     * Validate email format
     * @param {string} email - Email address to validate
     * @returns {boolean}
     */
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    /**
     * Validate password strength
     * @param {string} password - Password to validate
     * @param {number} minLength - Minimum password length (default: 8)
     * @returns {{valid: boolean, message?: string}}
     */
    validatePassword(password, minLength = 8) {
      if (!password || password.length < minLength) {
        return {
          valid: false,
          message: `Password must be at least ${minLength} characters long`
        };
      }
      return { valid: true };
    }

    /**
     * Normalize email address
     * @param {string} email - Email address to normalize
     * @returns {string}
     */
    normalizeEmail(email) {
      return email.toLowerCase().trim();
    }

    /**
     * Check login state and populate UI elements
     * @returns {Promise<void>}
     */
    async checkLoginAndPopulateUI() {
      try {
        // If we already have a profile, use it first for speed, then verify
        let user = this._profile;

        if (!user) {
          const result = await this.getUserInfo();
          if (result.success && result.user) {
            user = result.user;
          }
        }

        if (user) {
          let displayName = '';
          let initials = '';

          if (user.givenName && user.familyName) {
            displayName = `${user.givenName} ${user.familyName}`;
            initials = `${user.givenName.charAt(0)}${user.familyName.charAt(0)}`.toUpperCase();
          } else if (user.givenName) {
            displayName = user.givenName;
            initials = user.givenName.substring(0, 2).toUpperCase();
          } else if (user.email) {
            const name = user.email.split('@')[0];
            displayName = name.charAt(0).toUpperCase() + name.slice(1);
            initials = name.substring(0, 2).toUpperCase();
          } else {
            displayName = 'Admin User';
            initials = 'AU';
          }

          const userAvatar = document.getElementById('userAvatar');
          if (userAvatar) userAvatar.textContent = initials;
          const userName = document.getElementById('userName');
          if (userName) userName.textContent = displayName;

          // Update Role
          const rawRole = (user.role || 'viewer').replace(/_/g, ' ');
          const roleDisplay = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
          const roleHeader = document.getElementById('userRoleHeader');
          if (roleHeader) roleHeader.textContent = roleDisplay;

          const ddName = document.getElementById('dropdownUserName');
          if (ddName) ddName.textContent = displayName;
          const ddEmail = document.getElementById('dropdownUserEmail');
          if (ddEmail) ddEmail.textContent = user.email || '';

        } else {
          // Optional: Handle unauthenticated state UI if needed
        }
      } catch (error) {
        console.error('Error in checkLoginAndPopulateUI:', error);
      }
    }
  }

  window.adminAWSAuthService = window.adminAWSAuthService || new AdminAWSAuthService();
  window.AdminAWSAuthService = AdminAWSAuthService;

  // Auto-run UI population on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.adminAWSAuthService.checkLoginAndPopulateUI());
  } else {
    window.adminAWSAuthService.checkLoginAndPopulateUI();
  }
})();

