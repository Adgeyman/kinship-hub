export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <h1>Privacy Policy for Kinship Hub</h1>
      <p><strong>Last updated:</strong> {new Date().toLocaleDateString()}</p>

      <h2>1. Who we are</h2>
      <p>Kinship Hub is a family connection platform. This privacy policy explains how we handle your data.</p>
      <p><strong>Contact:</strong> kinshiphub@proton.me</p>

      <h2>2. What data we collect</h2>
      <ul>
        <li><strong>Email address</strong> — to create your account and log you in</li>
        <li><strong>Payment information</strong> — processed by Stripe (we never see your card details)</li>
        <li><strong>Usage data</strong> — basic analytics to improve the service (optional)</li>
      </ul>

      <h2>3. Cookies</h2>
      <p>We use essential cookies only for authentication (keeping you logged in). No tracking or advertising cookies are used.</p>

      <h2>4. Children under 18</h2>
      <p>Kinship Hub is a family platform. If you are under 18, please use this service with a parent or guardian. We do not knowingly collect personal data from children under 13 without parental consent.</p>

      <h2>5. Your rights</h2>
      <p>Under UK GDPR, you have the right to:</p>
      <ul>
        <li>Access your data</li>
        <li>Correct inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Object to processing</li>
      </ul>
      <p>Email <strong>kinshiphub@proton.me</strong> to exercise these rights.</p>

      <h2>6. Data security</h2>
      <p>We use Supabase (secure database) and Stripe (PCI-compliant payments). Your data is encrypted in transit and at rest.</p>

      <h2>7. Changes to this policy</h2>
      <p>We will notify users of significant changes via email or a banner on the site.</p>
    </div>
  );
}
