export type PaymentReceipt = {
  id: string;
  userId: string;
  userLogin: string;
  amount: number;
  months: number;
  payerName: string;
  receiptUrl: string;
  comment: string;
  status: "pending" | "approved" | "rejected";
  adminReply: string;
  handledBy: string;
  createdAt: string;
  updatedAt: string;
};
