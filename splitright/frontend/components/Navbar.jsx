"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Plus, Video, MonitorPlay } from 'lucide-react';
import './Navbar.css';

const Navbar = ({ user, toggleLogin }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Ref for closing dropdown on click outside
    const dropdownRef = useRef(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 50;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                // Handle dropdown close if implemented
            }
        };

        window.addEventListener('scroll', handleScroll);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [scrolled]);

    const handleLogout = () => {
        if (toggleLogin) toggleLogin();
        router.push('/');
    };

    const isHome = pathname === '/';
    // Transparent only if on Home Page AND NOT scrolled
    const isTransparent = isHome && !scrolled;
    const navClass = isTransparent ? 'transparent' : 'scrolled';

    return (
        <header className={`headerContainer ${navClass}`}>
            <div className="nav-container">
                {/* Logo Section */}
                <Link href="/" className="logoGroup">
                    <img src="/logo.png" alt="PDEU Logo" style={{ height: '80px', width: 'auto' }} />
                </Link>

                {/* Hamburger for Mobile */}
                <button className="hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </button>

                {/* Menu */}
                <ul className={`menu ${mobileMenuOpen ? 'show' : ''}`}>
                    <li>
                        <Link href="/" className="menuLink">Home</Link>
                    </li>
                    
                    {user ? (
                        <>
                            <li><Link href="/profile" className="menuLink">Profile</Link></li>
                            <li><Link href="/dashboard" className="menuLink">Dashboard</Link></li>
                            <li>
                                <button onClick={handleLogout} className="auth-btn">Logout</button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li><Link href="/workflow" className="menuLink">Workflow</Link></li>
                            <li><Link href="/login" className="menuLink">Login</Link></li>
                            <li><Link href="/login?signup=true" className="auth-btn">Sign Up</Link></li>
                        </>
                    )}
                </ul>
            </div>
        </header>
    );
};

export default Navbar;
