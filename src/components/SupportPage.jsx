import { Heart, Coffee, Star, Camera, Server } from 'lucide-react';
import '../styles/Tools.css';

export default function SupportPage() {
  return (
    <div className="tool-page page-enter">
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 0' }}>

        {/* Hero */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 107, 107, 0.15))',
            border: '2px solid rgba(255, 215, 0, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Heart size={36} style={{ color: '#FF6B6B' }} />
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)',
            margin: '0 0 8px', letterSpacing: '-0.5px',
          }}>
            The Dream Behind HOLE
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
            A letter from Harshvardhan Singh Rathore
          </p>
        </div>

        {/* The Story */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '36px',
          marginBottom: '24px',
          lineHeight: '2.0',
          fontSize: '14px',
          color: 'var(--text-secondary)',
        }}>
          <p style={{ margin: '0 0 20px' }}>
            Hey there, fellow hacker. 👋
          </p>
          <p style={{ margin: '0 0 20px' }}>
            My name is <strong>Harshvardhan Singh Rathore</strong>. I am not backed by a tech giant, I don't live in a bustling Silicon Valley city, and I don't have venture capital funding. I live in a small village, thousands of miles away from the tech hubs of the world.
          </p>
          <p style={{ margin: '0 0 20px' }}>
            Growing up here, resources were scarce. Opportunities didn't knock on our doors; we had to walk miles just to find them. But I had a laptop, an internet connection, and a burning desire to create something that could make a mark on the world. I spent countless sleepless nights learning to code by the glow of a screen, driven by a dream far bigger than the village I was born in.
          </p>
          <p style={{ margin: '0 0 20px' }}>
            I built <strong style={{ color: 'var(--text-primary)' }}>HOLE</strong> out of necessity. I saw how scattered and chaotic the bug bounty workflow was, and I wanted to forge a weapon for people like us — the underdogs. I poured my soul into this app, coding until my eyes burned and the sun came up, fighting against slow internet, outdated hardware, and the constant doubt of whether anyone would ever use what I was building.
          </p>
          <p style={{ margin: '0 0 20px' }}>
            I have no safety net. No rich parents to fall back on. Just my mind, my keyboard, and a fierce hope that my work brings value to your life. I made this app completely offline, private, and powerful because I respect your grind — I know what it feels like to have to fight for every dollar and every victory.
          </p>
          <p style={{ margin: '0 0 20px' }}>
            I'm not going to lie to you and say I'm doing fine. The truth is, this is hard. Building a full desktop app alone, with no income from it, while figuring out how to pay for basic things — it's exhausting. But every time someone tells me HOLE helped them find a bug, or saved them time, it makes every sleepless night worth it.
          </p>
          <p style={{ margin: '0 0 0' }}>
            If HOLE has helped you secure a bounty, save precious time, or simply made your hacker journey a bit easier, please consider supporting me. Every single coffee or donation isn't just money to me — it's food on the table, it's keeping the electricity running, and it's proof to a kid from a small village that his dreams weren't foolish after all. It tells me that my work matters to you. Thank you from the bottom of my heart. 🖤
          </p>
        </div>

        {/* Ways to Support */}
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 20px', textAlign: 'center' }}>
            How You Can Change My Life
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* PayPal & UPI */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {/* PayPal */}
              <div
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, rgba(0, 48, 135, 0.08), rgba(0, 112, 186, 0.08))',
                  border: '1px solid rgba(0, 112, 186, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '250px'
                }}
                onClick={() => window.open('https://paypal.me/harshvardhansingh611', '_blank')}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(0, 112, 186, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <strong style={{ color: '#0070BA', fontSize: '22px', fontFamily: 'sans-serif' }}>P</strong>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>PayPal (International)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                    Donate securely from anywhere in the world.
                  </div>
                </div>
              </div>

              {/* UPI */}
              <div
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(21, 128, 61, 0.08))',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minWidth: '250px'
                }}
                onClick={() => {
                  navigator.clipboard.writeText('harshvardhansinghrathore611@oksbi');
                  alert('UPI ID copied to clipboard! You can paste it in GPay, PhonePe, or Paytm.');
                }}
              >
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#22C55E' }}>₹</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>UPI (India Only)</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                    Click to copy UPI ID for GPay, PhonePe, or Paytm.
                  </div>
                </div>
              </div>
            </div>

            {/* Enterprise / Corporate Sponsorships */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.08))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => window.open('mailto:harshvardhansinghrathore611@gmail.com?subject=Enterprise Sponsorship for HOLE', '_blank')}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Server size={24} style={{ color: '#10B981' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Enterprise Sponsorships & Hardware</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                  Are you an enterprise that uses HOLE? Consider sponsoring this solo developer's journey. Donated hardware, laptops, server credits, or company swag directly empower my ability to maintain and scale this project professionally. Let's talk!
                </div>
              </div>
            </div>

            {/* Follow on Instagram */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(225, 48, 108, 0.08), rgba(253, 29, 29, 0.08))',
                border: '1px solid rgba(225, 48, 108, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => window.open('https://instagram.com/__h_a_r_s_h_v_a_r_d_h_a_n_', '_blank')}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(225, 48, 108, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Camera size={24} style={{ color: '#E1306C' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Follow my Journey on Instagram</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                  Let's connect! I want to hear how the app helps you. Every follow builds my credibility and helps me reach more people. 📸
                </div>
              </div>
            </div>

            {/* GitHub Star */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08))',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onClick={() => window.open('https://github.com/H-A-R-S-H-V-A-R-D-H-A-N/HOLE', '_blank')}
            >
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Star size={24} style={{ color: '#6366F1' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Star on GitHub</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.5' }}>
                  A simple click on a star costs absolutely nothing, but it boosts the project's visibility so the world can see my work. ⭐
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Thank You */}
        <div style={{
          textAlign: 'center',
          padding: '24px',
          color: 'var(--text-muted)',
          fontSize: '13px',
          lineHeight: '1.8',
        }}>
          <p style={{ margin: '0 0 8px' }}>
            Thank you for believing in me and using my app.
          </p>
          <p style={{ margin: '0 0 8px' }}>
            <a href="mailto:harshvardhansinghrathore611@gmail.com" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>harshvardhansinghrathore611@gmail.com</a>
          </p>
          <p style={{ margin: 0, fontSize: '12px' }}>
            Stay curious, keep hacking. 🎯
          </p>
        </div>
      </div>
    </div>
  );
}
