import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../DataContext';
import { AnonymousAvatarIcon } from './Icons';

const ProfileDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { logout, profileImageUrl } = useData();

    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        setIsOpen(false);
        logout();
        navigate('/login');
    };

    return (
        <div className="profile-dropdown" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="profile-button"
                style={profileImageUrl ? { backgroundImage: `url("${profileImageUrl}")` } : {}}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                {!profileImageUrl && <AnonymousAvatarIcon />}
            </button>

            <div
                className={`dropdown-menu ${isOpen ? 'open' : 'closed'}`}
                role="menu"
            >
                <Link
                    to="/settings"
                    onClick={() => setIsOpen(false)}
                    className="dropdown-item"
                    role="menuitem"
                >
                    Profil
                </Link>
                <button
                    onClick={handleLogout}
                    className="dropdown-item"
                    role="menuitem"
                >
                    Çıkış Yap
                </button>
            </div>
        </div>
    );
};

export default ProfileDropdown;