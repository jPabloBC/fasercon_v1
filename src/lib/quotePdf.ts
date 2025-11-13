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
import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Disable the ESLint rule for 'any' usage in this file
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generateQuotePDF({
  correlativo,
  contact,
  items,
  createdAt,
}: {
  correlativo: string;
  contact: { company: string; email: string; phone: string; document?: string | null };
  items: Array<{
    name: string;
    qty: number;
    unit_size?: string | null;
    measurement_unit?: string | null;
    price?: number | null;
    characteristics?: string[];
    description?: string;
    manufacturer?: string;
    sku?: string; // Added SKU field
  }>;
  createdAt: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  // Fuentes: intentar usar Sintony desde public/assets/fonts si existe, si no fallback a Helvetica
  let fontBold: any;
  let fontRegular: any;
  try {
    const sintonyRegularPath = path.join(process.cwd(), 'public/assets/fonts/Sintony-Regular.ttf');
    const sintonyBoldPath = path.join(process.cwd(), 'public/assets/fonts/Sintony-Bold.ttf');
    if (fs.existsSync(sintonyRegularPath) && fs.existsSync(sintonyBoldPath)) {
      const regularBytes = fs.readFileSync(sintonyRegularPath);
      const boldBytes = fs.readFileSync(sintonyBoldPath);
      fontRegular = await pdfDoc.embedFont(regularBytes);
      fontBold = await pdfDoc.embedFont(boldBytes);
    } else {
      // Fallback a fuentes estándar
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }
  } catch (err) {
    console.error('Error embedding custom fonts, falling back to StandardFonts:', err);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }
  
  // Paleta corporativa: rojo (primario), negro y grises
  const primaryRed = rgb(0.71, 0.11, 0.11); // aproximadamente #B71C1C
  const darkGray = rgb(0.18, 0.18, 0.18);
  const lightGray = rgb(0.95, 0.95, 0.95);

  // ============= HEADER (gris claro) =============
  // Header aún más pequeño: solo contiene el logo
  const headerHeight = 60; // reducido para mostrar únicamente el logo
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width: width,
    height: headerHeight,
    color: lightGray,
  });

  // Logo en el header (centrado verticalmente en el header)
  try {
    const logoPath = path.join(process.cwd(), 'public/assets/images/fasercon_logo2.png');
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    // Preservar aspect ratio: calcular tamaño que encaje en el maxWidth/maxHeight
    const maxLogoWidth = 120;
    const maxLogoHeight = 36;
    const imgWidth = logoImage.width;
    const imgHeight = logoImage.height;
    const scale = Math.min(maxLogoWidth / imgWidth, maxLogoHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const logoY = height - headerHeight + (headerHeight - drawHeight) / 2;
    page.drawImage(logoImage, {
      x: 40,
      y: logoY,
      width: drawWidth,
      height: drawHeight,
    });
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  // Título centrado fuera del header: más grande, peso normal y gris más claro
  const marginTop = 40; // mayor espacio vertical entre el bottom del header y el título
  const titleText = 'Cotización';
  const titleSize = 24; // más grande
  const titleWidth = fontRegular.widthOfTextAtSize(titleText, titleSize);
  const titleY = height - headerHeight - marginTop;
  const lightGrayText = rgb(0.6, 0.6, 0.6); // gris más claro
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: titleY,
    size: titleSize,
    font: fontRegular,
    color: lightGrayText,
  });

  // N° encima de la Fecha, ambos a la derecha y con el mismo tamaño (11), más abajo respecto al header
  const numberText = `N°: ${correlativo}`;
  const infoSize = 11;
  const numberWidth = fontRegular.widthOfTextAtSize(numberText, infoSize);
  const dateText = `Fecha: ${new Date(createdAt).toLocaleDateString('es-CL')}`;
  const dateWidth = fontRegular.widthOfTextAtSize(dateText, infoSize);
  const rightXNumber = width - 40 - numberWidth;
  const rightXDate = width - 40 - dateWidth;
  // colocarlos con un gap vertical entre ellos
  const numberY = titleY - 30; // Adjusted from -20 to -30
  const dateY = numberY - 15; // Keeping the same gap between N° and Fecha
  page.drawText(numberText, {
    x: rightXNumber,
    y: numberY,
    size: infoSize,
    font: fontRegular,
    color: darkGray,
  });
  page.drawText(dateText, {
    x: rightXDate,
    y: dateY,
    size: infoSize,
    font: fontRegular,
    color: darkGray,
  });

  // ============= INFORMACIÓN DEL CLIENTE Y EMPRESA (tabla con filas alternadas) =============
  let y = height - 170; // Increased from 150 to 200 to move the block further down
  const tableX = 40;
  const tableWidth = width - 80;
  const colGap = 20;
  const colWidth = (tableWidth - colGap) / 2;
  const leftX = tableX;
  const rightX = tableX + colWidth + colGap;

  // Preparar líneas para cada columna
  const leftLines: string[] = [
    'Datos del Cliente:',
    `Empresa: ${contact.company}`,
    `Email: ${contact.email}`,
    `Teléfono: ${contact.phone}`,
  ];
  if (contact.document) leftLines.push(`RUT/Documento: ${contact.document}`);

  const rightLines: string[] = [
    'Datos de la Empresa:',
    'FASERCON',
    'Email: info@fasercon.cl',
    'Teléfono: +56 9 2345 6789',
    'Web: fasercon.cl',
  ];

  const maxRows = Math.max(leftLines.length, rightLines.length);
  const rowHeight = 18;

  // Dibujar filas: títulos sin background y con línea inferior; el resto filas alternadas
  for (let i = 0; i < maxRows; i++) {
    const rowTop = y - i * rowHeight;
    const rowBottom = rowTop - rowHeight;

    const leftText = leftLines[i] || '';
    const rightText = rightLines[i] || '';

    if (i === 0) {
      // Títulos: sin background, con línea inferior gris
      const titleSize = 13;
      const titleColor = rgb(0.6, 0.6, 0.6);
      if (leftText) {
        // si tiene ':', dibujar label en bold (incluyendo los dos puntos)
        const idx = leftText.indexOf(':');
        if (idx !== -1) {
          const label = leftText.slice(0, idx + 1);
          page.drawText(label, {
            x: leftX + 6,
            y: rowBottom + 4,
            size: titleSize,
            font: fontBold,
            color: titleColor,
          });
        } else {
          page.drawText(leftText, {
            x: leftX + 6,
            y: rowBottom + 4,
            size: titleSize,
            font: fontBold,
            color: titleColor,
          });
        }
      }
      if (rightText) {
        const idx = rightText.indexOf(':');
        if (idx !== -1) {
          const label = rightText.slice(0, idx + 1);
          page.drawText(label, {
            x: rightX + 6,
            y: rowBottom + 4,
            size: titleSize,
            font: fontBold,
            color: titleColor,
          });
        } else {
          page.drawText(rightText, {
            x: rightX + 6,
            y: rowBottom + 4,
            size: titleSize,
            font: fontBold,
            color: titleColor,
          });
        }
      }
      // línea inferior gris
      page.drawRectangle({
        x: tableX,
        y: rowBottom,
        width: tableWidth,
        height: 1,
        color: rgb(0.85, 0.85, 0.85),
      });
    } else {
      // Filas regulares con fondo alternado
      const isEven = i % 2 === 0;
      page.drawRectangle({
        x: tableX,
        y: rowBottom,
        width: tableWidth,
        height: rowHeight,
        color: isEven ? lightGray : rgb(1, 1, 1),
      });

      // Left: si contiene ':', separar label (bold) y value (normal)
      if (leftText) {
        const idx = leftText.indexOf(':');
        if (idx !== -1) {
          const label = leftText.slice(0, idx + 1);
          const value = leftText.slice(idx + 1).trim();
          page.drawText(label, {
            x: leftX + 6,
            y: rowBottom + 4,
            size: 11,
            font: fontBold,
            color: darkGray,
          });
          const labelWidth = fontBold.widthOfTextAtSize(label, 11);
          page.drawText(value, {
            x: leftX + 6 + labelWidth + 4,
            y: rowBottom + 4,
            size: 11,
            font: fontRegular,
            color: darkGray,
          });
        } else {
          page.drawText(leftText, {
            x: leftX + 6,
            y: rowBottom + 4,
            size: 11,
            font: fontRegular,
            color: darkGray,
          });
        }
      }

      // Right: idem
      if (rightText) {
        const idx = rightText.indexOf(':');
        if (idx !== -1) {
          const label = rightText.slice(0, idx + 1);
          const value = rightText.slice(idx + 1).trim();
          page.drawText(label, {
            x: rightX + 6,
            y: rowBottom + 4,
            size: 11,
            font: fontBold,
            color: darkGray,
          });
          const labelWidth = fontBold.widthOfTextAtSize(label, 11);
          page.drawText(value, {
            x: rightX + 6 + labelWidth + 4,
            y: rowBottom + 4,
            size: 11,
            font: fontRegular,
            color: darkGray,
          });
          // Si es el campo Web, añadir anotación URI para hacerlo clicable
          try {
            const maybeLabel = label.trim().toLowerCase();
            const maybeValue = value;
            if (maybeLabel === 'web:' && maybeValue === 'fasercon.cl') {
              const infoSizeLocal = 11;
              const valueWidth = fontRegular.widthOfTextAtSize(maybeValue, infoSizeLocal);
              const valueX = rightX + 6 + labelWidth + 4;
              const valueY = rowBottom + 4;
              // añadir un pequeño padding al rect
              const padSmall = 2;
              const rect = [
                valueX - padSmall,
                valueY - padSmall,
                valueX + valueWidth + padSmall,
                valueY + infoSizeLocal + padSmall,
              ];
              const uri = 'https://fasercon.cl';
              // ampliar padding para mejorar la zona clickable
              const pad = 4;
              const rectArray = pdfDoc.context.obj([
                rect[0] - pad,
                rect[1] - pad,
                rect[2] + pad,
                rect[3] + pad,
              ]);
              const action = pdfDoc.context.obj({
                Type: PDFName.of('Action'),
                S: PDFName.of('URI'),
                URI: uri,
              });
              const linkAnnot = pdfDoc.context.obj({
                Type: PDFName.of('Annot'),
                Subtype: PDFName.of('Link'),
                Rect: rectArray,
                Border: pdfDoc.context.obj([0, 0, 0]),
                A: action,
              });
              const linkRef = pdfDoc.context.register(linkAnnot);
              // Normalizar la página primero para asegurar que Annots existe
              (page.node as any).normalize();
              try {
                if (typeof (page.node as any).addAnnot === 'function') {
                  (page.node as any).addAnnot(linkRef);
                } else {
                  // Método alternativo: obtener o crear el array de anotaciones
                  const annotsKey = PDFName.of('Annots');
                  let annots = page.node.lookup(annotsKey);
                  if (!annots) {
                    annots = pdfDoc.context.obj([]);
                    page.node.set(annotsKey, annots);
                  }
                  if (typeof (annots as any).push === 'function') {
                    (annots as any).push(linkRef);
                  }
                }
              } catch (e) {
                console.error('Could not attach annotation to page:', e);
              }
            }
          } catch (e) {
            // no bloquear la generación si falla la anotación
            console.error('Error adding link annotation:', e);
          }
        } else {
          // No label: render normal (e.g., 'FASERCON')
          page.drawText(rightText, {
            x: rightX + 6,
            y: rowBottom + 4,
            size: 11,
            font: fontRegular,
            color: darkGray,
          });
        }
      }
    }
  }

  // Mover y hacia abajo después de la tabla
  y = y - maxRows * rowHeight - 10;

  // ============= TABLA DE PRODUCTOS =============
  y = Math.min(height - 280, y - 30);

  // Update product table to display SKU below the name in smaller gray text
  page.drawText('Productos:', {
    x: 40,
    y,
    size: 14,
    font: fontBold,
    color: darkGray,
  });
  y -= 25;

  // Table header
  page.drawRectangle({
    x: 40,
    y: y - 20,
    width: width - 80,
    height: 25,
    color: primaryRed,
  });

  page.drawText('Nombre', {
    x: 50,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Características', {
    x: 280,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Unidad', {
    x: 420,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Cantidad', {
    x: 490,
    y: y - 15,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  y -= 25;

  // Product rows
  items.forEach((item, idx) => {
    if (y < 100) return; // Avoid overflow

    const baseRowHeight = 18; // Más alto para dejar espacio a SKU
    const characteristics = item.characteristics || [];
    const totalRows = Math.max(1, characteristics.length);
    // Si hay SKU, el bloque debe ser más alto
    const hasSKU = !!item.sku;
    const blockHeight = baseRowHeight * totalRows + (hasSKU ? 10 : 0);

    page.drawRectangle({
      x: 40,
      y: y - blockHeight,
      width: width - 80,
      height: blockHeight,
      color: idx % 2 === 0 ? lightGray : rgb(1, 1, 1),
    });

    // Draw product name
    page.drawText(item.name.substring(0, 35), {
      x: 50,
      y: y - 12, // Un poco más abajo
      size: 10,
      font: fontRegular,
      color: darkGray,
    });

    // Draw SKU justo debajo del nombre, dentro del bloque
    if (item.sku) {
      page.drawText(`SKU: ${item.sku}`, {
        x: 50,
        y: y - 22, // Solo 10px debajo del nombre
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    // Draw characteristics in their own column
    characteristics.forEach((char, charIdx) => {
      const charY = y - charIdx * baseRowHeight - 10;
      page.drawText(char.substring(0, 50), {
        x: 280, // Characteristics column
        y: charY,
        size: 10, // Match size with other columns
        font: fontRegular,
        color: darkGray,
      });
    });

    // Draw other columns, vertically centered
    const centeredY = y - blockHeight / 2;
    // Mostrar unidad con símbolo amigable
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
    if (item.unit_size && item.measurement_unit) {
      const symbol = unitSymbols[item.measurement_unit] ?? item.measurement_unit;
      const unitSizeStr = toFraction(item.unit_size);
      page.drawText(`${unitSizeStr}${symbol ? ' ' + symbol : ''}`, {
        x: 420, // Unit column
        y: centeredY,
        size: 10, // Match size with other columns
        font: fontRegular,
        color: darkGray,
      });
    }
    page.drawText(`${item.qty}`, {
      x: 490, // Quantity column
      y: centeredY,
      size: 10, // Match size with other columns
      font: fontRegular,
      color: darkGray,
    });

    y -= blockHeight + 10; // Add spacing between product blocks
  });

  // ============= FOOTER =============
  // Reduce the height of the footer and decrease the text size
  page.drawRectangle({
    x: 0,
    y: 0,
    width: width,
    height: 30, // Reduced from 50 to 40
    color: primaryRed,
  });
  
  const footerText = 'Web: fasercon.cl · Tel: +56 9 9868 0862 · Email: ventas@fasercon.cl';
  const footerTextWidth = fontRegular.widthOfTextAtSize(footerText, 8); // Reduced text size from 10 to 8
  page.drawText(footerText, {
    x: (width - footerTextWidth) / 2, // Centered horizontally
    y: 15, // Adjusted to fit within the smaller footer
    size: 8, // Reduced text size
    font: fontRegular,
    color: rgb(1, 1, 1),
  });

  // Add a clickable link to 'fasercon.cl' in the footer
  const footerLinkText = 'Web: fasercon.cl';
  const footerLinkWidth = fontRegular.widthOfTextAtSize(footerLinkText, 8);
  const linkX = (width - footerTextWidth) / 2 + footerText.indexOf('fasercon.cl') * 4.5; // Approximate position of 'fasercon.cl'
  const linkY = 15;
  const linkRect = [
    linkX - 2, // Add padding around the text
    linkY - 2,
    linkX + footerLinkWidth + 2,
    linkY + 8,
  ];
  const linkAction = pdfDoc.context.obj({
    Type: PDFName.of('Action'),
    S: PDFName.of('URI'),
    URI: 'https://fasercon.cl',
  });
  const linkAnnot = pdfDoc.context.obj({
    Type: PDFName.of('Annot'),
    Subtype: PDFName.of('Link'),
    Rect: pdfDoc.context.obj(linkRect),
    Border: pdfDoc.context.obj([0, 0, 0]),
    A: linkAction,
  });
  const linkRef = pdfDoc.context.register(linkAnnot);
  (page.node as any).normalize();
  const annotsKey = PDFName.of('Annots');
  let annots = page.node.lookup(annotsKey);
  if (!annots) {
    annots = pdfDoc.context.obj([]);
    page.node.set(annotsKey, annots);
  }
  // Fix the annotation addition logic for the footer link
  if (Array.isArray(annots)) {
    annots.push(linkRef);
  } else if (typeof annots === 'object' && 'push' in annots) {
    (annots as any).push(linkRef);
  } else {
    console.error('Could not add annotation to the page: Annots is not an array.');
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}
