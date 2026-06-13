import Head from 'next/head'
import { useRouter } from 'next/router'

export default function Terms() {
  const router = useRouter()

  return (
    <>
      <Head>
        <title>Terms of Service | Rannikon Puutarha</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #fff; color: #1a1a18; -webkit-font-smoothing: antialiased; }
        .container { max-width: 720px; margin: 0 auto; padding: 0 24px 48px; }
        h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #1a1a18; }
        h2 { font-size: 17px; font-weight: 700; margin: 32px 0 10px; color: #1a1a18; }
        p { font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 12px; }
        ul { padding-left: 20px; margin-bottom: 12px; }
        li { font-size: 15px; line-height: 1.7; color: #444; margin-bottom: 4px; }
        a { color: #2d6a2d; }
        .meta { font-size: 13px; color: #888; margin-bottom: 40px; }
      `}</style>

      <div onClick={() => router.push('/')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px', marginBottom: '16px', cursor: 'pointer' }}>
        <img src="/rannikkopuutarhalogo.png" alt="Rannikon Puutarha" style={{ height: '48px', width: 'auto', marginBottom: '14px' }} />
        <span style={{ fontFamily: "'Dancing Script', cursive", fontWeight: '700', fontSize: '22px', color: '#2d6a2d' }}>Rannikon Puutarha</span>
      </div>

      <div className="container">
        <h1>Terms of Service</h1>
        <p className="meta">Last updated: June 10, 2026</p>

        <p>These Terms of Service ("Terms") govern your use of the Rannikon timesheet application available at rannikon.com and on the Google Play Store, operated by Rannikon Puutarha ("we", "our", or "us"). By creating an account or using the app, you agree to these Terms.</p>

        <h2>1. Who can use Rannikon</h2>
        <p>The Rannikon app is intended for workers, supervisors, administrators, and housemasters of Rannikon Puutarha berry farm in Finland. You must be at least 18 years old and have a valid work number assigned by Rannikon Puutarha to register an account.</p>

        <h2>2. Your account</h2>
        <ul>
          <li>You may register one account using your unique farm work number. Each work number can only be linked to one account.</li>
          <li>You are responsible for keeping your password confidential and for all activity that occurs under your account.</li>
          <li>You must provide accurate information when registering, including your real name and work number.</li>
          <li>If you believe your account has been accessed without your permission, contact us immediately.</li>
        </ul>

        <h2>3. What the app does</h2>
        <p>Rannikon is a timesheet tool that calculates and fills your payroll paper forms based on the start time, finish time, and break duration you enter. The app provides:</p>
        <ul>
          <li>Automatic calculation across all paper types (white paper, orange paper, weekly summary, green paper)</li>
          <li>Monthly timesheet views with editable entries</li>
          <li>PDF and Excel downloads of your papers</li>
          <li>Supervisor tools for recording worker hours in the field</li>
        </ul>

        <h2>4. Accuracy of records</h2>
        <p>The app performs calculations based on the times you or your supervisor enter. You are responsible for verifying that your recorded hours are correct before submitting them on paper or digitally. Rannikon Puutarha's official payroll records remain the authoritative source for wage payments. The app is a calculation aid and does not replace official payroll processes.</p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Enter false or misleading work hours for yourself or others</li>
          <li>Access or attempt to access another worker's account or data</li>
          <li>Use the app to harass, harm, or impersonate others</li>
          <li>Attempt to disrupt, reverse engineer, or gain unauthorized access to the app or its servers</li>
          <li>Use the app for any unlawful purpose</li>
        </ul>
        <p>We may suspend or deactivate accounts that violate these Terms.</p>

        <h2>6. Roles and permissions</h2>
        <p>Different account roles have different levels of access:</p>
        <ul>
          <li>Workers can view and manage only their own timesheet entries</li>
          <li>Supervisors can record work hours for workers they supervise and send work logs to administrators</li>
          <li>Administrators can view all worker records and manage accounts</li>
          <li>Housemasters receive work logs for their assigned groups</li>
        </ul>
        <p>Roles are assigned by Rannikon Puutarha administrators and cannot be self-assigned.</p>

        <h2>7. Privacy</h2>
        <p>How we collect and handle your personal data is described in our <a href="/privacy">Privacy Policy</a>. By using the app you also agree to the Privacy Policy.</p>

        <h2>8. Availability</h2>
        <p>We aim to keep the app available at all times, but we do not guarantee uninterrupted access. The app may be temporarily unavailable due to maintenance, updates, or technical issues. We are not liable for any losses caused by app downtime.</p>

        <h2>9. Intellectual property</h2>
        <p>The Rannikon app, its design, logo, and software are the property of Rannikon Puutarha and its developer. You may not copy, modify, distribute, or create derivative works from the app without written permission.</p>

        <h2>10. Limitation of liability</h2>
        <p>The app is provided "as is" without warranties of any kind. To the maximum extent permitted by Finnish law, Rannikon Puutarha is not liable for any indirect, incidental, or consequential damages arising from your use of the app, including but not limited to payroll discrepancies resulting from incorrectly entered times.</p>

        <h2>11. Termination</h2>
        <p>You may stop using the app and request deletion of your account at any time. We may suspend or terminate your account if you violate these Terms or if your employment at Rannikon Puutarha ends. Upon termination, your data will be handled as described in the Privacy Policy.</p>

        <h2>12. Changes to these Terms</h2>
        <p>We may update these Terms from time to time. We will notify users of significant changes by updating the date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated Terms.</p>

        <h2>13. Governing law</h2>
        <p>These Terms are governed by the laws of Finland. Any disputes arising from these Terms or your use of the app will be resolved in the courts of Finland.</p>

        <h2>14. Contact</h2>
        <p>If you have questions about these Terms, contact us at:</p>
        <p><strong>Rannikon Puutarha</strong><br />Email: <a href="mailto:noreply@rannikon.com">noreply@rannikon.com</a><br />Website: <a href="https://www.rannikon.com">www.rannikon.com</a></p>

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
          <a href="/" style={{ fontSize: '13px', color: '#2d6a2d' }}>Back to Rannikon</a>
        </div>
      </div>
    </>
  )
}
