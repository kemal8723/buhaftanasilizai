import React, { useRef } from 'react';
import MainLayout from '../components/MainLayout';
import { useData } from '../DataContext';
import { AnonymousAvatarIcon } from '../components/Icons';

const SettingsPage: React.FC = () => {
    const { currentUser, profileImageUrl, updateProfileImage } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateProfileImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        updateProfileImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    if (!currentUser) {
        return (
            <MainLayout>
                <div className="content-container">
                    <p>Kullanıcı bilgileri yükleniyor...</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <div className="content-container" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div className="page-header" style={{ alignItems: 'flex-start' }}>
                    <div>
                        <p className="page-title">Profil Ayarları</p>
                        <p className="page-subtitle">Profil resminizi buradan yönetebilirsiniz.</p>
                    </div>
                </div>

                <div className="card profile-card">
                    <div className="profile-card-sidebar">
                        <div className="profile-picture-large-preview" style={profileImageUrl ? { backgroundImage: `url("${profileImageUrl}")` } : {}}>
                            {!profileImageUrl && <AnonymousAvatarIcon />}
                        </div>
                        <h2 className="profile-card-name">{currentUser.name}</h2>
                        <p className="profile-card-title">{currentUser.title}</p>
                        <div className="profile-picture-actions-vertical">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
                            <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                                <span className="material-symbols-outlined">upload</span>
                                Resmi Değiştir
                            </button>
                            {profileImageUrl && (
                                <button className="btn btn-secondary" onClick={handleRemoveImage}>
                                     <span className="material-symbols-outlined">delete</span>
                                    Resmi Kaldır
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="profile-card-main">
                        <h3 className="profile-section-title">Kullanıcı Bilgileri</h3>
                        <div className="profile-info-list">
                            <div className="profile-info-item">
                                <span className="profile-info-label">Ad Soyad</span>
                                <span className="profile-info-value">{currentUser.name}</span>
                            </div>
                            <div className="profile-info-item">
                                <span className="profile-info-label">E-posta Adresi</span>
                                <span className="profile-info-value">{currentUser.email}</span>
                            </div>
                            <div className="profile-info-item">
                                <span className="profile-info-label">Ünvan</span>
                                <span className="profile-info-value">{currentUser.title}</span>
                            </div>
                            <div className="profile-info-item">
                                <span className="profile-info-label">Rol</span>
                                <span className="profile-info-value">{currentUser.role}</span>
                            </div>
                        </div>
                         <div className="profile-notice-card">
                            <span className="material-symbols-outlined">lock</span>
                            <div className="profile-notice-text">
                                <p><strong>Şifre Yönetimi</strong></p>
                                <p>Şifre değişikliği, e-postanıza gönderilecek sıfırlama bağlantısı ile yapılacaktır.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default SettingsPage;