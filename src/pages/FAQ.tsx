export default function FAQ() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' }}>Frequently Asked Questions</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>What is Kinship Hub?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>A family organisation app designed for neurodivergent families. Manage chores, rewards, shopping lists, and daily schedules in one place.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>How much does it cost?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>Free plan includes up to 3 family members, 8 chores per person, and 5 rewards. Premium is £2.99/month for unlimited everything and no ads.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>How do I reset my password?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>Email <a href="mailto:kinshiphub@proton.me" style={{ color: '#4F46E5' }}>kinshiphub@proton.me</a> and we'll reset it for you within 24 hours.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>How do I cancel my subscription?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>Go to Settings → Click "Cancel Subscription". Your premium features will work until the end of your billing period.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Is my data safe?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>Yes. We use Supabase (secure database) and Stripe (PCI-compliant payments). Your data is encrypted in transit and at rest.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Can I use it on my phone?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>Yes. Works on phones, tablets, and computers — just open your browser.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>What's your refund policy?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>You can cancel anytime. No refunds for partial months — you keep premium features until your billing period ends.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>I found a bug. What do I do?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>Email <a href="mailto:kinshiphub@proton.me" style={{ color: '#4F46E5' }}>kinshiphub@proton.me</a> with details and we'll fix it as soon as possible.</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Who made Kinship Hub?</h3>
        <p style={{ color: '#4B5563', lineHeight: '1.5' }}>A solo developer building tools to help neurodivergent families live more calmly.</p>
      </div>
    </div>
  );
}
