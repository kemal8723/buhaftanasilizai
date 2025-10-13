import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useData } from '../DataContext';
import LogoImage from '../components/LogoImage';

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useData();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = login(email, password);
        if (success) {
            navigate('/dashboard');
        } else {
            setError("E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
        }
    };
    
    return (
        <AuthLayout>
            <div className="auth-container">
                <LogoImage className="auth-logo" />
                <h2 className="auth-title">Tekrar Hoş Geldiniz</h2>
                <p className="auth-subtitle">Hesap bilgilerinizle giriş yapın ve verileri yönetmeye başlayın.</p>
                <form onSubmit={handleLogin} className="auth-form">
                    {error && <p className="error-message" style={{textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}
                    <div className="form-group">
                        <label className="form-label" htmlFor="email">E-posta</label>
                        <div className="input-wrapper">
                             <span className="material-icons input-icon">
                                alternate_email
                            </span>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                                placeholder="ornek@sirket.com"
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Şifre</label>
                        <div className="input-wrapper">
                            <span className="material-icons input-icon">
                                lock
                            </span>
                            <input 
                                id="password" 
                                name="password" 
                                type="password" 
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-options">
                         <Link to="/forgot-password" className="pseudo-link forgot-password-link">Şifremi Unuttum?</Link>
                    </div>
                    <div>
                        <button type="submit" className="btn btn-submit btn-gradient">
                            Giriş Yap
                        </button>
                    </div>
                </form>
                <p className="auth-switch-text">
                    Hesabınız yok mu? <Link to="/signup">Kayıt Ol</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default LoginPage;