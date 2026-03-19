'use client'

export function FloatingContactButtons({
  socialLinks,
}: {
  socialLinks?: { facebook_url?: string | null } | null
}) {
  const facebookUrl = socialLinks?.facebook_url || 'https://www.facebook.com'

  return (
    <div
      style={{
        position: 'fixed',
        right: '18px',
        bottom: '110px',
        zIndex: 1050,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <a
        href="https://api.whatsapp.com/send?phone=201288818000"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        title="WhatsApp"
        className="floating-contact-btn floating-whatsapp"
      >
        <i className="fab fa-whatsapp"></i>
      </a>

      <a
        href="tel:01288818000"
        aria-label="Call now"
        title="Call"
        className="floating-contact-btn floating-call"
      >
        <i className="fa fa-phone-alt"></i>
      </a>

      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open Facebook"
        title="Facebook"
        className="floating-contact-btn floating-facebook"
      >
        <i className="fab fa-facebook-f"></i>
      </a>

      <style jsx>{`
        .floating-contact-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 22px;
          text-decoration: none;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25);
          transition: transform 0.3s ease, box-shadow 0.3s ease, opacity 0.3s ease;
          animation: pulse 1.8s infinite;
        }

        .floating-contact-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3);
          opacity: 0.95;
        }

        .floating-whatsapp {
          background: #25d366;
        }

        .floating-call {
          background: #0d6efd;
        }

        .floating-facebook {
          background: #1877f2;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.45), 0 8px 22px rgba(0, 0, 0, 0.25);
          }
          70% {
            box-shadow: 0 0 0 14px rgba(37, 211, 102, 0), 0 8px 22px rgba(0, 0, 0, 0.25);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0), 0 8px 22px rgba(0, 0, 0, 0.25);
          }
        }

        @media (max-width: 767px) {
          .floating-contact-btn {
            width: 44px;
            height: 44px;
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  )
}
