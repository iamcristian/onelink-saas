import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendInvitationParams {
  to: string;
  inviteeName: string;
  inviterName: string;
  inviterUsername: string;
  workspacePlan: string;
  role: string;
  actionUrl: string;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST') || 'localhost';
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 1025;

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        ignoreTLS: true,
      });
      this.logger.log(`Initialized MailHog SMTP transport on ${host}:${port}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Could not initialize SMTP transport: ${msg}`);
    }
  }

  async sendTeamInvitation(params: SendInvitationParams) {
    if (!this.transporter) {
      this.logger.warn(`Email transporter unavailable. Skipped sending email to ${params.to}`);
      return null;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>OneLink Team Invitation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #fafafa; margin: 0; padding: 24px; }
          .container { max-width: 580px; margin: 0 auto; background-color: #121215; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; padding: 32px; }
          .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
          .logo { background-color: #ffffff; color: #09090b; font-weight: 800; font-size: 16px; width: 36px; height: 36px; border-radius: 8px; display: inline-block; line-height: 36px; text-align: center; }
          .brand { font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; display: inline-block; margin-left: 8px; vertical-align: middle; }
          .badge { display: inline-block; font-size: 11px; font-weight: 700; font-family: monospace; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; background-color: rgba(168, 85, 247, 0.2); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.4); margin-bottom: 16px; }
          h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
          p { font-size: 14px; line-height: 1.6; color: #a1a1aa; margin-bottom: 16px; }
          .card { background-color: #18181b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 18px; margin: 24px 0; }
          .card-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .card-row:last-child { margin-bottom: 0; }
          .card-label { color: #71717a; }
          .card-val { color: #fafafa; font-weight: 600; text-align: right; }
          .btn-container { text-align: center; margin: 32px 0 16px 0; }
          .btn { display: inline-block; background-color: #ffffff; color: #09090b !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 9999px; }
          .footer { font-size: 12px; color: #71717a; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo">1L</span>
            <span class="brand">OneLink Bio Studio</span>
          </div>
          <span class="badge">Team Collaboration Invitation</span>
          <h1>Join @${params.inviterUsername}'s Workspace</h1>
          <p>Hello ${params.inviteeName},</p>
          <p><strong>${params.inviterName}</strong> (@${params.inviterUsername}) has invited you to collaborate on their <strong>${params.workspacePlan}</strong> OneLink profile with full enterprise governance privileges.</p>
          
          <div class="card">
            <div class="card-row">
              <span class="card-label">Workspace: </span>
              <span class="card-val">@${params.inviterUsername} (${params.workspacePlan})</span>
            </div>
            <div class="card-row">
              <span class="card-label">Assigned Role: </span>
              <span class="card-val">${params.role}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Invited Email: </span>
              <span class="card-val">${params.to}</span>
            </div>
            <div class="card-row">
              <span class="card-label">Security &amp; 2FA: </span>
              <span class="card-val">Enforced</span>
            </div>
          </div>

          <p>To accept this invitation, log into OneLink with this email address (<strong>${params.to}</strong>), where an instant activation banner will greet you in your Studio.</p>

          <div class="btn-container">
            <a href="${params.actionUrl}" class="btn" target="_blank">Open OneLink Studio &rarr;</a>
          </div>

          <div class="footer">
            OneLink Architecture &bull; Local SMTP Mailbox (MailHog:8025) &bull; Automated System Dispatch
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: '"OneLink Studio" <notifications@onelink.bio>',
        to: params.to,
        subject: `Invitation to collaborate on @${params.inviterUsername}'s OneLink workspace`,
        text: `Hello ${params.inviteeName},\n\n${params.inviterName} (@${params.inviterUsername}) has invited you to collaborate on their ${params.workspacePlan} workspace as ${params.role}.\n\nLog into ${params.actionUrl} with email ${params.to} to accept and manage the profile.`,
        html: htmlContent,
      });
      this.logger.log(`Invitation email successfully dispatched to ${params.to} (MessageId: ${info.messageId})`);
      return info;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send invitation email to ${params.to}: ${msg}`);
      return null;
    }
  }
}
