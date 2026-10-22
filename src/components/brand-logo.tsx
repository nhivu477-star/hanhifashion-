import { LocalizedContent } from "@/components/localization";
/** The approved original artwork, uniformly scaled with only its outer whitespace masked. */
export function BrandLogo() {
  return (
    <LocalizedContent>
      {
        <span className="brand-logo">
          <img
            src="/images/brand-original.png"
            alt="HÀ NHI FASHION — logo chính thức"
            width={1536}
            height={1024}
          />
        </span>
      }
    </LocalizedContent>
  );
}
