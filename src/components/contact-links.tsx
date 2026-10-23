import { LocalizedContent } from "@/components/localization";
import { Mail, Phone, Facebook, Instagram } from "lucide-react";
import { db } from "@/lib/db";
export async function ContactLinks({ compact = false }: { compact?: boolean }) {
  const settings = Object.fromEntries(
    (
      await db.storeSetting.findMany({
        where: {
          key: { in: ["contactEmail", "contactPhone", "facebookUrl", "instagramUrl"] },
        },
      })
    ).map((s) => [s.key, s.value]),
  );
  const c = settings;
  const email = c.contactEmail && !c.contactEmail.endsWith(".invalid") ? c.contactEmail : "";
  const phone = /^\+?[\d\s().-]{8,20}$/.test(c.contactPhone ?? "") ? c.contactPhone : "";
  const facebook = c.facebookUrl?.startsWith("https://") ? c.facebookUrl : "";
  const instagram = c.instagramUrl?.startsWith("https://") ? c.instagramUrl : "";
  return (
    <LocalizedContent>
      {
        <div className={"contact-links" + (compact ? " compact" : "")}>
          {email && (
            <a href={"mailto:" + email}>
              <Mail size={17} />
              <span>{email}</span>
            </a>
          )}
          {phone && (
            <a href={"tel:" + phone}>
              <Phone size={17} />
              <span>{phone}</span>
            </a>
          )}
          {facebook && (
            <a href={facebook} target="_blank" rel="noopener noreferrer">
              <Facebook size={17} />
              <span>Facebook</span>
            </a>
          )}
          {instagram && (
            <a href={instagram} target="_blank" rel="noopener noreferrer">
              <Instagram size={17} />
              <span>Instagram</span>
            </a>
          )}
          {!email && !phone && !facebook && !instagram && (
            <p>Thông tin liên hệ đang được cập nhật. Nàng có thể gửi yêu cầu tại trang liên hệ.</p>
          )}
        </div>
      }
    </LocalizedContent>
  );
}
