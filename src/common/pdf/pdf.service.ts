import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';

/**
 * Keeps one headless Chromium instance alive for the app's lifetime instead of
 * launching/closing a browser per export — launching Chromium is the slow part.
 */
@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: Browser | null = null;

  async onModuleInit() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  async renderPdf(html: string): Promise<Buffer> {
    if (!this.browser) {
      throw new InternalServerErrorException('PDF renderer is not ready');
    }
    const page = await this.browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'load' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
      });
      return Buffer.from(buffer);
    } catch (err) {
      this.logger.error(`PDF rendering failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('Failed to render PDF');
    } finally {
      await page.close();
    }
  }
}
