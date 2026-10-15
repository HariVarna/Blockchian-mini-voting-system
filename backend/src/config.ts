import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "5001", 10),
  jwtSecret: process.env.JWT_SECRET || "default_jwt_secret_dev_key_voting",
  encryptionSecret: process.env.ENCRYPTION_SECRET || "aes_256_ballot_encryption_master_key_change_me_32chars!",
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || "3", 10),
    cooldownSeconds: parseInt(process.env.OTP_COOLDOWN_SECONDS || "60", 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || "Secure Vote <noreply@securevote.io>",
  },
  blockchain: {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "31337", 10),
    votingContractAddress: process.env.NEXT_PUBLIC_VOTING_CONTRACT_ADDRESS || "",
    multisigContractAddress: process.env.NEXT_PUBLIC_MULTISIG_CONTRACT_ADDRESS || "",
  },
};
