import { LocalizedContent } from "@/components/localization";
import { Mail, Phone, Facebook, Instagram } from "lucide-react";
import { db } from "@/lib/db";
import { officialContacts } from "@/lib/taxonomy";
export async function ContactLinks({ compact = false }: { compact?: boolean }) {
  const settings = Object.fromEntries(
    (
      await db.storeSetting.findMany({
        where: { key: { in: Object.keys(officialContacts) } },
      })
    ).map((s) => [s.key, s.value]),
  );
  const c = { ...officialContacts, ...settings };
  return (
    <LocalizedContent>
      {
        <div className={"contact-links" + (compact ? " compact" : "")}>
          <a href={"mailto:" + c.contactEmail}>
            <Mail size={17} />
            <span>{c.contactEmail}</span>
          </a>
          <a href={"tel:" + c.contactPhone}>
            <Phone size={17} />
            <span>{c.contactPhone}</span>
          </a>
          <a href={c.facebookUrl} target="_blank" rel="noopener noreferrer">
            <Facebook size={17} />
            <span>Facebook</span>
          </a>
          <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer">
            <Instagram size={17} />
            <span>Instagram</span>
          </a>
        </div>
      }
    </LocalizedContent>
  );
}
