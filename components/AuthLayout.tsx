import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="auth-layout">
        <div className="auth-brand-panel">
            <div className="auth-brand-content">
                <h1 className="brand-panel-title">Veriye Dayalı İçgörüler, Daha Mutlu Ekipler</h1>
                <p className="brand-panel-subtitle">
                    Çalışan geri bildirimlerini toplayın, yapay zeka ile analiz edin ve şirket kültürünüzü bir sonraki seviyeye taşıyın.
                </p>
            </div>
        </div>
        <div className="auth-form-panel">
            {children}
            <p className="credit-text">v1.2</p>
        </div>
    </div>
  );
};

export default AuthLayout;