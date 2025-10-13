import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useData } from '../DataContext';
import LogoImage from '../components/LogoImage';

type Step = 'email' | 'confirmation' | 'reset' | 'success';

const ForgotPasswordPage: React.FC = () => {
    const { requestPasswordReset, resetPassword } = useData();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    
    const [strength, setStrength] = useState({
        score: 0,
        label: '',
        color: '',
    });

    const checkPasswordStrength = (password: string) => {
        if (!password) {
            setStrength({ score: 0, label: '', color: '' });
            return;
        }
        let score = 0;
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
        const typeCount = [hasLowercase, hasUppercase, hasNumber, hasSpecialChar].filter(Boolean).length;
        
        if (password.length >= 8) {
             score = typeCount;
        } else if (password.length > 0) {
            score = 1;
        } else {
            score = 0;
        }

        let label = '';
        let color = '';
        switch (score) {
            case 1: label = 'Zayıf'; color = ''; break;
            case 2: label = 'Orta'; color = 'orange'; break;
            case 3: label = 'Güçlü'; color = 'yellow'; break;
            case 4: label = 'Çok Güçlü'; color = 'green'; break;
            default: break;
        }
        setStrength({ score, label, color });
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        const result = requestPasswordReset(email);
        
        // We show the same message regardless of whether the email exists
        // to prevent user enumeration attacks. The token is only generated if the user exists.
        setMessage(`Eğer ${email} adresi sistemimizde kayıtlı ise, şifre sıfırlama talimatları gönderilmiştir.`);
        
        if (result.success && result.token) {
            setToken(result.token); // Store token for the next step in this simulated environment
        }
        setStep('confirmation');
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError("Şifreler eşleşmiyor!");
            return;
        }
        if (strength.score < 3) {
            setError("Güvenliğiniz için lütfen daha güçlü bir şifre seçin.");
            return;
        }

        const success = resetPassword(token, password);
        if (success) {
            setStep('success');
        } else {
            setError("Şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş. Lütfen tekrar deneyin.");
            setStep('email'); // Send user back to the start
        }
    };

    const renderEmailStep = () => (
        <>
            <h2 className="auth-title">Şifrenizi Sıfırlayın</h2>
            <p className="auth-subtitle">Hesabınıza ait e-posta adresini girin, size yeni bir şifre belirlemeniz için talimatlar göndereceğiz.</p>
            <form onSubmit={handleEmailSubmit} className="auth-form">
                {error && <p className="error-message" style={{textAlign: 'center', marginBottom: '1rem'}}>{error}</p>}
                <div className="form-group">
                    <label className="form-label" htmlFor="email">E-posta</label>
                    <div className="input-wrapper">
                         <span className="material-icons input-icon">alternate_email</span>
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
                <div>
                    <button type="submit" className="btn btn-submit btn-gradient">
                        Sıfırlama Bağlantısı Gönder
                    </button>
                </div>
            </form>
            <p className="auth-switch-text">
                Şifrenizi hatırladınız mı? <Link to="/login">Giriş Yap</Link>
            </p>
        </>
    );

    const renderConfirmationStep = () => (
        <div style={{textAlign: 'center'}}>
            <h2 className="auth-title">Talimatlar Gönderildi</h2>
            <p className="auth-subtitle">{message}</p>
            <div className="form-group">
                 <p className="auth-terms" style={{marginBottom: '1.5rem'}}>
                    Gelen kutunuzu kontrol edin ve şifrenizi sıfırlamak için bağlantıya tıklayın.
                </p>
                {/* This button simulates the user clicking the link in the email */}
                {token && (
                    <button onClick={() => setStep('reset')} className="btn btn-submit btn-gradient">
                        Şifre Yenileme Adımına Geç
                    </button>
                )}
            </div>
             <p className="auth-switch-text">
                <Link to="/login">Giriş Sayfasına Dön</Link>
            </p>
        </div>
    );
    
    const renderResetStep = () => (
        <>
            <h2 className="auth-title">Yeni Şifre Belirleyin</h2>
            <p className="auth-subtitle">Lütfen hesabınız için yeni ve güvenli bir şifre oluşturun.</p>
            <form onSubmit={handlePasswordSubmit} className="auth-form">
                {error && <p className="error-message" style={{textAlign: 'center', marginBottom: '0.5rem'}}>{error}</p>}
                <div className="form-group">
                    <label className="form-label" htmlFor="password">Yeni Şifre</label>
                    <div className="input-wrapper">
                        <span className="material-icons input-icon">lock</span>
                        <input id="password" name="password" type="password" required onChange={(e) => { setPassword(e.target.value); checkPasswordStrength(e.target.value); }} className="form-input" placeholder="••••••••" value={password} />
                    </div>
                </div>
                {password && (
                    <div className="password-strength-meter">
                        <div className="password-strength-container">
                            <div className="strength-bars">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className={`strength-bar ${strength.score >= i ? `filled ${strength.color}` : 'empty'}`}></div>
                                ))}
                            </div>
                            <p className="strength-label">{strength.label}</p>
                        </div>
                    </div>
                )}
                <div className="form-group">
                    <label className="form-label" htmlFor="confirm-password">Yeni Şifre (Tekrar)</label>
                    <div className="input-wrapper">
                        <span className="material-icons input-icon">lock</span>
                        <input id="confirm-password" name="confirmPassword" type="password" required onChange={(e) => setConfirmPassword(e.target.value)} className="form-input" placeholder="••••••••" value={confirmPassword} />
                    </div>
                </div>
                 <div>
                    <button type="submit" className="btn btn-submit btn-gradient" disabled={password.length > 0 && strength.score < 3}>
                        Şifreyi Güncelle
                    </button>
                </div>
            </form>
        </>
    );

    const renderSuccessStep = () => (
         <div style={{textAlign: 'center'}}>
            <h2 className="auth-title">Başarılı!</h2>
            <p className="auth-subtitle">Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
            <Link to="/login" className="btn btn-submit btn-gradient" style={{textDecoration: 'none'}}>
                Giriş Yap
            </Link>
        </div>
    );

    const renderStep = () => {
        switch (step) {
            case 'email': return renderEmailStep();
            case 'confirmation': return renderConfirmationStep();
            case 'reset': return renderResetStep();
            case 'success': return renderSuccessStep();
            default: return renderEmailStep();
        }
    };
    
    return (
        <AuthLayout>
            <div className="auth-container">
                <LogoImage className="auth-logo" />
                {renderStep()}
            </div>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;