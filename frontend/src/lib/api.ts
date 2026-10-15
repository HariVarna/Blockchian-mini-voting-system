const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export const api = {
  async requestOtp(email: string) {
    const res = await fetch(`${API_BASE}/auth/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to request OTP");
    return data;
  },

  async verifyOtp(email: string, otp: string) {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to verify OTP");
    return data;
  },

  async registerVoter(walletAddress: string, name: string, email: string, otp: string) {
    const res = await fetch(`${API_BASE}/voter/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, name, email, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to register voter identity");
    return data;
  },

  async getVoterStatus(walletAddress: string) {
    const res = await fetch(`${API_BASE}/voter/status/${walletAddress}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch voter status");
    return data;
  },

  async getCurrentElection() {
    const res = await fetch(`${API_BASE}/election/current`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch election");
    return data;
  },

  async getElectionList() {
    const res = await fetch(`${API_BASE}/election/list`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch elections list");
    return data;
  },

  async openElection(id: string) {
    const res = await fetch(`${API_BASE}/election/${id}/open`, {
      method: "PUT",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to open election");
    return data;
  },

  async closeElection(id: string) {
    const res = await fetch(`${API_BASE}/election/${id}/close`, {
      method: "PUT",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to close election");
    return data;
  },

  async deleteElection(id: string) {
    const res = await fetch(`${API_BASE}/election/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete election");
    return data;
  },

  async getCandidates(electionId?: string) {
    const query = electionId ? `?electionId=${electionId}` : "";
    const res = await fetch(`${API_BASE}/candidates${query}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch candidates");
    return data;
  },

  async addCandidate(payload: {
    electionId: string;
    blockchainCandidateId: number;
    name: string;
    party: string;
    imageUrl: string;
    slogan: string;
    policyStatement: string;
    manifestoUrl?: string;
  }) {
    const res = await fetch(`${API_BASE}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to add candidate");
    return data;
  },

  async updateCandidate(id: string, payload: {
    name?: string;
    party?: string;
    imageUrl?: string;
    slogan?: string;
    policyStatement?: string;
    manifestoUrl?: string;
  }) {
    const res = await fetch(`${API_BASE}/candidates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update candidate");
    return data;
  },

  async deleteCandidate(id: string) {
    const res = await fetch(`${API_BASE}/candidates/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete candidate");
    return data;
  },

  async prepareBallot(payload: {
    electionId: string;
    candidateId: number;
    walletAddress: string;
    otp?: string;
  }) {
    const res = await fetch(`${API_BASE}/ballots/prepare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to prepare encrypted ballot");
    return data;
  },

  async submitBallot(payload: {
    electionId: string;
    walletAddress: string;
    encryptedVote: string;
    ballotCommitment: string;
    txHash: string;
  }) {
    const res = await fetch(`${API_BASE}/ballots/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to submit ballot metadata");
    return data;
  },

  async getBallotStatus(walletAddress: string, electionId?: string) {
    const query = electionId ? `?electionId=${electionId}` : "";
    const res = await fetch(`${API_BASE}/ballots/status/${walletAddress}${query}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch ballot status");
    return data;
  },

  async tallyResults(electionId: string) {
    const res = await fetch(`${API_BASE}/results/tally`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ electionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to tally results");
    return data;
  },

  async publishResults(payload: any) {
    const res = await fetch(`${API_BASE}/results/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to publish results");
    return data;
  },

  async getResults(electionId: string) {
    const res = await fetch(`${API_BASE}/results/${electionId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch results");
    return data;
  },

  async getApprovals() {
    const res = await fetch(`${API_BASE}/admin/approvals`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch approvals");
    return data;
  },

  async proposeApproval(payload: any) {
    const res = await fetch(`${API_BASE}/admin/approvals/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create proposal");
    return data;
  },

  async signApproval(proposalId: number, adminAddress: string) {
    const res = await fetch(`${API_BASE}/admin/approvals/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId, adminAddress }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to sign proposal");
    return data;
  },

  async verifyAdminKey(adminKey: string, walletAddress?: string) {
    const res = await fetch(`${API_BASE}/admin/verify-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminKey, walletAddress }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Invalid Admin Security Key");
    return data;
  },
};
