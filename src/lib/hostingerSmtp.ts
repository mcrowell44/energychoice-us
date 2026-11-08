/** Server-only Hostinger SMTP (SSL, port 465) transport */
import tls from "node:tls";

export const HOSTINGER_SMTP_HOST = "smtp.hostinger.com";
export const HOSTINGER_SMTP_PORT = 465;
export const DEFAULT_FROM_ADDRESS = "energychoiceus@cdmweb.store";
export const DEFAULT_FROM_NAME = "Energy Choice US";
export const BROKER_DOSSIER_RECIPIENT = "marcus@cdmweb.store";

const TIMEOUT_MS = 25000;

export class SmtpError extends Error {
  code: number;
  hard: boolean;
  constructor(message: string, code: number, hard: boolean) {
    super(message);
    this.name = "SmtpError";
    this.code = code;
    this.hard = hard;
  }
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const header = (v: string) =>
  /^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`;

export interface EmailAttachment {
  filename: string;
  contentType?: string;
  base64Content: string;
}

export interface SendMailOptions {
  fromAddress?: string;
  fromName?: string;
  to: string | string[];
  replyTo?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

function buildMimeMessage(opts: SendMailOptions, messageId: string): string {
  const fromName = opts.fromName || DEFAULT_FROM_NAME;
  const fromAddr = opts.fromAddress || DEFAULT_FROM_ADDRESS;
  const toList = Array.isArray(opts.to) ? opts.to.join(", ") : opts.to;

  const hasAttachments = Boolean(opts.attachments && opts.attachments.length > 0);
  const hasHtml = Boolean(opts.html);
  const hasText = Boolean(opts.text);

  const mixedBoundary = `----=_Part_Mixed_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const altBoundary = `----=_Part_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const baseHeaders = [
    `From: ${header(fromName)} <${fromAddr}>`,
    `To: ${toList}`,
    opts.replyTo ? `Reply-To: <${opts.replyTo}>` : "",
    `Subject: ${header(opts.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    "Auto-Submitted: auto-generated",
    "X-Mailer: Energy Choice US Intake Engine",
  ].filter(Boolean);

  // If there are attachments, root container is multipart/mixed
  if (hasAttachments) {
    baseHeaders.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`, "");

    const parts: string[] = [];

    // Body container: if both text and html, nest inside multipart/alternative
    if (hasHtml && hasText) {
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        "",
        `--${altBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.text!, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
        `--${altBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.html!, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
        `--${altBoundary}--`
      );
    } else if (hasHtml) {
      parts.push(
        `--${mixedBoundary}`,
        'Content-Type: text/html; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.html!, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n")
      );
    } else {
      parts.push(
        `--${mixedBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"',
        "Content-Transfer-Encoding: base64",
        "",
        Buffer.from(opts.text || "", "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n")
      );
    }

    // Attachment parts
    for (const att of opts.attachments!) {
      const mime = att.contentType || "application/octet-stream";
      parts.push(
        `--${mixedBoundary}`,
        `Content-Type: ${mime}; name="${header(att.filename)}"`,
        `Content-Disposition: attachment; filename="${header(att.filename)}"`,
        "Content-Transfer-Encoding: base64",
        "",
        att.base64Content.replace(/.{1,76}/g, "$&\r\n")
      );
    }

    parts.push(`--${mixedBoundary}--`, "");
    return baseHeaders.join("\r\n") + "\r\n" + parts.join("\r\n");
  }

  // No attachments: root container is multipart/alternative (or simple single-part)
  if (hasHtml && hasText) {
    baseHeaders.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`, "");
    const parts = [
      `--${altBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(opts.text!, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
      `--${altBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      Buffer.from(opts.html!, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n"),
      `--${altBoundary}--`,
      "",
    ];
    return baseHeaders.join("\r\n") + "\r\n" + parts.join("\r\n");
  }

  if (hasHtml) {
    baseHeaders.push(
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      ""
    );
    return (
      baseHeaders.join("\r\n") +
      "\r\n" +
      Buffer.from(opts.html!, "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n") +
      "\r\n"
    );
  }

  baseHeaders.push(
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    ""
  );
  return (
    baseHeaders.join("\r\n") +
    "\r\n" +
    Buffer.from(opts.text || "", "utf8").toString("base64").replace(/.{1,76}/g, "$&\r\n") +
    "\r\n"
  );
}

export async function sendHostingerSmtp(
  options: SendMailOptions
): Promise<{ messageId: string }> {
  const user =
    process.env.SMTP_USER?.trim() ||
    process.env.HOSTINGER_SMTP_USER?.trim() ||
    DEFAULT_FROM_ADDRESS;
  const pass =
    process.env.SMTP_PASS?.trim() ||
    process.env.HOSTINGER_SMTP_PASS?.trim() ||
    "";

  if (!pass) {
    throw new SmtpError(
      "Hostinger SMTP password is not configured (SMTP_PASS missing).",
      0,
      false
    );
  }

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const cleanRecipients = recipients
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  if (cleanRecipients.length === 0) {
    throw new SmtpError("No recipient email specified.", 0, true);
  }

  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@cdmweb.store>`;

  const socket = tls.connect({
    host: HOSTINGER_SMTP_HOST,
    port: HOSTINGER_SMTP_PORT,
    servername: HOSTINGER_SMTP_HOST,
  });

  socket.setEncoding("utf8");

  let buffer = "";
  let waiter: ((r: { code: number; text: string } | Error) => void) | null =
    null;
  let failure: Error | null = null;

  const tryResolve = () => {
    if (!waiter) return;
    const lines = buffer.split("\r\n");
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i] ?? "";
      if (/^\d{3} /.test(line)) {
        const text = lines.slice(0, i + 1).join("\n");
        buffer = lines.slice(i + 1).join("\r\n");
        const w = waiter;
        waiter = null;
        w({ code: Number(line.slice(0, 3)), text });
        return;
      }
    }
  };

  socket.on("data", (d: string) => {
    buffer += d;
    tryResolve();
  });

  socket.on("error", (e: Error) => {
    failure = e;
    waiter?.(e);
    waiter = null;
  });

  const read = () =>
    new Promise<{ code: number; text: string }>((resolve, reject) => {
      if (failure) return reject(failure);
      const t = setTimeout(() => {
        waiter = null;
        reject(new SmtpError("Hostinger SMTP did not respond in time.", 0, false));
      }, TIMEOUT_MS);
      waiter = (r) => {
        clearTimeout(t);
        r instanceof Error
          ? reject(new SmtpError(`Hostinger SMTP connection error: ${r.message}`, 0, false))
          : resolve(r);
      };
      tryResolve();
    });

  const step = async (cmd: string | null, expect: number, stage: string) => {
    if (cmd !== null) socket.write(cmd + "\r\n");
    const r = await read();
    if (r.code !== expect) {
      const hard = r.code >= 500;
      throw new SmtpError(
        `Hostinger SMTP ${stage} failed [${r.code}]: ${r.text}`,
        r.code,
        hard
      );
    }
    return r;
  };

  try {
    await step(null, 220, "greeting");
    await step("EHLO energychoice.us", 250, "EHLO");
    await step("AUTH LOGIN", 334, "AUTH LOGIN");
    await step(Buffer.from(user).toString("base64"), 334, "USERNAME");
    await step(Buffer.from(pass).toString("base64"), 235, "PASSWORD");

    const senderAddress = options.fromAddress || user;
    await step(`MAIL FROM:<${senderAddress}>`, 250, "MAIL FROM");

    for (const rcpt of cleanRecipients) {
      await step(`RCPT TO:<${rcpt}>`, 250, `RCPT TO (${rcpt})`);
    }

    await step("DATA", 354, "DATA");
    const rawMessage = buildMimeMessage(options, messageId).replace(
      /\r\n\./g,
      "\r\n.."
    );
    await step(`${rawMessage}\r\n.`, 250, "MESSAGE BODY");
    socket.write("QUIT\r\n");
    return { messageId };
  } catch (err) {
    console.error("Hostinger SMTP delivery failed:", err);
    throw err instanceof SmtpError ? err : new SmtpError(String(err), 0, false);
  } finally {
    socket.end();
  }
}

