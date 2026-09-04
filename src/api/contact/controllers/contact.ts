import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::contact.contact', ({ strapi }) => ({
  async send(ctx) {
    const { name, email, phone, message } = ctx.request.body;

    if (!email || !message) {
      return ctx.badRequest('Email and message are required');
    }

    try {
      // Find the first published entry in your Contact Info collection
      const contactInfos = await strapi.documents('api::contact-info.contact-info').findMany({
        limit: 1,
      });

      const contactInfo = contactInfos[0];
      const destinationEmail = contactInfo?.receiverEmail || process.env.RECEIVER_EMAIL;

      if (!destinationEmail) {
        return ctx.badRequest('Receiver email is not configured in Strapi Admin.');
      }

      await strapi.plugin('email').service('email').send({
        to: destinationEmail,
        from: process.env.SMTP_USERNAME,
        replyTo: email,
        subject: `New Contact Form Message from ${name || email}`,
        html: `
          <h2>New Contact Form Message</h2>
          <p><strong>Name:</strong> ${name || 'N/A'}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
          <br/>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      });

      return { success: true, message: 'Email sent successfully' };
    } catch (err: any) {
      console.error('Email send error:', err);
      return ctx.internalServerError(err?.message || 'Failed to send email');
    }
  },
}));