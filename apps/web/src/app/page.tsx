import {
  HeroSection,
  TrustBarSection,
  HowItWorksSection,
  FeaturedTracksSection,
  CredentialCenterpieceSection,
  MentorWallSection,
  CreatorRoyaltySection,
  PricingSection,
  FaqSection,
} from "@/components/marketing";

export default function FlagshipMarketingLandingPage() {
  return (
    <main className="flex flex-col w-full bg-background text-foreground">
      {/* 1. Multi-Persona Editorial Hero */}
      <HeroSection />

      {/* 2. Partner & University Trust Bar */}
      <TrustBarSection />

      {/* 3. How Applied Mastery Works */}
      <HowItWorksSection />

      {/* 4. Featured Role Tracks & Hybrid Cohorts */}
      <FeaturedTracksSection />

      {/* 5. Interactive Cryptographic Credential Showcase */}
      <CredentialCenterpieceSection />

      {/* 6. Staff & Principal Mentor Wall */}
      <MentorWallSection />

      {/* 7. For Creators & Principal Authors Callout */}
      <CreatorRoyaltySection />

      {/* 8. Transparent B2C & B2B/University GST Pricing */}
      <PricingSection />

      {/* 9. FAQ Accordion & High-Contrast CTA */}
      <FaqSection />
    </main>
  );
}
