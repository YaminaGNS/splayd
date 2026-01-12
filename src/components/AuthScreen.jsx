import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import './AuthScreen.css';

const AuthScreen = ({ onAuthComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            onAuthComplete({
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                provider: 'google'
            });
        } catch (err) {
            console.error('Google Sign-In Error:', err);
            if (err.code === 'auth/configuration-not-found') {
                setError('Firebase is not yet configured. Please follow the FIREBASE_SETUP.md guide.');
            } else {
                setError('Google Sign-In failed. Please try again.');
            }
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await signInAnonymously(auth);
            const user = result.user;

            onAuthComplete({
                uid: user.uid,
                displayName: 'Guest Player',
                provider: 'guest'
            });
        } catch (err) {
            console.error('Guest Login Error:', err);
            setError('Failed to continue as guest. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-content">
                {/* Google Sign-In Button */}
                <button
                    className={`auth-button google-button ${loading ? 'loading' : ''}`}
                    onClick={handleGoogleLogin}
                    disabled={loading}
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" height="20" />
                    <span>Sign in with Google</span>
                </button>

                {/* Guest Login Button */}
                <button
                    className={`auth-button guest-button ${loading ? 'loading' : ''}`}
                    onClick={handleGuestLogin}
                    disabled={loading}
                >
                    {loading ? (
                        <div className="spinner"></div>
                    ) : (
                        <span>Continue as Guest</span>
                    )}
                </button>

                {error && <div className="error-message">{error}</div>}
            </div>
        </div>
    );
};

export default AuthScreen;
