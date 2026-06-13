import Head from 'next/head'

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Privacy Policy — Rannikon Puutarha</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #fff; color: #1a1a18; -webkit-font-smoothing: antialiased; }
        .container { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
        h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #1a1a18; }
        h2 { font-size: 17px; font-weight: 700; margin: 32px 0 10px; color: #1a1a18; }
        p { font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 12px; }
        ul { padding-left: 20px; margin-bottom: 12px; }
        li { font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 4px; }
        a { color: #2d6a2d; }
        .meta { font-size: 13px; color: #888; margin-bottom: 40px; }
        .nav { background: #fff; border-bottom: 1px solid #eee; padding: 12px 24px; display: flex; align-items: center; gap: 10px; }
        .nav img { height: 36px; }
        .nav span { font-size: 16px; font-weight: 700; color: #2d6a2d; }
      `}</style>

      <div className="nav">
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" />
          <span>Rannikon Puutarha</span>
        </a>
      </div>

      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="meta">Last updated: June 8, 2026</p>

        <p>Rannikon Puutarha ("we", "our", or "us") operates the Rannikon timesheet application available at rannikon.com and on the Google Play Store. This privacy policy explains how we collect, use, and protect your personal information.</p>

        <h2>1. Information we collect</h2>
        <p>We collect the following information when you register and use the Rannikon app:</p>
        <ul>
          <li>Full name</li>
          <li>Email address</li>
          <li>Work number assigned by Rannikon Puutarha</li>
          <li>Work hours — start time, finish time, break duration, and type of work performed each day</li>
          <li>Google account information if you choose to sign in with Google</li>
        </ul>

        <h2>2. How we use your information</h2>
        <p>We use the information you provide solely to:</p>
        <ul>
          <li>Calculate and display your timesheet entries across all paper types (white paper, orange paper, weekly summary, green paper)</li>
          <li>Allow supervisors and administrators at Rannikon Puutarha to view and manage work records</li>
          <li>Send password reset emails when requested</li>
          <li>Authenticate your identity when you log in</li>
        </ul>
        <p>We do not use your data for advertising, marketing, or any purpose outside of timesheet management for Rannikon Puutarha.</p>

        <h2>3. Who has access to your data</h2>
        <p>Your work records are accessible to:</p>
        <ul>
          <li>You — through your personal dashboard</li>
          <li>Supervisors at Rannikon Puutarha — who record and manage daily work sessions</li>
          <li>Administrators at Rannikon Puutarha — who manage all worker accounts</li>
          <li>Housemasters at Rannikon Puutarha — who receive work logs for their assigned groups</li>
        </ul>
        <p>We do not sell, share, or transfer your personal data to any third parties outside of Rannikon Puutarha.</p>

        <h2>4. Data storage and security</h2>
        <p>Your data is stored securely on servers located in the European Union (Frankfurt, Germany) provided by Supabase. All data is encrypted in transit using HTTPS/TLS. We take reasonable technical measures to protect your information from unauthorized access.</p>

        <h2>5. Google OAuth</h2>
        <p>If you choose to sign in with Google, we receive your name and email address from Google. We do not receive or store your Google password. You can revoke access at any time through your Google account settings at myaccount.google.com.</p>

        <h2>6. Data retention</h2>
        <p>We retain your account and timesheet data for as long as you are employed at Rannikon Puutarha. If you request deletion of your account and data, we will remove it within 30 days. To request deletion, contact us at the email address below.</p>

        <h2>7. Your rights</h2>
        <p>Under the General Data Protection Regulation (GDPR), you have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to processing of your data</li>
          <li>Request a copy of your data in a portable format</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href="mailto:noreply@rannikon.com">noreply@rannikon.com</a>.</p>

        <h2>8. Cookies</h2>
        <p>The Rannikon app uses a JWT authentication token stored in your browser's local storage to keep you logged in. We do not use advertising cookies or tracking cookies.</p>

        <h2>9. Children's privacy</h2>
        <p>The Rannikon app is intended for use by adults aged 18 and over who are employed at Rannikon Puutarha. We do not knowingly collect data from anyone under the age of 18.</p>

        <h2>10. Changes to this policy</h2>
        <p>We may update this privacy policy from time to time. We will notify users of significant changes by updating the date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.</p>

        <h2>11. Contact</h2>
        <p>If you have questions about this privacy policy or how we handle your data, contact us at:</p>
        <p><strong>Rannikon Puutarha</strong><br />Email: <a href="mailto:noreply@rannikon.com">noreply@rannikon.com</a><br />Website: <a href="https://www.rannikon.com">www.rannikon.com</a></p>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
          <a href="/" style={{ fontSize: '13px', color: '#2d6a2d' }}>Back to Rannikon</a>
        </div>
      </div>
    </>
  )
}