import Razorpay from "razorpay";

const RZP_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RZP_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

export const rzpClient =
  RZP_KEY_ID && RZP_KEY_SECRET
    ? new Razorpay({ key_id: RZP_KEY_ID, key_secret: RZP_KEY_SECRET })
    : null;

export const RZP_KEY_ID_PUBLIC = RZP_KEY_ID;
export const RZP_KEY_SECRET_RAW = RZP_KEY_SECRET;

export const PLANS = {
  pro: { amount_paise: 99900, tier: "pro", label: "BitFits Pro" },
  elite: { amount_paise: 249900, tier: "elite", label: "BitFits Elite" },
};
