import {
  calculateIndiaGstBreakdown,
  computeProjectEscrowSplit,
  EDTECH_SAC_CODE,
} from "@elluminar/domain-commerce";

export default function CleanArchitectureLandingPage() {
  const sampleSplit = computeProjectEscrowSplit(1000000n);
  const sampleGst = calculateIndiaGstBreakdown({
    taxableAmountMinor: 1000000n,
    supplierStateCode: "29",
    buyerGstin: "27AABCM9876K1Z2",
  });

  return (
    <main
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "64px 24px",
        lineHeight: 1.6,
      }}
    >
      <div
        style={{
          display: "inline-block",
          padding: "4px 12px",
          borderRadius: "999px",
          background: "#1e293b",
          color: "#38bdf8",
          fontSize: "13px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        Elluminar v2 • Clean-Sheet Hexagonal Monolith
      </div>

      <h1 style={{ fontSize: "40px", margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
        Applied Mastery &amp; Verified Proof-of-Work Engine
      </h1>

      <p style={{ color: "#94a3b8", fontSize: "18px", marginBottom: "40px" }}>
        Engineered with strict domain isolation: Prisma 7/8 PG Driver Adapter (`ap-south-1`),
        True Double-Entry Ledger (`SUM(amountMinor) === 0n`), India B2B GST Engine (`SAC ${EDTECH_SAC_CODE}`),
        and Pluggable Work Artifact AST/Topology Extractors.
      </p>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h2 style={{ fontSize: "18px", marginTop: 0, color: "#f8fafc" }}>
            3-Way Project Escrow Split (₹10,000 Sample)
          </h2>
          <ul style={{ paddingLeft: "20px", color: "#cbd5e1", margin: 0 }}>
            <li>
              Mentor Escrow (50%):{" "}
              <strong>₹{(Number(sampleSplit.mentorEscrowMinor) / 100).toFixed(2)}</strong>
            </li>
            <li>
              Author IP Royalty Escrow (15%):{" "}
              <strong>
                ₹{(Number(sampleSplit.authorRoyaltyEscrowMinor) / 100).toFixed(2)}
              </strong>
            </li>
            <li>
              Platform Share (35%):{" "}
              <strong>₹{(Number(sampleSplit.platformShareMinor) / 100).toFixed(2)}</strong>
            </li>
          </ul>
        </div>

        <div
          style={{
            background: "#0f172a",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "24px",
          }}
        >
          <h2 style={{ fontSize: "18px", marginTop: 0, color: "#f8fafc" }}>
            India B2B GST Engine (`SAC ${sampleGst.sacCode}`)
          </h2>
          <ul style={{ paddingLeft: "20px", color: "#cbd5e1", margin: 0 }}>
            <li>
              Supply Mode:{" "}
              <strong>
                {sampleGst.isInterState
                  ? "Inter-State (KA 29 → MH 27)"
                  : "Intra-State"}
              </strong>
            </li>
            <li>
              IGST (18%):{" "}
              <strong>₹{(Number(sampleGst.igstAmountMinor) / 100).toFixed(2)}</strong>
            </li>
            <li>
              Total Invoice:{" "}
              <strong>
                ₹{(Number(sampleGst.totalInvoiceAmountMinor) / 100).toFixed(2)}
              </strong>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
