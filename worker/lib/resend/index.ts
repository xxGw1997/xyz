import { env } from "cloudflare:workers";
import { Resend, type CreateEmailOptions } from "resend";

export async function sendEmail(payload: CreateEmailOptions) {
  const resend = new Resend(env.RESEND_KEY);

  await resend.emails.send(payload);
}
