export default {
  async afterCreate(event: any) {
    const { result } = event;

    try {
      await strapi.plugin('email').service('email').send({
        to: process.env.RECEIVER_EMAIL,
        subject: `ახალი შეტყობინება: ${result.name || 'საკონტაქტო ფორმა'}`,
        html: `
          <h2>ახალი შეტყობინება საიტიდან</h2>
          <p><strong>სახელი:</strong> ${result.name || '—'}</p>
          <p><strong>ელ-ფოსტა:</strong> ${result.email || '—'}</p>
          <p><strong>ტელეფონი:</strong> ${result.phone || '—'}</p>
          <p><strong>შეტყობინება:</strong></p>
          <blockquote style="background: #f4f4f4; padding: 12px; border-left: 4px solid #A36A32;">
            ${result.message || '—'}
          </blockquote>
        `,
      });
      console.log('Successfully sent contact notification email!');
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  },
};