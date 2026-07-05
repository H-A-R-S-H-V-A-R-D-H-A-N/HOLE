import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';
import '../styles/DonationBanner.css';

export default function DonationBanner() {
  const [showModal, setShowModal] = useState(false);

  const openPaypal = () => {
    const url = 'https://www.paypal.com/paypalme/harshvardhansingh611';
    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
    else window.open(url, '_blank');
  };

  return (
    <>
      <div className="donation-banner" onClick={() => setShowModal(true)}>
        <div className="donation-banner-icon">
          <Heart size={13} color="#a78bfa" />
        </div>
        <span className="donation-banner-text">Support the developer behind HOLE</span>
        <span className="donation-banner-cta">Donate</span>
      </div>

      {showModal && (
        <div className="donation-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="donation-modal">
            <button className="donation-modal-close" onClick={() => setShowModal(false)}>
              <X size={16} />
            </button>

            <div className="donation-modal-title">Support HOLE</div>
            <div className="donation-modal-sub">
              Your support keeps this project alive and free for the entire community.
            </div>

            <div className="donation-modal-grid">
              {/* PayPal */}
              <div className="donation-modal-card paypal" onClick={openPaypal}>
                <div className="donation-modal-card-icon">P</div>
                <div className="donation-modal-card-label">PayPal</div>
                <div className="donation-modal-card-desc">Donate securely from anywhere in the world</div>
              </div>

              {/* UPI QR */}
              <div className="donation-modal-card upi">
                <div className="donation-modal-card-icon">₹</div>
                <div className="donation-modal-card-label">UPI (India)</div>
                <div className="donation-modal-qr">
                  <img src="upi-qr.jpg" alt="UPI QR Code" />
                </div>
                <div className="donation-modal-card-desc">Scan to donate via any UPI app</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
