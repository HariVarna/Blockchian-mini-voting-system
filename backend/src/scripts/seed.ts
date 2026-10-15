import { prisma } from "../db";

async function main() {
  console.log("🌱 Seeding backend database with sample election and candidates...");

  // Check if election already exists
  const existing = await prisma.election.findFirst({
    where: { blockchainElectionId: 1 },
  });

  let electionId: string;

  if (!existing) {
    const now = new Date();
    const startTime = new Date(now.getTime() - 1000 * 60 * 60); // Started 1 hour ago
    const endTime = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 3); // Ends in 3 days

    const election = await prisma.election.create({
      data: {
        blockchainElectionId: 1,
        title: "2026 Global Decentralized Governance Election",
        description: "Official digital election for the executive governing council of the Decentralized Protocol Alliance. Every vote is encrypted client-side, verified with an OTP challenge, and permanently committed to the Ethereum blockchain.",
        startTime,
        endTime,
        status: "OPEN",
      },
    });
    electionId = election.id;
    console.log(`✅ Created sample Election: ${election.title} (ID: ${election.id})`);
  } else {
    electionId = existing.id;
    console.log(`ℹ️ Existing election found: ${existing.title}`);
  }

  // Sample candidates
  const candidatesData = [
    {
      blockchainCandidateId: 1,
      name: "Dr. Elena Rostova",
      party: "Decentralized Innovation Coalition (DIC)",
      imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
      slogan: "Transparent Governance Through Zero-Knowledge & Open Infrastructure",
      policyStatement: "Advancing open-source protocol research, privacy-first voting guarantees, multi-sig treasury accountability, and global validator decentralization.",
      manifestoUrl: "https://github.com/HariVarna/Blockchian-mini-voting-system",
    },
    {
      blockchainCandidateId: 2,
      name: "Marcus Vance",
      party: "Sovereign Ledger Alliance (SLA)",
      imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400",
      slogan: "Scalable Infrastructure, Economic Resilience & Community Grants",
      policyStatement: "Focusing on layer-2 gas optimization, developer education initiatives, sustainable liquidity pools, and deterministic dispute resolution.",
      manifestoUrl: "https://github.com/HariVarna/Blockchian-mini-voting-system",
    },
    {
      blockchainCandidateId: 3,
      name: "Amina Al-Mansoor",
      party: "Eco-Chain Democratic Front (EDF)",
      imageUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
      slogan: "Carbon-Neutral Consensus, Security Audits & Public Goods",
      policyStatement: "Championing zero-emission smart contract deployment, continuous formal verification, quadratic funding for creators, and cross-chain governance standards.",
      manifestoUrl: "https://github.com/HariVarna/Blockchian-mini-voting-system",
    },
  ];

  for (const c of candidatesData) {
    const candidate = await prisma.candidate.upsert({
      where: {
        electionId_blockchainCandidateId: {
          electionId,
          blockchainCandidateId: c.blockchainCandidateId,
        },
      },
      update: c,
      create: {
        ...c,
        electionId,
      },
    });
    console.log(`👤 Seeded Candidate #${candidate.blockchainCandidateId}: ${candidate.name}`);
  }

  // Pre-seed sample verified voter user
  const sampleVoterWallet = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".toLowerCase();
  await prisma.user.upsert({
    where: { walletAddress: sampleVoterWallet },
    update: {
      name: "Alice Voter",
      email: "alice@example.com",
      emailVerified: true,
    },
    create: {
      walletAddress: sampleVoterWallet,
      name: "Alice Voter",
      email: "alice@example.com",
      emailVerified: true,
    },
  });
  console.log(`🔑 Seeded verified sample voter: ${sampleVoterWallet}`);

  console.log("\n🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
