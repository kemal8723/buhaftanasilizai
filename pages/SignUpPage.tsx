import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useData } from '../DataContext';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const { signUp } = useData();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        title: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');

    const [strength, setStrength] = useState({
        score: 0,
        label: '',
        color: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (name === 'password') {
            checkPasswordStrength(value);
        }
    };

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
            case 1: label = 'Zayıf'; color = ''; break; // Uses default red
            case 2: label = 'Orta'; color = 'orange'; break;
            case 3: label = 'Güçlü'; color = 'yellow'; break;
            case 4: label = 'Çok Güçlü'; color = 'green'; break;
            default: break;
        }
        setStrength({ score, label, color });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError("Şifreler eşleşmiyor!");
            return;
        }
        if (strength.score < 3) {
            setError("Güvenliğiniz için lütfen daha güçlü bir şifre seçin. Şifreniz en az 'Güçlü' seviyesinde olmalıdır.");
            return;
        }
        
        try {
            await signUp({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                title: formData.title,
            });
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <AuthLayout>
            <div className="auth-container">
                <h2 className="auth-title">Yeni Hesap Oluşturun</h2>
                <p className="auth-subtitle">Platformumuza katılarak analizlere hemen başlayın.</p>
                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <p className="error-message" style={{textAlign: 'center', marginBottom: '0.5rem'}}>{error}</p>}
                     <div className="form-group">
                        <label className="form-label" htmlFor="name">Ad Soyad</label>
                        <div className="input-wrapper">
                            <span className="material-icons input-icon">person</span>
                            <input id="name" name="name" type="text" required onChange={handleChange} className="form-input" placeholder="Adınız Soyadınız" value={formData.name} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="email-address">E-posta Adresi</label>
                        <div className="input-wrapper">
                            <span className="material-icons input-icon">alternate_email</span>
                            <input id="email-address" name="email" type="email" required onChange={handleChange} className="form-input" placeholder="ornek@sirket.com" value={formData.email} />
                        </div>
                    </div>
                     <div className="form-group">
                        <label className="form-label" htmlFor="title">Ünvan</label>
                        <div className="input-wrapper">
                            <span className="material-icons input-icon">badge</span>
                            <select 
                                id="title" 
                                name="title" 
                                required 
                                onChange={handleChange} 
                                className="form-input"
                                value={formData.title}
                            >
                                <option value="" disabled>Ünvanınızı Seçin</option>
                                <option value="İK Direktörü">İK Direktörü</option>
                                <option value="İK Müdürü">İK Müdürü</option>
                                <option value="İK Birim Müdürü">İK Birim Müdürü</option>
                                <option value="İK Uzmanı">İK Uzmanı</option>
                                <option value="Satış Operasyon Direktörü">Satış Operasyon Direktörü</option>
                                <option value="Head of Satış Operasyon">Head of Satış Operasyon</option>
                                <option value="Satış Operasyon Müdürü">Satış Operasyon Müdürü</option>
                                <option value="Bölge Müdürü">Bölge Müdürü</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" htmlFor="password">Şifre</label>
                        <div className="input-wrapper">
                            <span className="material-icons input-icon">lock</span>
                            <input id="password" name="password" type="password" required onChange={handleChange} className="form-input" placeholder="••••••••" value={formData.password} />
                        </div>
                    </div>
                    {formData.password && (
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
                    {formData.password && strength.score < 3 && (
                        <p className="password-requirement-text">
                            Şifre en az 'Güçlü' olmalı (büyük/küçük harf, rakam, sembol).
                        </p>
                    )}
                     <div className="form-group">
                        <label className="form-label" htmlFor="confirm-password">Şifre Doğrulama</label>
                        <div className="input-wrapper">
                            <span className="material-icons input-icon">lock</span>
                            <input id="confirm-password" name="confirmPassword" type="password" required onChange={handleChange} className="form-input" placeholder="••••••••" value={formData.confirmPassword} />
                        </div>
                    </div>
                    <div className="form-group">
                        <p className="auth-terms">
                            Kaydolarak, <span className="pseudo-link" title="Hizmet Şartları Metni: Bu platformu kullanarak, verilerinizin anonimleştirilerek analiz edilmesini ve şirket içi iyileştirme amacıyla kullanılmasını kabul edersiniz. Platformun kötüye kullanımı yasaktır.">Hizmet Şartları</span>'nı ve <span className="pseudo-link" title="Gizlilik Politikası Metni: Kişisel bilgileriniz (isim, e-posta) kesinlikle gizli tutulur ve yalnızca kimlik doğrulama amacıyla kullanılır. Geri bildirimleriniz, kimliğinizle ilişkilendirilmeden analiz edilir. Verileriniz üçüncü partilerle paylaşılmaz.">Gizlilik Politikası</span>'nı kabul etmiş olursunuz.
                        </p>
                    </div>

                    <div>
                        <button 
                            type="submit" 
                            className="btn btn-submit btn-gradient"
                            disabled={formData.password.length > 0 && strength.score < 3}
                        >
                            Hesap Oluştur
                        </button>
                    </div>
                </form>
                 <p className="auth-switch-text">
                    Zaten bir hesabınız var mı? <Link to="/login">Giriş Yap</Link>
                </p>
            </div>
        </AuthLayout>
    );
};

export default SignUpPage;