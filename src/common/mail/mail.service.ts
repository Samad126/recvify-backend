import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TransactionalEmailsApi,
  TransactionalEmailsApiApiKeys,
  SendSmtpEmail,
} from '@getbrevo/brevo';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly client: TransactionalEmailsApi;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new TransactionalEmailsApi();
    this.client.setApiKey(
      TransactionalEmailsApiApiKeys.apiKey,
      this.configService.get<string>('BREVO_API_KEY') ?? '',
    );
    this.from =
      this.configService.get<string>('MAIL_FROM') ?? 'noreply@recvify.app';
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const email = new SendSmtpEmail();
    email.sender = { email: this.from };
    email.to = [{ email: to }];
    email.subject = 'Reset your ReCvify password';
    email.htmlContent = `
      <p>You requested a password reset.</p>
      <p>Click the link below to set a new password. It expires in <strong>15 minutes</strong>.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `;

    try {
      await this.client.sendTransacEmail(email);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${to}: ${(err as Error).message}`,
      );
      throw new InternalServerErrorException('Failed to send reset email');
    }
  }
}
