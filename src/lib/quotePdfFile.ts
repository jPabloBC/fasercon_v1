// Utilities for PDF generation
import { PDFDocument, rgb, StandardFonts, PDFName } from 'pdf-lib';
import { formatCLP } from '@/lib/format'
import fs from 'fs';
import path from 'path';

// Disable the ESLint rule for 'any' usage in this file
/* eslint-disable @typescript-eslint/no-explicit-any */

export async function generateQuotePDF({
  quote_number,
  correlative,
  contact,
  items,
  createdAt,
  description,
  execution_time,
  payment_method,
}:{
  quote_number?: string;
  correlative?: string;
  description?: string;
  execution_time?: string;
  payment_method?: string;
  contact: {
    company: string;
    email: string;
    phone: string;
    document?: string | null;
    company_address: string;
    contact_name: string;
  };
  items: Array<{
    name: string;
    qty: number;
    unit_size?: string | null;
    measurement_unit?: string | null;
    price?: number | null;
    subtotal?: number;
    characteristics?: string[];
    description?: string;
    manufacturer?: string;
    sku?: string;
    update_price?: number;
    discount?: number;
  }>;
  createdAt: string;
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const { width, height } = page.getSize();

  // Margen reducido
  const sideMargin = 24; // antes 40

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

  // Embedded assets for header (filled during initial header embed)
  let embeddedLogoImage: any = null;
  let infoTextFont: any = null;

  // Helper: dibuja el footer en la página pasada como parámetro
  const drawFooter = (p: any) => {
    p.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 30,
      color: primaryRed,
    });

    const footerText = 'Web: fasercon.cl   -   Tel: +56 9 9868 0862   -   Email: ventas@fasercon.cl';
    const footerTextSize = 9;
    const footerTextWidth = fontRegular.widthOfTextAtSize(footerText, footerTextSize);
    p.drawText(footerText, {
      x: (width - footerTextWidth) / 2,
      y: 15,
      size: footerTextSize,
      font: fontRegular,
      color: rgb(1, 1, 1),
    });

    // Añadir enlace clickable a 'fasercon.cl' en el footer
    const footerLinkText = 'Web: fasercon.cl';
    const footerLinkWidth = fontRegular.widthOfTextAtSize(footerLinkText, 8);
    const linkX = (width - footerTextWidth) / 2 + footerText.indexOf('fasercon.cl') * 4.5;
    const linkY = 15;
    const linkRect = [
      linkX - 2,
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
    (p.node as any).normalize();
    const annotsKey = PDFName.of('Annots');
    let annots = p.node.lookup(annotsKey);
    if (!annots) {
      annots = pdfDoc.context.obj([]);
      p.node.set(annotsKey, annots);
    }
    if (Array.isArray(annots)) {
      annots.push(linkRef);
    } else if (typeof annots === 'object' && 'push' in annots) {
      (annots as any).push(linkRef);
    } else {
      console.error('Could not add annotation to the page: Annots is not an array.');
    }
  };

  // ============= HEADER (gris claro) =============
  // Header aún más pequeño: solo contiene el logo
  const headerHeight = 90 // más alto para mostrar el logo más grande
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
    embeddedLogoImage = await pdfDoc.embedPng(logoBytes);
    // Preservar aspect ratio: calcular tamaño que encaje en el maxWidth/maxHeight
    const maxLogoWidth = 120 * 1.5; // 30% más grande
    const maxLogoHeight = 36 * 1.5; // 30% más grande
    const imgWidth = embeddedLogoImage.width;
    const imgHeight = embeddedLogoImage.height;
    const scale = Math.min(maxLogoWidth / imgWidth, maxLogoHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const logoY = height - headerHeight + (headerHeight - drawHeight) / 2;
    page.drawImage(embeddedLogoImage, {
      x: sideMargin,
      y: logoY,
      width: drawWidth,
      height: drawHeight,
    });

    // Fondo rojo a la derecha del logo
    // Texto completo y ajuste automático para que siempre se vea
    const infoText = 'Web: fasercon.cl   -   Email: ventas@fasercon.cl   -   Tel.: +56 9 9868 0862';
    let fontSize = 10;
    const infoX = sideMargin + drawWidth + 18;
    const infoY = height - headerHeight + 21; // subido 16px respecto a antes
    const infoHeight = fontSize + 10;
    const infoWidth = width - infoX - sideMargin;
    infoTextFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let textWidth = infoTextFont.widthOfTextAtSize(infoText, fontSize);
    // Si el texto no cabe, reducir el fontSize hasta que quepa
    while (textWidth > infoWidth - 16 && fontSize > 9) {
      fontSize -= 1;
      textWidth = infoTextFont.widthOfTextAtSize(infoText, fontSize);
    }
    page.drawRectangle({
      x: infoX,
      y: infoY,
      width: infoWidth,
      height: infoHeight,
      color: primaryRed,
    });
    const textX = infoX + Math.max(8, (infoWidth - textWidth) / 2);
    const textY = infoY + (infoHeight - fontSize) / 2;
    page.drawText(infoText, {
      x: textX,
      y: textY,
      size: fontSize,
      color: rgb(1, 1, 1),
      font: infoTextFont,
    });
  } catch (error) {
    console.error('Error loading logo:', error);
  }

  // Helper: dibuja el header en cualquier página (logo + barra roja de info)
  const drawHeader = (p: any) => {
    try {
      // Background band
      p.drawRectangle({
        x: 0,
        y: height - headerHeight,
        width: width,
        height: headerHeight,
        color: lightGray,
      });
      // Draw logo if embedded
      if (embeddedLogoImage) {
        const maxLogoWidth = 120 * 1.5;
        const maxLogoHeight = 36 * 1.5;
        const imgWidth = embeddedLogoImage.width;
        const imgHeight = embeddedLogoImage.height;
        const scale = Math.min(maxLogoWidth / imgWidth, maxLogoHeight / imgHeight);
        const drawWidth = imgWidth * scale;
        const drawHeight = imgHeight * scale;
        const logoY = height - headerHeight + (headerHeight - drawHeight) / 2;
        p.drawImage(embeddedLogoImage, {
          x: sideMargin,
          y: logoY,
          width: drawWidth,
          height: drawHeight,
        });

        // Info red bar to the right of logo
        const infoText = 'Web: fasercon.cl   -   Email: ventas@fasercon.cl   -   Tel.: +56 9 9868 0862';
        let fontSize = 10;
        const infoX = sideMargin + drawWidth + 18;
        const infoY = height - headerHeight + 21;
        const infoHeight = fontSize + 10;
        const infoWidth = width - infoX - sideMargin;
        const fontToUse = infoTextFont || fontRegular;
        let textWidth = fontToUse.widthOfTextAtSize(infoText, fontSize);
        while (textWidth > infoWidth - 16 && fontSize > 9) {
          fontSize -= 1;
          textWidth = fontToUse.widthOfTextAtSize(infoText, fontSize);
        }
        p.drawRectangle({ x: infoX, y: infoY, width: infoWidth, height: infoHeight, color: primaryRed });
        const textX = infoX + Math.max(8, (infoWidth - textWidth) / 2);
        const textY = infoY + (infoHeight - fontSize) / 2;
        p.drawText(infoText, { x: textX, y: textY, size: fontSize, color: rgb(1, 1, 1), font: fontToUse });
      } else {
        // Fallback: draw only the red info bar occupying the right side
        const infoText = 'Web: fasercon.cl   -   Email: ventas@fasercon.cl   -   Tel.: +56 9 9868 0862';
        const infoHeight = 20;
        const infoX = sideMargin + 120;
        const infoY = height - headerHeight + 21;
        const infoWidth = width - infoX - sideMargin;
        p.drawRectangle({ x: infoX, y: infoY, width: infoWidth, height: infoHeight, color: primaryRed });
        const textX = infoX + 12;
        const textY = infoY + 4;
        p.drawText(infoText, { x: textX, y: textY, size: 9, color: rgb(1, 1, 1), font: fontRegular });
      }
    } catch (err) {
      console.error('drawHeader error', err);
    }
  };

  // Título centrado fuera del header: más grande, peso normal y gris más claro
  const marginTop = 40; // aumentar espacio vertical entre el bottom del header y el título
  // Prefer correlative in the title when available; fall back to quote_number
  const titleText = `Cotización Nº ${correlative ?? quote_number ?? ''}`;
  const titleSize = 20; // más grande
  const titleWidth = fontRegular.widthOfTextAtSize(titleText, titleSize);
  const titleY = height - headerHeight - marginTop;
  const lightGrayText = rgb(0.6, 0.6, 0.7); // gris más claro
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: titleY,                                                                                                              
    size: titleSize,
    font: fontRegular,
    color: lightGrayText,
  });

  // Título 'DATOS DEL CLIENTE' y 'PRODUCTOS' con el mismo estilo y color
  // Cambiar el color de los títulos 'DATOS DEL CLIENTE' y 'PRODUCTOS' a un gris similar al borde
  const sectionTitleStyle = {
    size: 11,
    font: fontBold,
    color: rgb(0.6, 0.6, 0.6), // Cambiar a gris más claro
  };

  // Título 'DATOS DEL CLIENTE' más cerca del borde
  const datosClienteTitle = 'DATOS DEL CLIENTE';
  const datosClienteY = titleY - 30; // Incrementar el espacio vertical entre el título y 'DATOS DEL CLIENTE'
  page.drawText(datosClienteTitle, {
    x: sideMargin,
    y: datosClienteY,
    ...sectionTitleStyle,
  });

  // ============= INFORMACIÓN DEL CLIENTE (bloque con borde rojo delgado y menor interlineado) =============
  let y = datosClienteY - 5; // menos espacio entre título y borde
  const blockX = sideMargin;
  const blockWidth = width - sideMargin * 2;
  const blockHeight = 70;
  const blockY = y;

  // Borde rojo delgado (sin fondo)
  page.drawRectangle({
    x: blockX,
    y: blockY - blockHeight,
    width: blockWidth,
    height: blockHeight,
    borderColor: rgb(0.6, 0.6, 0.6), // Cambiar a gris más claro
    borderWidth: 1,
    color: undefined,
  });

  const padding = 8;
  const lineHeight = 15; // Interlineado reducido
  let textY = blockY - padding - 8;
  const textColor = rgb(0.3, 0.3, 0.3); // gris oscuro
  const textSize = 10;

  // Fila 1: Empresa (ancho completo, título en negrita)
  page.drawText('Empresa:', {
    x: blockX + padding,
    y: textY,
    size: textSize,
    font: fontBold,
    color: textColor,
  });
  page.drawText(`${contact.company}`, {
    x: blockX + padding + fontBold.widthOfTextAtSize('Empresa:', textSize) + 4,
    y: textY,
    size: textSize,
    font: fontRegular,
    color: textColor,
  });
  textY -= lineHeight;

  // Fila 2: Dirección (ancho completo, título en negrita)
  page.drawText('Dirección:', {
    x: blockX + padding,
    y: textY,
    size: textSize,
    font: fontBold,
    color: textColor,
  });
  page.drawText(`${contact.company_address || ''}`, {
    x: blockX + padding + fontBold.widthOfTextAtSize('Dirección:', textSize) + 4,
    y: textY,
    size: textSize,
    font: fontRegular,
    color: textColor,
  });
  // Email a la derecha de la dirección
  page.drawText('Email:', {
    x: blockX + blockWidth / 2 + padding + 40, // mover más a la derecha
    y: textY,
    size: textSize,
    font: fontBold,
    color: textColor,
  });
  page.drawText(`${contact.email || ''}`, {
    x: blockX + blockWidth / 2 + padding + 40 + fontBold.widthOfTextAtSize('Email:', textSize) + 4,
    y: textY,
    size: textSize,
    font: fontRegular,
    color: textColor,
  });
  textY -= lineHeight;

  // Fila 3: Columnas
  const col1X = blockX + padding;
  const col2X = blockX + blockWidth / 2 + padding + 40; // mover segunda columna a la derecha

  // Columna 1, fila 1: RUT (título en negrita)
  page.drawText('RUT:', {
    x: col1X,
    y: textY,
    size: textSize,
    font: fontBold,
    color: textColor,
  });
  // Depurar el valor de contact.document para verificar si llega correctamente
  console.log('Debug RUT/document:', contact.document);

  // Asegurarse de que el valor de RUT/document se renderiza correctamente
  page.drawText(`${contact.document || 'Valor no disponible'}`, {
    x: col1X + fontBold.widthOfTextAtSize('RUT:', textSize) + 4,
    y: textY,
    size: textSize,
    font: fontRegular,
    color: textColor,
  });

  // Columna 2, fila 1: Fecha (título en negrita)
  page.drawText('Fecha:', {
    x: col2X,
    y: textY,
    size: textSize,
    font: fontBold,
    color: textColor,
  });
  page.drawText(`${new Date(createdAt).toLocaleDateString('es-CL')}`, {
    x: col2X + fontBold.widthOfTextAtSize('Fecha:', textSize) + 4,
    y: textY,
    size: textSize,
    font: fontRegular,
    color: textColor,
  });
  textY -= lineHeight;

  // Columna 1, fila 2: Contacto (título en negrita)
  page.drawText('Contacto:', {
    x: col1X,
    y: textY,
    size: textSize,
    font: fontBold,
    color: textColor,
  });
  // Capitalizar el nombre de contacto
  const capitalize = (str: string) => str.replace(/\b\w/g, l => l.toUpperCase());
  page.drawText(`${capitalize(contact.contact_name || '')}`, {
    x: col1X + fontBold.widthOfTextAtSize('Contacto:', textSize) + 4,
    y: textY,
    size: textSize,
    font: fontRegular,
    color: textColor,
  });

  // Columna 2, fila 2: Teléfono (título en negrita)
  page.drawText('Teléfono:', {
    x: col2X,
    y: textY,
    size: textSize,
    font: fontBold,
    color: textColor,
  });
  page.drawText(`${contact.phone}`, {
    x: col2X + fontBold.widthOfTextAtSize('Teléfono:', textSize) + 4,
    y: textY,
    size: textSize,
    font: fontRegular,
    color: textColor,
  });

  // Mover y hacia abajo después del bloque (reducir espacio antes de 'Descripción')
  y = blockY - blockHeight - 12; // espacio reducido entre DATOS DEL CLIENTE y Descripción

  // Helper function to wrap text
  const wrapTextHelper = (text: string, font: any, fontSize: number, maxWidthPx: number): string[] => {
    if (!text) return [];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);
      if (testWidth <= maxWidthPx) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        if (font.widthOfTextAtSize(word, fontSize) > maxWidthPx) {
          let partial = '';
          for (const ch of word) {
            const candidate = partial + ch;
            if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidthPx) {
              partial = candidate;
            } else {
              if (partial) lines.push(partial);
              partial = ch;
            }
          }
          if (partial) currentLine = partial;
          else currentLine = '';
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Descripción de la cotización (dentro de un borde gris, con padding mayor y borde redondeado)
  if (true) { // Mostrar siempre la descripción, incluso si está vacía
    const descLabel = 'Descripción:';
    const descLabelSize = 10; // reducir label ligeramente
    const descValueSize = 8; // reducir más el tamaño del texto de la descripción
    const descLineHeight = 12; // interlínea más compacta para la descripción
    // Ajustar padding interno: aumentar pt y reducir mucho pb según solicitud
    const boxPaddingH = 8; // padding horizontal (izq/der) reducido
    const boxPaddingTop = 15; // padding superior reducido adicionalmente
    const boxPaddingBottom = 0; // padding inferior reducido a 0
    // Preparar todas las líneas envueltas para calcular alto del contenedor
    const firstLineLabelWidth = fontBold.widthOfTextAtSize(descLabel, descLabelSize) + 6;
    const maxDescWidthFirstLine = width - sideMargin * 2 - firstLineLabelWidth - boxPaddingH;
    const maxDescWidthOtherLines = width - sideMargin * 2 - boxPaddingH * 2;

    const allWrappedLines: string[] = [];
    const descriptionLines = (description || '').split('\n');
    let isFirstLineGlobal = true;
    for (const line of descriptionLines) {
      if (isFirstLineGlobal) {
        const wrapped = wrapTextHelper(line, fontRegular, descValueSize, maxDescWidthFirstLine);
        for (const w of wrapped) allWrappedLines.push(w);
        isFirstLineGlobal = false;
      } else {
        const wrapped = wrapTextHelper(line, fontRegular, descValueSize, maxDescWidthOtherLines);
        for (const w of wrapped) allWrappedLines.push(w);
      }
    }

    // Calculate box height based on actual first-line height and subsequent line heights
    const linesCount = Math.max(1, allWrappedLines.length);
    const firstLineHeight = Math.max(descLabelSize, descValueSize);
    const boxInnerHeight = firstLineHeight + (linesCount - 1) * descLineHeight;
    const boxHeight = boxInnerHeight + boxPaddingTop + boxPaddingBottom;

    // Draw border rectangle (gris 400) with rounded corners
    const gray400 = rgb(0.61, 0.64, 0.69);
    const boxTopY = y;
    const boxBottomY = boxTopY - boxHeight;
    // pdf-lib's drawRectangle does not accept 'borderRadius' in the current types,
    // so draw a plain rectangle with a border instead.
    page.drawRectangle({
      x: sideMargin,
      y: boxBottomY,
      width: width - sideMargin * 2,
      height: boxHeight,
      borderColor: gray400,
      borderWidth: 1,
      color: undefined,
    });

    // Draw label and lines inside box. Text must start immediately to the right of the label.
    let cursorY = boxTopY - boxPaddingTop - (firstLineHeight / 2) + (descValueSize / 2);
    // Baseline: draw label and first line on the same y
    page.drawText(descLabel, {
      x: sideMargin + boxPaddingH,
      y: cursorY,
      size: descLabelSize,
      font: fontBold,
      color: textColor,
    });

    const contentStartX = sideMargin + boxPaddingH + firstLineLabelWidth;
    let drawnFirst = false;
    for (const line of allWrappedLines) {
      const xPos = !drawnFirst ? contentStartX : (sideMargin + boxPaddingH);
      page.drawText(line, {
        x: xPos,
        y: cursorY,
        size: descValueSize,
        font: fontRegular,
        color: textColor,
      });
      drawnFirst = true;
      cursorY -= descLineHeight;
    }

    // Update y to be just below the box
    const descToFieldsGap = 20; // espacio entre Descripción y los campos de ejecución/pago (was 8)
    y = boxBottomY - descToFieldsGap;
  }

  // Mostrar Tiempo de ejecución y Forma de pago (si existen o no) justo antes de la lista de productos
  const labelSize = 10;
  const valueSize = 9;
  const gap = 6;
  // Container label/value en dos columnas
  const colLeftX = sideMargin;

  // Siempre dibujar las etiquetas en cajas con borde. Si el valor es vacío, mostrar '-'
  const fieldBoxPaddingH = 5; // padding horizontal
  const fieldBoxPaddingV = 8; // aumentar padding vertical (pt/pb) ligeramente
  const gray400 = rgb(0.61, 0.64, 0.69);
  const containerInnerWidth = width - sideMargin * 2;
  const boxGap = 12; // espacio entre las dos cajas
  const leftBoxWidth = Math.round((containerInnerWidth - boxGap) / 2);
  const rightBoxWidth = Math.round((containerInnerWidth - boxGap) / 2);
  const rightBoxX = sideMargin + leftBoxWidth + boxGap;

  const fieldBoxHeight = Math.max(labelSize, valueSize) + fieldBoxPaddingV * 2;

  // Left box (Tiempo de ejecución)
  const leftBoxTopY = y + fieldBoxPaddingV + Math.max(labelSize, valueSize) / 2;
  const leftBoxBottomY = leftBoxTopY - fieldBoxHeight;
  page.drawRectangle({ x: colLeftX, y: leftBoxBottomY, width: leftBoxWidth, height: fieldBoxHeight, borderColor: gray400, borderWidth: 1, color: undefined, });
  const fieldTextYOffset = 6; // subir ligeramente los textos dentro de las cajas
  const leftTextY = leftBoxTopY - fieldBoxPaddingV - (labelSize / 2) + (valueSize / 2) - fieldTextYOffset;
  page.drawText('Tiempo de ejecución / entrega:', { x: colLeftX + fieldBoxPaddingH, y: leftTextY, size: labelSize, font: fontBold, color: textColor });
  // Mostrar duración (días / semanas / meses) en lugar de las fechas crudas
  const renderExecutionDuration = (() => {
    try {
      if (!execution_time || execution_time === '') return '-';
      // Si viene en formato 'YYYY-MM-DD|YYYY-MM-DD'
      if (String(execution_time).includes('|')) {
        const parts = String(execution_time).split('|');
        const s = parts[0];
        const e = parts[1];
        const start = new Date(s);
        const end = new Date(e);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          const diffMs = end.getTime() - start.getTime();
          const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          const weeks = Math.floor(days / 7);
          const months = Math.floor(days / 30);
          if (months >= 1) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
          if (weeks >= 1) return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
          return `${days} ${days === 1 ? 'día' : 'días'}`;
        }
      }
      // Fallback: si viene como texto libre intentar extraer un número y unidad
      const txt = String(execution_time).trim();
      const match = txt.match(/(\d+)\s*(d[ií]as?|dias?|semanas?|semanas|meses?|mes)/i);
      if (match) return `${match[1]} ${match[2]}`;
      return txt || '-';
    } catch {
      return '-';
    }
  })();
  page.drawText(renderExecutionDuration, { x: colLeftX + fieldBoxPaddingH + fontBold.widthOfTextAtSize('Tiempo de ejecución / entrega:', labelSize) + 6, y: leftTextY, size: valueSize, font: fontRegular, color: textColor });

  // Right box (Forma de pago)
  const rightBoxTopY = y + fieldBoxPaddingV + Math.max(labelSize, valueSize) / 2;
  const rightBoxBottomY = rightBoxTopY - fieldBoxHeight;
  page.drawRectangle({ x: rightBoxX, y: rightBoxBottomY, width: rightBoxWidth, height: fieldBoxHeight, borderColor: gray400, borderWidth: 1, color: undefined, });
  const rightTextY = rightBoxTopY - fieldBoxPaddingV - (labelSize / 2) + (valueSize / 2) - fieldTextYOffset;
  page.drawText('Forma de pago:', { x: rightBoxX + fieldBoxPaddingH, y: rightTextY, size: labelSize, font: fontBold, color: textColor });
  page.drawText(String(payment_method ?? '-'), { x: rightBoxX + fieldBoxPaddingH + fontBold.widthOfTextAtSize('Forma de pago:', labelSize) + 6, y: rightTextY, size: valueSize, font: fontRegular, color: textColor });

  // avanzar y por la altura de las cajas y añadir más espacio antes de la lista de productos
  const fieldsToProductsExtra = 4; // espacio adicional reducido entre cajas de campos y tabla de productos
  y = Math.min(leftBoxBottomY, rightBoxBottomY) - gap - fieldsToProductsExtra;

  // Definir la posición inicial de la tabla de productos
  const productTableStartY = y; // y después de 'PRODUCTOS'

  // Dibujar encabezados de columnas para la tabla de productos
  const columnHeaderHeight = 20;
  const columnHeaderY = productTableStartY - columnHeaderHeight;
  page.drawRectangle({
    x: sideMargin,
    y: columnHeaderY,
    width: width - sideMargin * 2,
    height: columnHeaderHeight,
    color: primaryRed,
  });

  const columnHeaderStyle = {
    size: 8, // Reducir tamaño de texto para evitar solapamientos
    font: fontBold,
    color: rgb(1, 1, 1), // Texto blanco para contraste
  };

  // Añadir columnas: Valor unitario, Precio (qty*update_price), Descuento (%) y Subtotal
  const columnHeaders = ['Código', 'Características', 'Cantidad', 'Unidad', 'P/U', 'Precio', 'Desc. %', 'Subtotal'];
  // Calcular posiciones y anchos de columnas de forma dinámica según el ancho disponible
  const tableLeft = sideMargin;
  const tableRight = width - sideMargin;
  const availableWidth = tableRight - tableLeft;
  // Distribución optimizada: reservar una parte para 'Código' y 'Características', dividir uniformemente
  // las últimas 6 columnas (Cantidad, Unidad, P/U, Precio, Desc, Subtotal)
  const minColWidth = 30;
  const firstTwoPercents = [0.06, 0.35]; // Código, Características (aumentar Características)
  const firstWidths = firstTwoPercents.map(p => Math.max(minColWidth, Math.round(availableWidth * p)));
  const usedByFirstTwo = firstWidths[0] + firstWidths[1];
  const remainingWidth = Math.max(0, availableWidth - usedByFirstTwo);
  // Distribución de las últimas 6 columnas: reducir P/U, Precio, Desc%, Subtotal
  const lastColWidths = [
    Math.round(remainingWidth * 0.13), // Cantidad (13%)
    Math.round(remainingWidth * 0.13), // Unidad (13%)
    Math.round(remainingWidth * 0.17), // P/U (17%, reducido)
    Math.round(remainingWidth * 0.17), // Precio (17%, reducido)
    Math.round(remainingWidth * 0.10), // Desc % (10%, reducido)
    Math.round(remainingWidth * 0.20), // Subtotal (20%, reducido)
  ];
  const lastCols = lastColWidths;
  // Distribute any leftover pixels to the last columns to exactly fill availableWidth
  let total = firstWidths.reduce((s, v) => s + v, 0) + lastCols.reduce((s, v) => s + v, 0);
  let idx = firstWidths.length;
  while (total < availableWidth) {
    lastCols[(idx - firstWidths.length) % lastCols.length]++;
    total++;
    idx++;
  }
  // If we exceeded availableWidth due to rounding, trim from the last column
  if (total > availableWidth) {
    const diff = total - availableWidth;
    lastCols[lastCols.length - 1] = Math.max(minColWidth, lastCols[lastCols.length - 1] - diff);
    total = firstWidths.reduce((s, v) => s + v, 0) + lastCols.reduce((s, v) => s + v, 0);
  }
  const columnWidths = [...firstWidths, ...lastCols];
  const columnPositions: number[] = [];
  let accX = tableLeft;
  for (let i = 0; i < columnWidths.length; i++) {
    columnPositions.push(accX);
    accX += columnWidths[i];
  }
  // Small shift for 'Código' so it's not flush to the margin
  const codeShift = 1;
  columnPositions[0] += codeShift;
  // Adjust the width of the first column to account for the shift (reduce its width)
  columnWidths[0] -= codeShift;
  columnHeaders.forEach((header, index) => {
    const headerWidth = fontBold.widthOfTextAtSize(header, columnHeaderStyle.size);
    const xPos = columnPositions[index] + (columnWidths[index] - headerWidth) / 2;
    page.drawText(header, {
      x: xPos,
      y: columnHeaderY + 6,
      ...columnHeaderStyle,
    });
  });
  let productY = productTableStartY - columnHeaderHeight;
  let baseRowHeight = 28; // Will be calculated dynamically per row
  // Totales acumulados
  let totalPriceNoDiscount = 0; // suma de priceTotal antes de aplicar descuentos
  let totalNet = 0; // suma de subtotales (con descuento aplicado)
  
  // Pagination control
  let currentPage = page;
  // page number tracking not needed currently
  // Footer and disclaimer size estimates
  const footerHeight = 30;
  const estimatedDisclaimerHeight = 56;
  // For intermediate pages we only need to reserve space for the footer (allow more rows per page)
  const minYBeforeNewPageForItems = footerHeight + 8; // small padding above footer
  
  // Track table position on current page (for border drawing at the end)
  let currentPageTableStartY = productTableStartY;
  let tableHasContentOnCurrentPage = false;
  
  // Dibujar footer en la página inicial
  drawFooter(currentPage);
  
  items.forEach((item, idx) => {
    const name = item.name || '';
    const characteristics = (item.characteristics || []).join(', ');
    
    // Helper function to wrap text by measuring pixel width with the embedded font
    const wrapText = (text: string, font: any, fontSize: number, maxWidthPx: number): string[] => {
      if (!text) return [];
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth <= maxWidthPx) {
          currentLine = testLine;
        } else {
          if (currentLine) lines.push(currentLine);
          // If single word is longer than the max width, forcibly break it
          if (font.widthOfTextAtSize(word, fontSize) > maxWidthPx) {
            let partial = '';
            for (const ch of word) {
              const candidate = partial + ch;
              if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidthPx) {
                partial = candidate;
              } else {
                if (partial) lines.push(partial);
                partial = ch;
              }
            }
            if (partial) currentLine = partial;
            else currentLine = '';
          } else {
            currentLine = word;
          }
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    const charColumnWidth = columnWidths[1] - 20; // Available width for text in characteristics column (accounting for padding)
    const fontSizeForCells = 8;
    const nameLines = wrapText(name, fontRegular, fontSizeForCells, charColumnWidth);
    const charLines = wrapText(characteristics, fontRegular, fontSizeForCells, charColumnWidth);

    // Recalculate row height based on actual wrapped lines using pixel measurements
    const lineHeightPx = Math.max(9, Math.round(fontSizeForCells * 1.1)); // tighter line height to reduce whitespace
    const paddingTop = 6;
    const paddingBottom = 6;
    // Add a small spacer only if both name and characteristics exist (use fraction of line height)
    const hasSpacer = (nameLines.length > 0 && charLines.length > 0);
    const spacerHeight = hasSpacer ? Math.max(4, Math.round(lineHeightPx * 0.35)) : 0;
    const totalCharLines = nameLines.length + charLines.length;
    const blockHeight = totalCharLines * lineHeightPx + spacerHeight;
    const minRowHeight = 28;
    baseRowHeight = Math.max(minRowHeight, paddingTop + paddingBottom + blockHeight);
    // Calcular valor unitario, precio total (qty * update_price cuando exista) y subtotal aplicando descuento
    const unitPrice = typeof item.update_price === 'number' ? item.update_price : (typeof item.price === 'number' ? item.price : 0);
    const priceTotal = (typeof item.update_price === 'number' && typeof item.qty === 'number')
      ? Math.round(item.update_price * item.qty)
      : (typeof unitPrice === 'number' && typeof item.qty === 'number' ? Math.round(unitPrice * item.qty) : 0);
    const discountPercent = typeof item.discount === 'number' ? item.discount : 0;
    const discountAmount = Math.round(priceTotal * (discountPercent / 100));
    const subtotal = priceTotal - discountAmount;
    // Acumular totales
    totalPriceNoDiscount += priceTotal;
    totalNet += subtotal;
    
    // Check if we need a new page before drawing this item (only reserve footer area on intermediate pages)
    const willExceedPage = (productY - baseRowHeight) < minYBeforeNewPageForItems;
    if (willExceedPage) {
      console.log(`[PDF Pagination] Creating new page before item ${idx} (productY=${productY}, baseRowHeight=${baseRowHeight})`);
      
      // Close current page's table border using tracked position
      if (tableHasContentOnCurrentPage) {
        const currentTableHeight = currentPageTableStartY - productY;
        currentPage.drawRectangle({
          x: sideMargin,
          y: currentPageTableStartY - currentTableHeight,
          width: width - sideMargin * 2,
          height: currentTableHeight,
          borderColor: primaryRed,
          borderWidth: borderThickness,
          color: undefined,
        });
      }
      
      // Create new page
      currentPage = pdfDoc.addPage([595, 842]);

      // Draw header for the new page and reserve space below it
      drawHeader(currentPage);
      // Reset productY to top of new page (below header area)
      const newPageMarginTop = headerHeight + 18;
      productY = height - newPageMarginTop;

      // Update table position tracking for new page
      currentPageTableStartY = productY;

      // Redraw column headers on new page
      const newColumnHeaderY = productY - columnHeaderHeight;
      currentPage.drawRectangle({
        x: sideMargin,
        y: newColumnHeaderY,
        width: width - sideMargin * 2,
        height: columnHeaderHeight,
        color: primaryRed,
      });

      columnHeaders.forEach((header, index) => {
        const headerWidth = fontBold.widthOfTextAtSize(header, columnHeaderStyle.size);
        const xPos = columnPositions[index] + (columnWidths[index] - headerWidth) / 2;
        currentPage.drawText(header, {
          x: xPos,
          y: newColumnHeaderY + 6,
          ...columnHeaderStyle,
        });
      });

      // Dibujar footer en la nueva página
      drawFooter(currentPage);
      
      productY = productY - columnHeaderHeight;
      tableHasContentOnCurrentPage = false; // reset for new page
    }
    
    // Debug: log SKU value
    console.log(`[PDF] Item ${idx}: name="${item.name}", sku="${item.sku || '(empty)'}", productY=${productY}, baseRowHeight=${baseRowHeight}`);
    
    // Mark that current page has content
    tableHasContentOnCurrentPage = true;
    
    // Alternar fondo gris en las filas de productos (más visible que el lightGray anterior)
    const altRowGray = rgb(0.97, 0.97, 0.97);
    const backgroundColor = idx % 2 === 0 ? rgb(1, 1, 1) : altRowGray;
    currentPage.drawRectangle({
      x: sideMargin,
      y: productY - baseRowHeight,
      width: width - sideMargin * 2,
      height: baseRowHeight,
      color: backgroundColor,
    });
    
    // Código (SKU) - acepta varias formas: `sku`, o `product.sku`, o `service.sku`
    // Log completo del item para debugging
    console.log(`[PDF] Item ${idx} completo:`, JSON.stringify({
      name: item.name,
      sku: item.sku,
      product_id: (item as any).product_id,
      product: (item as any).product ? { id: (item as any).product.id, sku: (item as any).product.sku } : null,
      service: (item as any).service ? { id: (item as any).service.id, sku: (item as any).service.sku } : null,
    }, null, 2));
    
    let skuText = '-';
    if (item.sku && String(item.sku).trim() !== '') skuText = String(item.sku);
    else if ((item as any).product && (item as any).product.sku && String((item as any).product.sku).trim() !== '') skuText = String((item as any).product.sku);
    else if ((item as any).service && (item as any).service.sku && String((item as any).service.sku).trim() !== '') skuText = String((item as any).service.sku);
    // Fallback: show product_id or nested id if SKU missing
    if ((skuText === '-' || skuText.trim() === '') && (item as any).product_id) {
      skuText = String((item as any).product_id);
    } else if ((skuText === '-' || skuText.trim() === '') && (item as any).product && (item as any).product.id) {
      skuText = String((item as any).product.id);
    } else if ((skuText === '-' || skuText.trim() === '') && (item as any).service && (item as any).service.id) {
      skuText = String((item as any).service.id);
    }
    
    console.log(`[PDF] Item ${idx}: resolved SKU = "${skuText}"`);
    
    const skuTextWidth = fontRegular.widthOfTextAtSize(skuText, 8);
    const skuColumnWidth = columnWidths[0];
    const skuColumnStart = columnPositions[0];
    // Centrar el SKU en su columna
    const skuX = skuColumnStart + Math.max(4, (skuColumnWidth - skuTextWidth) / 2);
    const skuY = productY - baseRowHeight / 2;
    
    console.log(`[PDF] Drawing SKU "${skuText}" at x=${skuX}, y=${skuY}, columnStart=${skuColumnStart}, columnWidth=${skuColumnWidth}`);
    
    currentPage.drawText(skuText, {
      x: skuX,
      y: skuY,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });

    // Características (nombre arriba, características abajo), posicionar texto desde el tope de la fila
    // Center the block of lines vertically within the row
    const centerY = productY - baseRowHeight / 2;
    // Compute the first baseline so the whole block is vertically centered
    const firstBaselineY = centerY + (blockHeight / 2) - Math.round(lineHeightPx / 2);
    let charY = Math.round(firstBaselineY);
    // Draw wrapped name lines
    for (const nameLine of nameLines) {
      currentPage.drawText(nameLine, {
        x: columnPositions[1] + 20,
        y: charY,
        size: fontSizeForCells,
        font: fontRegular,
        color: darkGray,
      });
      charY -= lineHeightPx;
    }
    if (hasSpacer) {
      charY -= spacerHeight;
    }
    for (const charLine of charLines) {
      currentPage.drawText(charLine, {
        x: columnPositions[1] + 20,
        y: charY,
        size: fontSizeForCells,
        font: fontRegular,
        color: darkGray,
      });
      charY -= lineHeightPx;
    }
    // Unidad (now after Cantidad)
    // Prefer different possible fields that may carry the unit coming from the frontend/API
    const measurementUnit = item.measurement_unit ?? (item as any).unit_measure ?? (item as any).unit ?? (item as any).measurementUnit ?? null;
    // Only display the measurement unit (mapped via unitSymbols) — do NOT concatenate unit_size
    let unitDisplay = '';
    if (measurementUnit) {
      unitDisplay = unitSymbols[measurementUnit] ?? String(measurementUnit);
    }
    if (unitDisplay) {
      const unitTextWidth = fontRegular.widthOfTextAtSize(unitDisplay, 8);
      const unitColumnWidth = columnWidths[3];
      currentPage.drawText(unitDisplay, {
        x: columnPositions[3] + (unitColumnWidth - unitTextWidth) / 2,
        y: productY - baseRowHeight / 2,
        size: 8,
        font: fontRegular,
        color: darkGray,
      });
    }
    // Cantidad
    const qtyText = `${item.qty}`;
    const qtyTextWidth = fontRegular.widthOfTextAtSize(qtyText, 8);
    const qtyColumnWidth = columnWidths[2];
    currentPage.drawText(qtyText, {
      x: columnPositions[2] + (qtyColumnWidth - qtyTextWidth) / 2,
      y: productY - baseRowHeight / 2,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });
    // Valor unitario - alineado a la derecha
    const unitText = unitPrice ? `$ ${formatCLP(unitPrice)}` : '-';
    const unitTextWidth = fontRegular.widthOfTextAtSize(unitText, 8);
    const unitColumnWidth = columnWidths[4];
    const unitColumnEnd = columnPositions[4] + unitColumnWidth;
    currentPage.drawText(unitText, {
      x: unitColumnEnd - unitTextWidth - 6, // Alineado a la derecha con pequeño padding
      y: productY - baseRowHeight / 2,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });
    // Precio (qty * unitPrice) - alineado a la derecha
    const priceText = priceTotal ? `$ ${formatCLP(priceTotal)}` : '-';
    const priceTextWidth = fontRegular.widthOfTextAtSize(priceText, 8);
    const priceColumnWidth = columnWidths[5];
    const priceColumnEnd = columnPositions[5] + priceColumnWidth;
    currentPage.drawText(priceText, {
      x: priceColumnEnd - priceTextWidth - 6, // Alineado a la derecha con pequeño padding
      y: productY - baseRowHeight / 2,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });
    // Descuento (%)
    const discountText = discountPercent ? `${discountPercent}%` : '-';
    const discountTextWidth = fontRegular.widthOfTextAtSize(discountText, 8);
    const discountColumnWidth = columnWidths[6];
    currentPage.drawText(discountText, {
      x: columnPositions[6] + (discountColumnWidth - discountTextWidth) / 2,
      y: productY - baseRowHeight / 2,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });
    // Subtotal - alineado a la derecha
    const subtotalText = subtotal ? `$ ${formatCLP(subtotal)}` : '-';
    const subtotalTextWidth = fontRegular.widthOfTextAtSize(subtotalText, 8);
    const subtotalColumnWidth = columnWidths[7];
    const subtotalColumnEnd = columnPositions[7] + subtotalColumnWidth;
    currentPage.drawText(subtotalText, {
      x: subtotalColumnEnd - subtotalTextWidth - 6, // Alineado a la derecha con pequeño padding
      y: productY - baseRowHeight / 2,
      size: 8,
      font: fontRegular,
      color: darkGray,
    });
    productY -= baseRowHeight;
  });

  // Ajustar el borde dinámico para que no haya espacio entre el último producto y el borde inferior
  // Use the current page's table position, not the original first page position
  const adjustedTableHeight = currentPageTableStartY - productY;
  currentPage.drawRectangle({
    x: sideMargin,
    y: currentPageTableStartY - adjustedTableHeight,
    width: width - sideMargin * 2,
    height: adjustedTableHeight,
    borderColor: primaryRed,
    borderWidth: borderThickness,
    color: undefined,
  });

  // === Totales (bloque rojo, organizado por filas) ===
  const totalsBoxWidth = 260;
  const totalsBoxPadding = 10;
  const totalsBoxHeight = 90;
  const totalsBoxX = width - sideMargin - totalsBoxWidth; // right aligned
  // position the totals box below the table with moderate spacing
  const totalsBoxGap = 8;
  let totalsBoxY = currentPageTableStartY - adjustedTableHeight - totalsBoxHeight - totalsBoxGap;
  
  // Check if totals box would go too low (overlap with footer + disclaimer)
  // If so, create a new page for totals and disclaimer
  if (totalsBoxY < (footerHeight + estimatedDisclaimerHeight + 12)) {
    console.log(`[PDF Pagination] Moving totals and disclaimer to new page (totalsBoxY=${totalsBoxY})`);
    
    // Create new page for totals
    currentPage = pdfDoc.addPage([595, 842]);
    
    // Position totals at top of new page: reserve full header + title area to avoid overlap
    // Draw header and footer on the new totals page as well
    drawHeader(currentPage);
    drawFooter(currentPage);
    const newPageMarginTop = headerHeight + marginTop + 8; // reserve header + title spacing
    totalsBoxY = height - newPageMarginTop - totalsBoxHeight;
  }
  // Calcular valores
  const totalNoDiscountRounded = Math.round(totalPriceNoDiscount || 0);
  const totalNetRounded = Math.round(totalNet || 0);
  const iva = Math.round(totalNetRounded * 0.19);
  const totalWithIva = totalNetRounded + iva;

  // Dibujar bloque de totales: fondo blanco con borde rojo (sin fondo rojo sólido)
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: totalsBoxY,
    width: totalsBoxWidth,
    height: totalsBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: primaryRed,
    borderWidth: Math.max(1, borderThickness),
  });

  const totalsLabelSize = 10;
  const totalsValueSize = 10;
  const totalsTextColor = darkGray; // texto en gris oscuro sobre fondo blanco
  const labelX = totalsBoxX + totalsBoxPadding;
  const valueX = totalsBoxX + totalsBoxWidth - totalsBoxPadding;
  // Calcular posiciones para las filas dentro del recuadro de totales.
  // Reducir espacio inferior empujando las filas ligeramente hacia abajo (no perfectamente centradas)
  const innerTop = totalsBoxY + totalsBoxHeight - totalsBoxPadding;
  const innerBottom = totalsBoxY + totalsBoxPadding;
  const availableInnerHeight = Math.max(0, innerTop - innerBottom);
  const rowSpacing = 18;
  const rowCount = 4;
  const totalRowsHeight = (rowCount - 1) * rowSpacing;
  const extraSpace = Math.max(0, availableInnerHeight - totalRowsHeight);
  // Usar un 20% del espacio extra como padding superior para mover el contenido hacia abajo
  const topPadding = Math.max(4, Math.floor(extraSpace * 0.2));
  const firstRowY = innerTop - topPadding;
  // Dibujar fondo gris alternado por fila dentro del recuadro de totales
  const totalsAltGray = rgb(0.97, 0.97, 0.97);
  for (let i = 0; i < rowCount; i++) {
    if (i % 2 === 1) {
      const currentRowY = firstRowY - i * rowSpacing;
      // Hacer que el rectángulo cubra exactamente la altura de la fila y esté centrado visualmente
      const rectHeight = rowSpacing;
      // Compensar la línea base del texto: drawText usa la baseline, por lo que desplazamos el rectángulo
      const textBaselineOffset = Math.max(1, Math.floor(totalsLabelSize * 0.25));
      // Ajuste adicional para mover solo el fondo (no mover texto)
      const bgYOffset = -1; // negativo mueve el fondo hacia abajo unos px
      const rectY = currentRowY - rectHeight / 2 - textBaselineOffset + bgYOffset;
      // Dibujar fondo gris intercalado extendido de borde a borde
      currentPage.drawRectangle({
        x: totalsBoxX,
        y: rectY,
        width: totalsBoxWidth,
        height: rectHeight,
        color: totalsAltGray,
      });
    }
  }
  // Volver a dibujar el borde rojo del recuadro de totales encima de los fondos
  currentPage.drawRectangle({
    x: totalsBoxX,
    y: totalsBoxY,
    width: totalsBoxWidth,
    height: totalsBoxHeight,
    borderColor: primaryRed,
    borderWidth: Math.max(1, borderThickness),
    color: undefined,
  });
  // Ajuste: mover solo el texto ligeramente hacia abajo dentro del recuadro de totales
  const textYOffset = -7; // desplazar texto un poco más hacia abajo
  let rowY = firstRowY;

  currentPage.drawText('Total Neto Sin Descuento:', { x: labelX, y: rowY + textYOffset, size: totalsLabelSize, font: fontBold, color: totalsTextColor });
  const v1 = `$ ${formatCLP(totalNoDiscountRounded)}`;
  const v1w = fontBold.widthOfTextAtSize(v1, totalsValueSize);
  currentPage.drawText(v1, { x: valueX - v1w, y: rowY + textYOffset, size: totalsValueSize, font: fontBold, color: totalsTextColor });
  rowY -= 18;

  currentPage.drawText('Total Neto:', { x: labelX, y: rowY + textYOffset, size: totalsLabelSize, font: fontBold, color: totalsTextColor });
  const v2 = `$ ${formatCLP(totalNetRounded)}`;
  const v2w = fontBold.widthOfTextAtSize(v2, totalsValueSize);
  currentPage.drawText(v2, { x: valueX - v2w, y: rowY + textYOffset, size: totalsValueSize, font: fontBold, color: totalsTextColor });
  rowY -= 18;

  currentPage.drawText('IVA (19%):', { x: labelX, y: rowY + textYOffset, size: totalsLabelSize, font: fontBold, color: totalsTextColor });
  const v3 = `$ ${formatCLP(iva)}`;
  const v3w = fontBold.widthOfTextAtSize(v3, totalsValueSize);
  currentPage.drawText(v3, { x: valueX - v3w, y: rowY + textYOffset, size: totalsValueSize, font: fontBold, color: totalsTextColor });
  rowY -= 18;

  currentPage.drawText('TOTAL:', { x: labelX, y: rowY + textYOffset, size: totalsLabelSize, font: fontBold, color: totalsTextColor });
  const v4 = `$ ${formatCLP(totalWithIva)}`;
  const v4w = fontBold.widthOfTextAtSize(v4, totalsValueSize);
  // Resaltar el TOTAL en rojo para mayor énfasis, manteniendo el resto en gris oscuro
  currentPage.drawText(v4, { x: valueX - v4w, y: rowY + textYOffset, size: totalsValueSize, font: fontBold, color: primaryRed });

  // Asegurar que los títulos sean visibles dibujándolos después del borde
  // (Removed obsolete productosTitle reference - description is drawn above if present)

  // Footer: rendered on each page via drawFooter()

  // ============= DISCLAIMER =============
  const disclaimerText = 'Esta cotización constituye una propuesta comercial basada en la información disponible a la fecha. Los precios, condiciones y plazos indicados son válidos por 5 días y pueden estar sujetos a cambios sin previo aviso. La aceptación de esta cotización debe formalizarse por escrito para su posterior ejecución.';
  const disclaimerTextSize = 9; // reducir tamaño del texto
  const disclaimerHeight = 56; // reducir alto del recuadro
  const disclaimerY = 36; // acercar un poco al footer

  // Dibujar el borde gris
  currentPage.drawRectangle({
    x: sideMargin,
    y: disclaimerY,
    width: width - sideMargin * 2,
    height: disclaimerHeight,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 1,
    color: undefined,
  });

  // Dibujar el texto dentro del borde con ajuste para evitar desbordamiento
  const disclaimerPadding = 8; // reducir padding interno para ganar espacio
  const disclaimerTextX = sideMargin + disclaimerPadding; // Margen interno izquierdo con padding
  const disclaimerTextY = disclaimerY + disclaimerHeight - disclaimerPadding; // Ajustar para que el texto no desborde hacia abajo
  currentPage.drawText(disclaimerText, {
    x: disclaimerTextX,
    y: disclaimerTextY - disclaimerTextSize, // Ajustar posición vertical del texto
    size: disclaimerTextSize,
    font: fontRegular,
    color: rgb(0.6, 0.6, 0.6), // Mantener color del texto al del borde
    lineHeight: 12,
    maxWidth: width - sideMargin * 2 - disclaimerPadding * 2, // Ajustar ancho máximo para que el texto no salga del borde
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Definir unitSymbols antes de su uso
const unitSymbols: Record<string, string> = {
  in: '"',
  ft: "'",
  m: 'm',
  m2: 'm²',
  m3: 'm³',
  m_lin: 'm (lineal)',
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

// Definir borderThickness antes de su uso
const borderThickness = 1;

// Eliminadas variables no usadas para limpiar advertencias ESLint
