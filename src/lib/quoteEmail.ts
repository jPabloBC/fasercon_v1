// Utilidad para mostrar fracciones amigables
function toFraction(value: string | number | null | undefined): string {
  if (value == null || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  if (Number.isInteger(num)) return String(num);
  const denominators = [2, 3, 4, 8, 16];
  for (const d of denominators) {
    const n = Math.round(num * d);
    if (Math.abs(num - n / d) < 1e-6) {
      const whole = Math.floor(num);
      const remainder = n - whole * d;
      if (whole > 0 && remainder > 0) {
        return `${whole} ${remainder}/${d}`;
      } else if (whole > 0 && remainder === 0) {
        return `${whole}`;
      } else {
        return `${n}/${d}`;
      }
    }
  }
  return num.toFixed(2);
}
// Utilidad para mostrar símbolo de unidad amigable en correos
const unitSymbols: Record<string, string> = {
  in: '"',
  ft: "'",
  m: 'm',
  cm: 'cm',
  mm: 'mm',
  kg: 'kg',
  g: 'g',
  ton: 't',
  l: 'l',
  unit: '',
  box: ' caja',
  pack: ' paquete',
  roll: ' rollo',
  other: '',
};
function unitSymbol(unit?: string | null) {
  if (!unit) return '';
  return unitSymbols[unit] ?? unit;
}
export interface QuoteContact {
  rut?: string | null;
  company: string;
  email: string;
  phone: string;
  document?: string | null;
}

export interface QuoteItem {
  product_id: string | number;
  name: string;
  image_url?: string | null;
  unit_size?: string | null;
  measurement_unit?: string | null;
  qty: number;
  price?: number | null;
  sku?: string;
}

export const buildQuoteEmail = ({ contact, items }: { contact: QuoteContact, items: QuoteItem[] }) => {
  const itemRows = items.map(item => {
    const symbol = unitSymbol(item.measurement_unit);
    const unitSizeStr = toFraction(item.unit_size);
    return `<tr>
      <td style="padding:8px;border:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.sku || ''}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.qty}</td>
      <td style="padding:8px;border:1px solid #eee;">${unitSizeStr}${symbol ? ' ' + symbol : ''}</td>
    </tr>`;
  }).join('');

  return {
    subject: 'Solicitud de Cotización - Fasercon',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="background:#e53e3e;color:white;padding:16px 0;text-align:center;">Solicitud de Cotización Fasercon</h2>
        <p>Hola <b>${contact.company}</b>,</p>
        <p>Gracias por enviar tu solicitud de cotización. Estos son los detalles recibidos:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background:#f7fafc;">
              <th style="padding:8px;border:1px solid #eee;">Producto</th>
              <th style="padding:8px;border:1px solid #eee;">SKU</th>
              <th style="padding:8px;border:1px solid #eee;">Cantidad</th>
              <th style="padding:8px;border:1px solid #eee;">Unidad</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        <p><b>Contacto:</b></p>
        <ul>
          <li>Empresa: ${contact.company}</li>
          <li>Email: ${contact.email}</li>
          <li>Teléfono: ${contact.phone}</li>
          ${contact.rut ? `<li>RUT/Documento: ${contact.rut}</li>` : ''}
        </ul>
        <p>Nos pondremos en contacto contigo a la brevedad.</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#888;text-align:center;">Este correo es automático. No respondas a este mensaje.</p>
      </div>
    `,
    text: `Solicitud de Cotización Fasercon\n\nEmpresa: ${contact.company}\nEmail: ${contact.email}\nTeléfono: ${contact.phone}\n${contact.rut ? `RUT/Documento: ${contact.rut}\n` : ''}\n\nProductos:\n${items.map(i => {
      const symbol = unitSymbol(i.measurement_unit);
      const unitSizeStr = toFraction(i.unit_size);
      return `- ${i.name} (${i.qty} ${unitSizeStr}${symbol ? ' ' + symbol : ''})`;
    }).join('\\n')}`
  }
}

export const buildInternalQuoteEmail = ({ contact, items, isQuote }: { contact: QuoteContact, items: QuoteItem[], isQuote?: boolean }) => {
  const itemRows = items.map(item => {
    const symbol = unitSymbol(item.measurement_unit);
    const unitSizeStr = toFraction(item.unit_size);
    return `<tr>
      <td style="padding:8px;border:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.sku || ''}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.qty}</td>
      <td style="padding:8px;border:1px solid #eee;">${unitSizeStr}${symbol ? ' ' + symbol : ''}</td>
    </tr>`;
  }).join('');

  if (isQuote) {
    return {
      subject: 'Acuse de envío de Cotización - Fasercon',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
          <h2 style="background:#2d3748;color:white;padding:16px 0;text-align:center;">Cotización enviada al cliente</h2>
          <p>Se ha enviado la cotización al cliente con los siguientes detalles:</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <thead>
              <tr style="background:#edf2f7;">
                <th style="padding:8px;border:1px solid #eee;">Producto</th>
                <th style="padding:8px;border:1px solid #eee;">SKU</th>
                <th style="padding:8px;border:1px solid #eee;">Cantidad</th>
                <th style="padding:8px;border:1px solid #eee;">Unidad</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          <p><b>Contacto:</b></p>
          <ul>
            <li>Empresa: ${contact.company}</li>
            <li>Email: ${contact.email}</li>
            <li>Teléfono: ${contact.phone}</li>
            ${contact.rut ? `<li>RUT/Documento: ${contact.rut}</li>` : ''}
          </ul>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
          <p style="font-size:12px;color:#888;text-align:center;">Este correo es un acuse interno del envío de cotización.</p>
        </div>
      `,
      text: `Acuse de envío de Cotización Fasercon\n\nEmpresa: ${contact.company}\nEmail: ${contact.email}\nTeléfono: ${contact.phone}\n${contact.rut ? `RUT/Documento: ${contact.rut}\n` : ''}\n\nProductos:\n${items.map(i => {
        const symbol = unitSymbol(i.measurement_unit);
        const unitSizeStr = toFraction(i.unit_size);
        return `- ${i.name} (${i.qty} ${unitSizeStr}${symbol ? ' ' + symbol : ''})`;
      }).join('\n')}`
    };
  }

  // ...original solicitud interna...
  return {
    subject: 'Nueva Solicitud de Cotización (Interno) - Fasercon',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="background:#2d3748;color:white;padding:16px 0;text-align:center;">Solicitud de Cotización Fasercon</h2>
        <p>Se ha recibido una nueva solicitud de cotización con los siguientes detalles:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr style="background:#edf2f7;">
              <th style="padding:8px;border:1px solid #eee;">Producto</th>
              <th style="padding:8px;border:1px solid #eee;">SKU</th>
              <th style="padding:8px;border:1px solid #eee;">Cantidad</th>
              <th style="padding:8px;border:1px solid #eee;">Unidad</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
        <p><b>Contacto:</b></p>
        <ul>
          <li>Empresa: ${contact.company}</li>
          <li>Email: ${contact.email}</li>
          <li>Teléfono: ${contact.phone}</li>
          ${contact.rut ? `<li>RUT/Documento: ${contact.rut}</li>` : ''}
        </ul>
        <hr style="margin:24px 0;border:none;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#888;text-align:center;">Este correo es interno y está destinado únicamente para uso administrativo.</p>
      </div>
    `,
    text: `Nueva Solicitud de Cotización (Interno) Fasercon\n\nEmpresa: ${contact.company}\nEmail: ${contact.email}\nTeléfono: ${contact.phone}\n${contact.rut ? `RUT/Documento: ${contact.rut}\n` : ''}\n\nProductos:\n${items.map(i => {
      const symbol = unitSymbol(i.measurement_unit);
      const unitSizeStr = toFraction(i.unit_size);
      return `- ${i.name} (${i.qty} ${unitSizeStr}${symbol ? ' ' + symbol : ''})`;
    }).join('\\n')}`
  };
};
