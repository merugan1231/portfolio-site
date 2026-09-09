type SendResult = { delivered: boolean; devCode?: string; error?: string };

/**
 * Отправка кода подтверждения через Resend.
 * Если RESEND_API_KEY не задан — демо-режим: код возвращается на фронт
 * и пишется в лог сервера (удобно для локальной разработки).
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  purpose: "register" | "login"
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const subject =
    purpose === "register"
      ? "Код подтверждения регистрации"
      : "Код для входа на сайт";

  if (!apiKey) {
    console.log(`[ДЕМО-РЕЖИМ] Код для ${to}: ${code}`);
    return { delivered: false, devCode: code };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DevShelf <onboarding@resend.dev>",
        to: [to],
        subject,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#18181b;border-radius:16px;color:#f4f4f5">
            <h2 style="margin:0 0 8px;color:#a5b4fc">${subject}</h2>
            <p style="color:#a1a1aa;margin:0 0 24px">Ваш код подтверждения (действует 10 минут):</p>
            <div style="font-size:36px;font-weight:800;letter-spacing:8px;background:#27272a;border-radius:12px;padding:16px 0;text-align:center">${code}</div>
            <p style="color:#71717a;font-size:12px;margin-top:24px">Если вы не запрашивали код — просто проигнорируйте это письмо.</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Resend error:", text);
      // Не блокируем регистрацию: код вернётся на экран как резервный путь
      return { delivered: false, devCode: code, error: `почтовый сервис вернул ошибку ${res.status}` };
    }
    return { delivered: true };
  } catch (e) {
    console.error("Resend fetch failed:", e);
    return { delivered: false, devCode: code, error: "нет связи с почтовым сервисом" };
  }
}
