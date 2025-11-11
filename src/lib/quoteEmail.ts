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
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px;border:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.sku || ''}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.qty}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.unit_size || ''} ${item.measurement_unit || ''}</td>
    </tr>
  `).join('');

  return {
    subject: 'Cotización enviada - Fasercon',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="background:#e53e3e;color:white;padding:16px 0;text-align:center;">Cotización Fasercon</h2>
        <p>Hola <b>${contact.company}</b>,</p>
        <p>Gracias por solicitar una cotización. Estos son los detalles enviados:</p>
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
    text: `Cotización Fasercon\n\nEmpresa: ${contact.company}\nEmail: ${contact.email}\nTeléfono: ${contact.phone}\n${contact.rut ? `RUT/Documento: ${contact.rut}\n` : ''}\n\nProductos:\n${items.map(i => `- ${i.name} (${i.qty} ${i.unit_size || ''} ${i.measurement_unit || ''})`).join('\n')}`
  }
}

export const buildInternalQuoteEmail = ({ contact, items }: { contact: QuoteContact, items: QuoteItem[] }) => {
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px;border:1px solid #eee;">${item.name}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.sku || ''}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.qty}</td>
      <td style="padding:8px;border:1px solid #eee;">${item.unit_size || ''} ${item.measurement_unit || ''}</td>
    </tr>
  `).join('');

  return {
    subject: 'Nueva Cotización Interna - Fasercon',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
        <h2 style="background:#2d3748;color:white;padding:16px 0;text-align:center;">Cotización Interna Fasercon</h2>
        <p>Se ha generado una nueva cotización con los siguientes detalles:</p>
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
    text: `Nueva Cotización Interna Fasercon\n\nEmpresa: ${contact.company}\nEmail: ${contact.email}\nTeléfono: ${contact.phone}\n${contact.rut ? `RUT/Documento: ${contact.rut}\n` : ''}\n\nProductos:\n${items.map(i => `- ${i.name} (${i.qty} ${i.unit_size || ''} ${i.measurement_unit || ''})`).join('\n')}`
  };
};
