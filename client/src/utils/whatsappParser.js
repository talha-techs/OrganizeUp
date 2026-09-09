// Smart parser for WhatsApp forwarded messages, chat exports, and raw clips
export const parseWhatsAppText = (input = '') => {
  if (!input || typeof input !== 'string') {
    return { isWhatsApp: false, sender: '', date: null, cleanText: input, extractedUrl: '' };
  }

  const trimmed = input.trim();

  // URL extraction regex
  const urlRegex = /(https?:\/\/[^\s]+)/i;
  const urlMatch = trimmed.match(urlRegex);
  const extractedUrl = urlMatch ? urlMatch[0] : '';

  // Patterns for WhatsApp messages:
  // 1. [12/05/26, 14:30:15] Sender Name: Message body
  // 2. [9/9/26, 4:15:20 PM] Sender Name: Message body
  // 3. 12/05/2026, 14:30 - Sender Name: Message body
  // 4. 09/09/2026, 4:15 pm - +92 300 1234567: Message body
  // 5. [16:30, 09/09/2026] Sender: Message body
  const bracketPattern = /^\[(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\]\s*([^:]+):\s*([\s\S]+)$/;
  const dashPattern = /^(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}[, ]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\s*-\s*([^:]+):\s*([\s\S]+)$/;
  const bracketTimeFirstPattern = /^\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?[, ]+\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})\]\s*([^:]+):\s*([\s\S]+)$/;

  let match = trimmed.match(bracketPattern) || trimmed.match(dashPattern) || trimmed.match(bracketTimeFirstPattern);

  if (match) {
    const rawDate = match[1].trim();
    const sender = match[2].trim().replace(/^~/, '').trim();
    const cleanText = match[3].trim();
    return {
      isWhatsApp: true,
      sender,
      rawDate,
      cleanText,
      extractedUrl,
    };
  }

  // Check for "Forwarded" label
  if (/^Forwarded\s*\n/i.test(trimmed)) {
    const cleanText = trimmed.replace(/^Forwarded\s*\n/i, '').trim();
    return {
      isWhatsApp: true,
      sender: 'Forwarded Message',
      cleanText,
      extractedUrl,
    };
  }

  return {
    isWhatsApp: false,
    sender: '',
    date: null,
    cleanText: trimmed,
    extractedUrl,
  };
};
