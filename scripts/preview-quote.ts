import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

(async () => {
  try {
    // Dynamic import of the PDF generator to avoid ESM resolution issues when running with ts-node
    const { pathToFileURL } = await import('url');
    const quoteModulePath = path.join(process.cwd(), 'src/lib/quotePdf.ts');
  const mod = await import(pathToFileURL(quoteModulePath).href) as unknown;
  type QuoteMod = { generateQuotePDF: (opts: unknown) => Promise<Uint8Array | Buffer> }
  const { generateQuotePDF } = mod as QuoteMod;

    const pdfBytes = await generateQuotePDF({
      correlativo: 'PREVIEW-001',
      contact: {
        company: 'ACME S.A.',
        email: 'cliente@acme.cl',
        phone: '+56 9 1234 5678',
        document: '12.345.678-9',
      },
      items: [
        { name: 'TUERCA HX 2H GALV', qty: 1, price: 0, sku: 'SKU-123', unit_size: '1/2"', measurement_unit: 'pulg', characteristics: ['Galvanizado'] },
        { name: 'TORNILLO M8x20', qty: 10, price: 120, sku: 'SKU-456', unit_size: 'M8', measurement_unit: 'mm', characteristics: ['Acero Inox'] },
      ],
      createdAt: new Date().toISOString(),
    });

    const outDir = path.join(process.cwd(), 'tmp');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'preview-quote.pdf');
    fs.writeFileSync(outPath, pdfBytes);
    console.log('PDF guardado en:', outPath);

    // Abre en Preview (macOS)
    execSync(`open "${outPath}"`);
  } catch (err) {
    console.error('Error preview PDF:', err);
    process.exitCode = 1;
  }
})();
